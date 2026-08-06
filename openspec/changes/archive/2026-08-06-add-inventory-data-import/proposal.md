# Change: Add Inventory Data Import

## Why

The PostgreSQL inventory capability needs a controlled one-time migration path for the existing Firestore `inventoryItems` export and its Firebase Storage images.

## What Changes

- Add a CLI importer for the legacy Firestore inventory JSON export.
- Download Firebase Storage images to a local migration cache and insert their bytes and metadata into PostgreSQL.
- Validate the complete input and image set before writing inventory records.
- Produce a Firestore-to-PostgreSQL ID mapping report for migration traceability.

## Out Of Scope

- Keeping Firestore and PostgreSQL synchronized after migration.
- Supporting arbitrary remote image hosts or Firebase Admin credentials.
- Changing the inventory API or database schema.

## Impact

- Affected specs: `inventory-management`.
- Affected app areas: API maintenance scripts and operator documentation.
- Affected data: `inventory_items` and `inventory_item_images`.
