# Firestore Inventory Import

The inventory importer reads the legacy Firestore JSON export, downloads its Firebase Storage images into a local cache, generates small WebP previews, and inserts the inventory records, protected originals, and thumbnail bytes into PostgreSQL.

## Prerequisites

- Apply the inventory database migration before importing.
- Set `DATABASE_URL` (and the existing database SSL variables when required).
- Back up a non-empty target database before using append mode.
- Run the command from the repository root. The default input is `data/inventar-2026-07-10.json`.

## Download And Validate First

Download all images and validate the complete export without connecting to PostgreSQL:

```bash
pnpm --filter api inventory:import --download-only
```

Images are cached under `data/inventory-images`. Firebase download tokens are never included in filenames or logs. A later full import reuses valid cached files, so the download and database steps may run in separate environments if the `data/inventory-images` directory is copied with the export.

## Generate A Local SQL Migration

This is the recommended production workflow. It creates a self-contained SQL file without connecting to any database:

```bash
pnpm --filter api inventory:import \
  --sql-output ../../data/inventory-import.sql
```

The SQL embeds original and thumbnail bytes as PostgreSQL `bytea` hex values, wraps all inserts in one transaction, and refuses to run if `inventory_items` is not empty. Inspect the generated file, transfer it through your normal secure deployment channel, then apply it to production:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f data/inventory-import.sql
```

The `-v ON_ERROR_STOP=1` option makes `psql` exit immediately on an error. The SQL transaction also prevents a partial import.

## Import Directly Into PostgreSQL

Direct import remains available for a local or otherwise explicitly selected database:

```bash
DATABASE_URL=postgresql://user:password@host:5432/database \
  pnpm --filter api inventory:import
```

The utility downloads any missing images and generates their thumbnails before starting one database transaction. It inserts original and thumbnail bytes into `inventory_item_images` and stores MIME type, size, and SHA-256 checksum metadata for both variants. On success, `data/inventory-import-report.json` maps each Firestore document ID to its new PostgreSQL ID.

By default, the utility refuses to run when `inventory_items` is non-empty. To intentionally append the export, use:

```bash
pnpm --filter api inventory:import --allow-non-empty
```

Append mode is not idempotent and can create duplicates. The database transaction prevents partial item/image imports, but the operator should keep the generated mapping report with the migration records.

## Options

- `--input <path>`: JSON export path.
- `--images-dir <path>`: image cache directory.
- `--report <path>`: Firestore/PostgreSQL ID mapping report path.
- `--sql-output <path>`: generate a self-contained SQL migration instead of connecting to PostgreSQL.
- `--download-only`: validate and populate the image cache without accessing PostgreSQL.
- `--skip-images`: import item records without downloading or inserting images.
- `--allow-non-empty`: append to a non-empty inventory.

Example with explicit paths:

```bash
pnpm --filter api inventory:import \
  --input ../../data/inventar-2026-07-10.json \
  --images-dir ../../data/inventory-images \
  --report ../../data/inventory-import-report.json
```

## Backfill Thumbnails For Existing Images

After applying the thumbnail migration to a database that already contains inventory images, run the resumable backfill before enabling thumbnail URLs in the web UI:

```bash
pnpm --filter api inventory:thumbnails:backfill
```

The command selects only records with missing thumbnail data, processes them in primary-key batches, limits concurrent image transformations, and commits each generated thumbnail independently. It can be rerun safely; completed records are skipped. The default report is written to `data/inventory-thumbnail-backfill-report.json` and contains image IDs and error messages, never image bytes.

Optional controls:

- `--batch-size <1-250>`: database read batch size; default `25`.
- `--concurrency <1-8>`: simultaneous image transformations; default `2`.
- `--report <path>`: explicit JSON report path.

For production, start with the defaults during a low-traffic window and monitor API/database CPU and memory. The command exits non-zero when invalid images remain. Failed records keep their original bytes and can be investigated from the report before rerunning the command.

Verify completion with:

```sql
select count(*)
from inventory_item_images
where thumbnail_data is null
   or thumbnail_content_type is null
   or thumbnail_file_size is null
   or thumbnail_checksum_sha256 is null;
```

The expected result is zero, excluding any invalid originals deliberately accepted for placeholder display.
