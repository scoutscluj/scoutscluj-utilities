# Firestore Inventory Import

The inventory importer reads the legacy Firestore JSON export, downloads its Firebase Storage images into a local cache, and inserts both the inventory records and image bytes into PostgreSQL.

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

The SQL embeds image bytes as PostgreSQL `bytea` hex values, wraps all inserts in one transaction, and refuses to run if `inventory_items` is not empty. Inspect the generated file, transfer it through your normal secure deployment channel, then apply it to production:

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

The utility downloads any missing images before starting one database transaction. It inserts image bytes into `inventory_item_images.file_data` (`bytea`) and stores filename, MIME type, size, and SHA-256 checksum metadata. On success, `data/inventory-import-report.json` maps each Firestore document ID to its new PostgreSQL ID.

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
