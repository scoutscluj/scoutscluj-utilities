import { createHash } from 'node:crypto';
import {
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import type { Options } from '@mikro-orm/core';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const FIREBASE_STORAGE_HOST = 'firebasestorage.googleapis.com';
const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export interface LegacyInventoryItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  subcategory: string;
  owner: string;
  notes: string;
  locationDescription: string;
  condition: string;
  isConsumable: boolean;
  addedBy: string;
  imageUrl: string;
}

export interface DownloadedImage {
  firestoreId: string;
  originalFilename: string;
  contentType: string;
  fileData: Buffer;
  localPath: string;
  checksumSha256: string;
}

export interface InventoryImportOptions {
  inputPath: string;
  imagesDirectory: string;
  reportPath: string;
  downloadOnly: boolean;
  skipImages: boolean;
  allowNonEmpty: boolean;
  sqlOutputPath?: string;
}

export interface InventoryImportResult {
  items: number;
  images: number;
  reportPath?: string;
  sqlOutputPath?: string;
}

interface ImportMapping {
  firestoreId: string;
  postgresId: number;
  imagePath?: string;
}

const optionalText = (value: string) => value.trim() || null;

const requireRecord = (value: unknown, index: number) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Inventory item at index ${index} must be an object.`);
  }
  return value as Record<string, unknown>;
};

const requireString = (
  record: Record<string, unknown>,
  field: string,
  index: number,
) => {
  const value = record[field];
  if (typeof value !== 'string') {
    throw new Error(`Inventory item at index ${index} has invalid ${field}.`);
  }
  return value;
};

export const parseInventoryExport = (json: string): LegacyInventoryItem[] => {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('Inventory export must contain a JSON array.');
  }

  const seenIds = new Set<string>();
  return parsed.map((value, index) => {
    const record = requireRecord(value, index);
    const id = requireString(record, 'id', index).trim();
    const name = requireString(record, 'name', index).trim();
    const quantity = record.quantity;
    const isConsumable = record.isConsumable;

    if (!id || seenIds.has(id)) {
      throw new Error(
        `Inventory item at index ${index} has an empty or duplicate id.`,
      );
    }
    if (!name) {
      throw new Error(`Inventory item at index ${index} has an empty name.`);
    }
    if (!Number.isInteger(quantity) || Number(quantity) < 0) {
      throw new Error(`Inventory item at index ${index} has invalid quantity.`);
    }
    if (typeof isConsumable !== 'boolean') {
      throw new Error(
        `Inventory item at index ${index} has invalid isConsumable.`,
      );
    }
    seenIds.add(id);

    return {
      id,
      name,
      quantity: Number(quantity),
      category: requireString(record, 'category', index),
      subcategory: requireString(record, 'subcategory', index),
      owner: requireString(record, 'owner', index),
      notes: requireString(record, 'notes', index),
      locationDescription: requireString(record, 'locationDescription', index),
      condition: requireString(record, 'condition', index),
      isConsumable,
      addedBy: requireString(record, 'addedBy', index),
      imageUrl: requireString(record, 'imageUrl', index),
    };
  });
};

const contentTypeFromFilename = (filename: string) => {
  switch (extname(filename).toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.heic':
      return 'image/heic';
    case '.heif':
      return 'image/heif';
    default:
      return '';
  }
};

const getFirebaseFilename = (imageUrl: string) => {
  const url = new URL(imageUrl);
  if (url.protocol !== 'https:' || url.hostname !== FIREBASE_STORAGE_HOST) {
    throw new Error('Image URL is not an HTTPS Firebase Storage URL.');
  }

  const objectMarker = '/o/';
  const objectIndex = url.pathname.indexOf(objectMarker);
  if (objectIndex < 0) {
    throw new Error('Firebase Storage image URL has no object path.');
  }

  const objectPath = decodeURIComponent(
    url.pathname.slice(objectIndex + objectMarker.length),
  );
  const filename = basename(objectPath).replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!filename || filename === '.' || filename === '..') {
    throw new Error('Firebase Storage image URL has no valid filename.');
  }
  return filename.slice(-200);
};

export const downloadInventoryImage = async (
  item: LegacyInventoryItem,
  imagesDirectory: string,
  fetchImage: typeof fetch = fetch,
): Promise<DownloadedImage> => {
  const originalFilename = getFirebaseFilename(item.imageUrl);
  const localPath = join(
    imagesDirectory,
    `${item.id}-${originalFilename}`.slice(0, 240),
  );
  const cachedData = await readFile(localPath).catch(() => undefined);
  const cachedContentType = contentTypeFromFilename(originalFilename);
  if (
    cachedData &&
    cachedData.length > 0 &&
    cachedData.length <= MAX_IMAGE_BYTES &&
    ALLOWED_IMAGE_CONTENT_TYPES.has(cachedContentType)
  ) {
    return {
      firestoreId: item.id,
      originalFilename,
      contentType: cachedContentType,
      fileData: cachedData,
      localPath,
      checksumSha256: createHash('sha256').update(cachedData).digest('hex'),
    };
  }

  let response: Response;
  try {
    response = await fetchImage(item.imageUrl, { redirect: 'follow' });
  } catch (error) {
    throw new Error(`Image download failed for Firestore item ${item.id}.`, {
      cause: error,
    });
  }
  if (!response.ok) {
    throw new Error(
      `Image download failed for Firestore item ${item.id}: HTTP ${response.status}.`,
    );
  }

  const announcedSize = Number(response.headers.get('content-length') || 0);
  if (announcedSize > MAX_IMAGE_BYTES) {
    throw new Error(`Image for Firestore item ${item.id} exceeds 8 MiB.`);
  }

  const fileData = Buffer.from(await response.arrayBuffer());
  if (fileData.length === 0 || fileData.length > MAX_IMAGE_BYTES) {
    throw new Error(
      `Image for Firestore item ${item.id} is empty or exceeds 8 MiB.`,
    );
  }

  const responseContentType =
    response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ||
    '';
  const contentType =
    responseContentType || contentTypeFromFilename(originalFilename);
  if (!ALLOWED_IMAGE_CONTENT_TYPES.has(contentType)) {
    throw new Error(
      `Image for Firestore item ${item.id} has unsupported content type ${contentType || 'unknown'}.`,
    );
  }

  await mkdir(imagesDirectory, { recursive: true });
  await writeFile(localPath, fileData, { flag: 'wx' }).catch(async (error) => {
    const existing = await readFile(localPath).catch(() => undefined);
    if (!existing || !existing.equals(fileData)) {
      throw error;
    }
  });

  return {
    firestoreId: item.id,
    originalFilename,
    contentType,
    fileData,
    localPath,
    checksumSha256: createHash('sha256').update(fileData).digest('hex'),
  };
};

const downloadImages = async (
  items: LegacyInventoryItem[],
  imagesDirectory: string,
) => {
  const withImages = items.filter((item) => item.imageUrl.trim());
  const downloaded: DownloadedImage[] = [];
  const concurrency = 5;

  for (let index = 0; index < withImages.length; index += concurrency) {
    const batch = withImages.slice(index, index + concurrency);
    downloaded.push(
      ...(await Promise.all(
        batch.map((item) => downloadInventoryImage(item, imagesDirectory)),
      )),
    );
  }
  return downloaded;
};

const sqlLiteral = (value: string | number | boolean | null) => {
  if (value === null) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `'${value.replaceAll("'", "''")}'`;
};

const itemSqlValues = (item: LegacyInventoryItem) =>
  [
    item.name,
    item.quantity,
    optionalText(item.category),
    optionalText(item.subcategory),
    optionalText(item.owner),
    optionalText(item.locationDescription),
    optionalText(item.condition) || 'Buna',
    item.isConsumable,
    optionalText(item.notes),
    optionalText(item.addedBy),
    optionalText(item.addedBy),
  ]
    .map(sqlLiteral)
    .join(', ');

export const writeInventorySql = async (
  outputPath: string,
  items: LegacyInventoryItem[],
  images: DownloadedImage[],
  allowNonEmpty: boolean,
) => {
  const absoluteOutputPath = resolve(outputPath);
  const temporaryPath = `${absoluteOutputPath}.${process.pid}.tmp`;
  const imagesByFirestoreId = new Map(
    images.map((image) => [image.firestoreId, image]),
  );

  await mkdir(dirname(absoluteOutputPath), { recursive: true });
  const file = await open(temporaryPath, 'wx');
  try {
    await file.write(
      '-- Generated inventory migration. Image bytes are PostgreSQL bytea hex values.\nBEGIN;\n\n',
    );
    if (!allowNonEmpty) {
      await file.write(
        "DO $inventory_import$\nBEGIN\n  IF EXISTS (SELECT 1 FROM inventory_items) THEN\n    RAISE EXCEPTION 'inventory_items must be empty before importing';\n  END IF;\nEND\n$inventory_import$;\n\n",
      );
    }

    for (const item of items) {
      const safeFirestoreId = item.id.replaceAll(/[\r\n]/g, ' ');
      const image = imagesByFirestoreId.get(item.id);
      await file.write(`-- Firestore document: ${safeFirestoreId}\n`);
      if (!image) {
        await file.write(
          `INSERT INTO inventory_items (name, quantity, category, subcategory, owner, location_description, condition, is_consumable, notes, created_by_display_name, updated_by_display_name, created_at, updated_at) VALUES (${itemSqlValues(item)}, now(), now());\n\n`,
        );
        continue;
      }

      await file.write(
        `WITH inserted_item AS (\n  INSERT INTO inventory_items (name, quantity, category, subcategory, owner, location_description, condition, is_consumable, notes, created_by_display_name, updated_by_display_name, created_at, updated_at)\n  VALUES (${itemSqlValues(item)}, now(), now())\n  RETURNING id\n)\nINSERT INTO inventory_item_images (inventory_item_id, original_filename, content_type, file_size, checksum_sha256, file_data, uploaded_by_display_name, created_at, updated_at)\nSELECT id, ${sqlLiteral(image.originalFilename)}, ${sqlLiteral(image.contentType)}, ${image.fileData.length}, ${sqlLiteral(image.checksumSha256)}, decode('${image.fileData.toString('hex')}', 'hex'), ${sqlLiteral(optionalText(item.addedBy))}, now(), now()\nFROM inserted_item;\n\n`,
      );
    }

    await file.write('COMMIT;\n');
  } catch (error) {
    await file.close();
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
  await file.close();
  await rename(temporaryPath, absoluteOutputPath);
};

export const runInventoryImport = async (
  options: InventoryImportOptions,
): Promise<InventoryImportResult> => {
  const items = parseInventoryExport(await readFile(options.inputPath, 'utf8'));
  const images = options.skipImages
    ? []
    : await downloadImages(items, options.imagesDirectory);

  if (options.downloadOnly) {
    return { items: items.length, images: images.length };
  }

  if (options.sqlOutputPath) {
    await writeInventorySql(
      options.sqlOutputPath,
      items,
      images,
      options.allowNonEmpty,
    );
    return {
      items: items.length,
      images: images.length,
      sqlOutputPath: options.sqlOutputPath,
    };
  }

  const [{ MikroORM }, { createMikroOrmOptions }] = await Promise.all([
    import('@mikro-orm/core'),
    import('../config/database.config.js'),
  ]);
  const orm = await MikroORM.init<PostgreSqlDriver>(
    createMikroOrmOptions() as Options<PostgreSqlDriver>,
  );
  const imagesByFirestoreId = new Map(
    images.map((image) => [image.firestoreId, image]),
  );
  const mappings: ImportMapping[] = [];

  try {
    await orm.em.transactional(async (em) => {
      const connection = em.getConnection();
      const countRows = await connection.execute<{ count: string }[]>(
        'select count(*)::text as count from inventory_items',
      );
      const existingCount = Number(countRows[0]?.count || 0);
      if (existingCount > 0 && !options.allowNonEmpty) {
        throw new Error(
          `inventory_items already contains ${existingCount} rows. Use --allow-non-empty only if appending is intentional.`,
        );
      }

      for (const item of items) {
        const rows = await connection.execute<{ id: number }[]>(
          `insert into inventory_items
            (name, quantity, category, subcategory, owner, location_description,
             condition, is_consumable, notes, created_by_display_name,
             updated_by_display_name, created_at, updated_at)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), now())
           returning id`,
          [
            item.name,
            item.quantity,
            optionalText(item.category),
            optionalText(item.subcategory),
            optionalText(item.owner),
            optionalText(item.locationDescription),
            optionalText(item.condition) || 'Buna',
            item.isConsumable,
            optionalText(item.notes),
            optionalText(item.addedBy),
            optionalText(item.addedBy),
          ],
        );
        const postgresId = rows[0]?.id;
        if (!postgresId) {
          throw new Error(
            `Insert returned no id for Firestore item ${item.id}.`,
          );
        }

        const image = imagesByFirestoreId.get(item.id);
        if (image) {
          await connection.execute(
            `insert into inventory_item_images
              (inventory_item_id, original_filename, content_type, file_size,
               checksum_sha256, file_data, uploaded_by_display_name,
               created_at, updated_at)
             values (?, ?, ?, ?, ?, ?, ?, now(), now())`,
            [
              postgresId,
              image.originalFilename,
              image.contentType,
              image.fileData.length,
              image.checksumSha256,
              image.fileData,
              optionalText(item.addedBy),
            ],
          );
        }

        mappings.push({
          firestoreId: item.id,
          postgresId,
          imagePath: image ? resolve(image.localPath) : undefined,
        });
      }
    });

    await mkdir(dirname(options.reportPath), { recursive: true });
    await writeFile(
      options.reportPath,
      `${JSON.stringify({ importedAt: new Date().toISOString(), mappings }, null, 2)}\n`,
    );
  } finally {
    await orm.close();
  }

  return {
    items: items.length,
    images: images.length,
    reportPath: options.reportPath,
  };
};

export const parseImportArguments = (
  args: string[],
): InventoryImportOptions => {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  const valueOptions = new Set([
    '--input',
    '--images-dir',
    '--report',
    '--sql-output',
  ]);
  const booleanOptions = new Set([
    '--download-only',
    '--skip-images',
    '--allow-non-empty',
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (valueOptions.has(argument)) {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${argument} requires a value.`);
      }
      values.set(argument, value);
      index += 1;
    } else if (booleanOptions.has(argument)) {
      flags.add(argument);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (flags.has('--download-only') && flags.has('--skip-images')) {
    throw new Error('--download-only cannot be combined with --skip-images.');
  }

  return {
    inputPath: resolve(
      values.get('--input') || '../../data/inventar-2026-07-10.json',
    ),
    imagesDirectory: resolve(
      values.get('--images-dir') || '../../data/inventory-images',
    ),
    reportPath: resolve(
      values.get('--report') || '../../data/inventory-import-report.json',
    ),
    downloadOnly: flags.has('--download-only'),
    skipImages: flags.has('--skip-images'),
    allowNonEmpty: flags.has('--allow-non-empty'),
    sqlOutputPath: values.get('--sql-output')
      ? resolve(values.get('--sql-output')!)
      : undefined,
  };
};
