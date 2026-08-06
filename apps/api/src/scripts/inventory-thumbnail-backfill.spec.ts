import sharp from 'sharp';
import {
  backfillInventoryThumbnails,
  parseInventoryThumbnailBackfillArguments,
} from './inventory-thumbnail-backfill';

describe('inventory thumbnail backfill', () => {
  it('processes valid rows in bounded batches and isolates failures', async () => {
    const validImage = await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 3,
        background: '#c81e1e',
      },
    })
      .jpeg()
      .toBuffer();
    const execute = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 1, file_data: validImage },
        { id: 2, file_data: Buffer.from('invalid') },
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([]);

    const result = await backfillInventoryThumbnails(
      { execute },
      { batchSize: 2, concurrency: 1 },
    );

    expect(result).toMatchObject({ scanned: 2, processed: 1, failed: 1 });
    expect(result.failures[0].imageId).toBe(2);
    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('update inventory_item_images'),
      expect.any(Array),
    );
  });

  it('validates bounded CLI options', () => {
    expect(
      parseInventoryThumbnailBackfillArguments([
        '--batch-size',
        '50',
        '--concurrency',
        '4',
        '--report',
        '/tmp/report.json',
      ]),
    ).toMatchObject({ batchSize: 50, concurrency: 4 });
    expect(() =>
      parseInventoryThumbnailBackfillArguments(['--concurrency', '9']),
    ).toThrow('between 1 and 8');
  });

  it('is a safe no-op when every image already has a thumbnail', async () => {
    const execute = jest.fn().mockResolvedValue([]);

    await expect(
      backfillInventoryThumbnails(
        { execute },
        { batchSize: 25, concurrency: 2 },
      ),
    ).resolves.toEqual({
      scanned: 0,
      processed: 0,
      failed: 0,
      failures: [],
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
