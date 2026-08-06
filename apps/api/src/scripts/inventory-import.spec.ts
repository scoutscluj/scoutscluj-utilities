import {
  downloadInventoryImage,
  parseImportArguments,
  parseInventoryExport,
  writeInventorySql,
  type LegacyInventoryItem,
} from './inventory-import';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const item: LegacyInventoryItem = {
  id: 'firestore-id',
  name: 'Ceaun',
  quantity: 2,
  category: 'Camp',
  subcategory: 'Bucatarie',
  owner: 'CL Vest',
  notes: '',
  locationDescription: 'Pod - Camp',
  condition: 'Buna',
  isConsumable: false,
  addedBy: 'Scout',
  imageUrl:
    'https://firebasestorage.googleapis.com/v0/b/example/o/inventory%2Fphoto.jpg?alt=media&token=secret',
};

describe('inventory import', () => {
  it('parses a valid Firestore export', () => {
    expect(parseInventoryExport(JSON.stringify([item]))).toEqual([item]);
  });

  it('rejects duplicate Firestore ids', () => {
    expect(() => parseInventoryExport(JSON.stringify([item, item]))).toThrow(
      'empty or duplicate id',
    );
  });

  it('rejects invalid quantities', () => {
    expect(() =>
      parseInventoryExport(JSON.stringify([{ ...item, quantity: -1 }])),
    ).toThrow('invalid quantity');
  });

  it('downloads an image without leaking the Firebase token into its filename', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'inventory-import-'));
    const bytes = Buffer.from('image bytes');
    const fetchImage = jest.fn().mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      }),
    );

    try {
      const image = await downloadInventoryImage(item, directory, fetchImage);
      expect(image.originalFilename).toBe('photo.jpg');
      expect(image.localPath).not.toContain('secret');
      expect(await readFile(image.localPath)).toEqual(bytes);
      expect(image.checksumSha256).toHaveLength(64);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('reuses a downloaded image cache without another network request', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'inventory-import-'));
    const bytes = Buffer.from('image bytes');
    const fetchImage = jest.fn().mockResolvedValue(
      new Response(bytes, {
        status: 200,
        headers: { 'content-type': 'image/jpeg' },
      }),
    );

    try {
      await downloadInventoryImage(item, directory, fetchImage);
      await downloadInventoryImage(item, directory, fetchImage);
      expect(fetchImage).toHaveBeenCalledTimes(1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects non-Firebase image hosts', async () => {
    await expect(
      downloadInventoryImage(
        { ...item, imageUrl: 'https://example.com/photo.jpg' },
        '/tmp/unused',
      ),
    ).rejects.toThrow('not an HTTPS Firebase Storage URL');
  });

  it('rejects incompatible CLI flags', () => {
    expect(() =>
      parseImportArguments(['--download-only', '--skip-images']),
    ).toThrow('cannot be combined');
  });

  it('writes a transactional SQL migration with bytea image data', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'inventory-import-'));
    const outputPath = join(directory, 'inventory.sql');
    const fileData = Buffer.from('image bytes');

    try {
      await writeInventorySql(
        outputPath,
        [item],
        [
          {
            firestoreId: item.id,
            originalFilename: 'photo.jpg',
            contentType: 'image/jpeg',
            fileData,
            localPath: '/tmp/photo.jpg',
            checksumSha256: 'abc123',
          },
        ],
        false,
      );
      const sql = await readFile(outputPath, 'utf8');
      expect(sql).toContain('BEGIN;');
      expect(sql).toContain('inventory_items must be empty');
      expect(sql).toContain(`decode('${fileData.toString('hex')}', 'hex')`);
      expect(sql).toContain('FROM inserted_item;');
      expect(sql).toContain('COMMIT;');
      expect(sql).not.toContain(item.imageUrl);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
