jest.mock('@mikro-orm/core', () => {
  const chain: Record<string, jest.Mock> = {};
  for (const method of [
    'array',
    'autoincrement',
    'default',
    'deleteRule',
    'fieldName',
    'inversedBy',
    'mappedBy',
    'nativeEnumName',
    'nullable',
    'onCreate',
    'onUpdate',
    'owner',
    'primary',
    'unique',
    'updateRule',
  ]) {
    chain[method] = jest.fn(() => chain);
  }

  const p = {
    boolean: jest.fn(() => chain),
    datetime: jest.fn(() => chain),
    enum: jest.fn(() => chain),
    integer: jest.fn(() => chain),
    json: jest.fn(() => chain),
    manyToOne: jest.fn(() => chain),
    oneToMany: jest.fn(() => chain),
    oneToOne: jest.fn(() => chain),
    string: jest.fn(() => chain),
    type: jest.fn(() => chain),
  };

  return {
    EntityManager: class EntityManager {},
    defineEntity: <T>(entity: T): T => entity,
    p,
  };
});

jest.mock('@mikro-orm/nestjs', () => ({
  InjectRepository: jest.fn(() => () => undefined),
}));

import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '../users/entities/user-role.enum';
import type { CurrentUser } from '../users/users.types';
import { InventoryItemImage } from './entities/inventory-item-image.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryService } from './inventory.service';

const editor: CurrentUser = {
  id: 10,
  displayName: 'Ana Inventar',
  roles: [UserRole.Moderator],
};

const createItem = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: 1,
  name: 'Trusă prim ajutor',
  quantity: 2,
  category: 'Camp',
  subcategory: 'Prim Ajutor',
  owner: 'Comun',
  locationDescription: 'Pod - Camp',
  condition: 'Buna',
  isConsumable: false,
  notes: 'Cu fașe sterile',
  createdByUserId: editor.id,
  createdByDisplayName: editor.displayName,
  updatedByUserId: editor.id,
  updatedByDisplayName: editor.displayName,
  createdAt: new Date('2026-07-10T08:00:00.000Z'),
  updatedAt: new Date('2026-07-10T08:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

const createImage = (
  overrides: Partial<InventoryItemImage> = {},
): InventoryItemImage => ({
  id: 3,
  inventoryItemId: 1,
  originalFilename: 'trusa.jpg',
  contentType: 'image/jpeg',
  fileSize: 4,
  checksumSha256: 'checksum',
  fileData: Buffer.from('test'),
  thumbnailContentType: null,
  thumbnailFileSize: null,
  thumbnailChecksumSha256: null,
  thumbnailData: null,
  uploadedByUserId: editor.id,
  uploadedByDisplayName: editor.displayName,
  createdAt: new Date('2026-07-10T08:00:00.000Z'),
  updatedAt: new Date('2026-07-10T08:00:00.000Z'),
  ...overrides,
});

const createService = ({
  items = [createItem()],
  image = null,
}: {
  items?: InventoryItem[];
  image?: InventoryItemImage | null;
} = {}) => {
  let currentImage = image;
  const itemsRepository = {
    find: jest.fn((where?: unknown, options?: unknown) => {
      void where;
      void options;
      return Promise.resolve(items.filter((item) => !item.deletedAt));
    }),
    findOne: jest.fn(({ id }: { id: number }, options?: unknown) => {
      void options;
      return Promise.resolve(
        items.find((item) => item.id === id && !item.deletedAt) ?? null,
      );
    }),
    create: jest.fn((value: InventoryItem) =>
      Object.assign(
        {
          id: 99,
          createdAt: new Date('2026-07-10T09:00:00.000Z'),
          updatedAt: new Date('2026-07-10T09:00:00.000Z'),
        },
        value,
      ),
    ),
  };
  const imagesRepository = {
    find: jest.fn((where?: unknown, options?: unknown) => {
      void where;
      void options;
      return Promise.resolve(currentImage ? [currentImage] : []);
    }),
    findOne: jest.fn((where?: unknown, options?: unknown) => {
      void where;
      void options;
      return Promise.resolve(currentImage);
    }),
    create: jest.fn((value: InventoryItemImage) => {
      currentImage = Object.assign(
        {
          id: 100,
          createdAt: new Date('2026-07-10T09:00:00.000Z'),
          updatedAt: new Date('2026-07-10T09:00:00.000Z'),
        },
        value,
      );
      return currentImage;
    }),
  };
  const em = {
    persist: jest.fn(),
    flush: jest.fn(() => Promise.resolve(undefined)),
    remove: jest.fn((entity: InventoryItemImage) => {
      if (currentImage?.id === entity.id) {
        currentImage = null;
      }
    }),
  };
  const auditService = {
    record: jest.fn(() => Promise.resolve(undefined)),
  };

  return {
    service: new InventoryService(
      itemsRepository as never,
      imagesRepository as never,
      em as never,
      auditService as unknown as AuditService,
    ),
    itemsRepository,
    imagesRepository,
    em,
    auditService,
  };
};

describe('InventoryService', () => {
  const createTestImage = () =>
    sharp({
      create: {
        width: 320,
        height: 180,
        channels: 3,
        background: '#c81e1e',
      },
    })
      .jpeg()
      .toBuffer();

  it('filters search text accent-insensitively and combines structured filters', async () => {
    const { service } = createService({
      items: [
        createItem(),
        createItem({
          id: 2,
          name: 'Cort patrulă',
          category: 'Camp',
          subcategory: 'Corturi',
          owner: 'CL Nord',
          locationDescription: 'Camera 2',
          isConsumable: false,
          notes: null,
        }),
        createItem({
          id: 3,
          name: 'Hârtie colorată',
          category: 'Programe',
          subcategory: 'Papetarie',
          owner: 'Comun',
          isConsumable: true,
          notes: null,
        }),
      ],
    });

    const result = await service.listItems({
      search: 'fase',
      category: 'Camp',
      owner: 'Comun',
      consumable: 'no',
    });

    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe('Trusă prim ajutor');
  });

  it('sorts stably with id as a deterministic tie breaker', async () => {
    const { service } = createService({
      items: [
        createItem({ id: 3, name: 'Același nume' }),
        createItem({ id: 1, name: 'Același nume' }),
        createItem({ id: 2, name: 'Alt nume' }),
      ],
    });

    const result = await service.listItems({ sort: 'name', direction: 'asc' });

    expect(result.items.map((item) => item.id)).toEqual([1, 3, 2]);
  });

  it('rejects invalid quantities', async () => {
    const { service } = createService();

    await expect(
      service.createItem(editor, {
        name: 'Obiect',
        quantity: -1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates items with actor metadata and audit entry', async () => {
    const { service, auditService } = createService({ items: [] });

    const item = await service.createItem(editor, {
      name: 'Lanternă',
      quantity: 1,
      condition: 'Bună',
    });

    expect(item.name).toBe('Lanternă');
    expect(item.condition).toBe('Buna');
    expect(item.createdByUserId).toBe(editor.id);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: editor.id,
        action: 'inventory_item.created',
        entityType: 'inventory_item',
      }),
    );
  });

  it('uploads and serializes a protected image', async () => {
    const { service, imagesRepository } = createService();
    const imageData = await createTestImage();

    const result = await service.uploadImage(editor, 1, {
      fileName: 'trusa.jpg',
      contentType: 'image/jpeg',
      contentBase64: imageData.toString('base64'),
    });

    expect(imagesRepository.create).toHaveBeenCalled();
    expect(result.image?.url).toBe('/api/inventory/items/1/image');
    expect(result.image?.contentType).toBe('image/jpeg');
    expect(result.image?.thumbnailContentType).toBe('image/webp');
    expect(result.image?.thumbnailUrl).toContain('/image/thumbnail?v=');
  });

  it('uses an image metadata projection when listing items', async () => {
    const { service, imagesRepository } = createService({
      image: createImage(),
    });

    await service.listItems();

    const findOptions = imagesRepository.find.mock.calls[0]?.[1] as
      | { fields?: string[] }
      | undefined;
    const fields = findOptions?.fields;
    expect(fields).not.toContain('fileData');
    expect(fields).not.toContain('thumbnailData');
  });

  it('rejects unsupported image uploads without replacing existing image', async () => {
    const existingImage = createImage();
    const { service, imagesRepository } = createService({
      image: existingImage,
    });

    await expect(
      service.uploadImage(editor, 1, {
        fileName: 'trusa.txt',
        contentType: 'text/plain',
        contentBase64: Buffer.from('image-data').toString('base64'),
      }),
    ).rejects.toThrow(BadRequestException);
    expect(imagesRepository.create).not.toHaveBeenCalled();
    expect(existingImage.originalFilename).toBe('trusa.jpg');
  });

  it('rejects corrupt supported uploads without replacing existing image', async () => {
    const existingImage = createImage();
    const { service } = createService({ image: existingImage });

    await expect(
      service.uploadImage(editor, 1, {
        fileName: 'trusa.jpg',
        contentType: 'image/jpeg',
        contentBase64: Buffer.from('not-an-image').toString('base64'),
      }),
    ).rejects.toThrow(BadRequestException);
    expect(existingImage.originalFilename).toBe('trusa.jpg');
    expect(existingImage.fileData).toEqual(Buffer.from('test'));
  });
});
