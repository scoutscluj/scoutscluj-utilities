import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Options } from '@mikro-orm/core';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { createInventoryThumbnail } from '../modules/inventory/inventory-image-thumbnail';

type BackfillRow = {
  id: number;
  file_data: Buffer;
};

export type InventoryThumbnailBackfillFailure = {
  imageId: number;
  message: string;
};

export type InventoryThumbnailBackfillResult = {
  scanned: number;
  processed: number;
  failed: number;
  failures: InventoryThumbnailBackfillFailure[];
};

export type InventoryThumbnailBackfillOptions = {
  batchSize: number;
  concurrency: number;
  reportPath: string;
};

export type InventoryThumbnailBackfillConnection = {
  execute<T>(query: string, params?: unknown[]): Promise<T>;
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown thumbnail error.';

export const backfillInventoryThumbnails = async (
  connection: InventoryThumbnailBackfillConnection,
  options: Pick<InventoryThumbnailBackfillOptions, 'batchSize' | 'concurrency'>,
): Promise<InventoryThumbnailBackfillResult> => {
  let cursor = 0;
  let scanned = 0;
  let processed = 0;
  const failures: InventoryThumbnailBackfillFailure[] = [];

  while (true) {
    const rows = await connection.execute<BackfillRow[]>(
      `select id, file_data
         from inventory_item_images
        where id > ?
          and (thumbnail_data is null
            or thumbnail_content_type is null
            or thumbnail_file_size is null
            or thumbnail_checksum_sha256 is null)
        order by id asc
        limit ?`,
      [cursor, options.batchSize],
    );
    if (!rows.length) break;

    scanned += rows.length;
    for (let index = 0; index < rows.length; index += options.concurrency) {
      const chunk = rows.slice(index, index + options.concurrency);
      await Promise.all(
        chunk.map(async (row) => {
          try {
            const thumbnail = await createInventoryThumbnail(row.file_data);
            await connection.execute(
              `update inventory_item_images
                  set thumbnail_content_type = ?,
                      thumbnail_file_size = ?,
                      thumbnail_checksum_sha256 = ?,
                      thumbnail_data = ?,
                      updated_at = now()
                where id = ?`,
              [
                thumbnail.contentType,
                thumbnail.fileSize,
                thumbnail.checksumSha256,
                thumbnail.fileData,
                row.id,
              ],
            );
            processed += 1;
          } catch (error) {
            failures.push({ imageId: row.id, message: errorMessage(error) });
          }
        }),
      );
    }

    cursor = rows.at(-1)?.id ?? cursor;
  }

  return {
    scanned,
    processed,
    failed: failures.length,
    failures,
  };
};

const parsePositiveInteger = (
  value: string | undefined,
  option: string,
  fallback: number,
  maximum: number,
) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error(`${option} must be an integer between 1 and ${maximum}.`);
  }
  return parsed;
};

export const parseInventoryThumbnailBackfillArguments = (
  args: string[],
): InventoryThumbnailBackfillOptions => {
  const values = new Map<string, string>();
  const allowed = new Set(['--batch-size', '--concurrency', '--report']);

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (!allowed.has(option)) throw new Error(`Unknown argument: ${option}`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${option} requires a value.`);
    }
    values.set(option, value);
    index += 1;
  }

  return {
    batchSize: parsePositiveInteger(
      values.get('--batch-size'),
      '--batch-size',
      25,
      250,
    ),
    concurrency: parsePositiveInteger(
      values.get('--concurrency'),
      '--concurrency',
      2,
      8,
    ),
    reportPath: resolve(
      values.get('--report') ||
        '../../data/inventory-thumbnail-backfill-report.json',
    ),
  };
};

export const runInventoryThumbnailBackfill = async (
  options: InventoryThumbnailBackfillOptions,
) => {
  const [{ MikroORM }, { createMikroOrmOptions }] = await Promise.all([
    import('@mikro-orm/core'),
    import('../config/database.config.js'),
  ]);
  const orm = await MikroORM.init<PostgreSqlDriver>(
    createMikroOrmOptions() as Options<PostgreSqlDriver>,
  );

  try {
    const result = await backfillInventoryThumbnails(
      orm.em.getConnection() as InventoryThumbnailBackfillConnection,
      options,
    );
    await mkdir(dirname(options.reportPath), { recursive: true });
    await writeFile(
      options.reportPath,
      `${JSON.stringify({ completedAt: new Date().toISOString(), ...result }, null, 2)}\n`,
    );
    return result;
  } finally {
    await orm.close();
  }
};
