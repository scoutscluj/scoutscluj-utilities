# Design: Inventory Management

## Context

The legacy inventory page is currently implemented in `/Users/florin/Projects/scouts/utilities-scouts-cluj/app/(protected)/sediu/inventar/page.tsx`. The implementation reads and writes Firestore collection `inventoryItems`, uploads a single image per item to Firebase Storage, and renders:

- fixed category/subcategory, owner, location, and condition option sets;
- unknown stored option values in filters so old data remains visible;
- search across name, category labels, subcategory labels, owner, location, condition, notes, and added-by text;
- structured filters for category, subcategory, owner, location, condition, and consumable state;
- a desktop DataGrid with column visibility preferences stored in localStorage;
- a mobile card layout;
- add/edit dialog, image upload preview, delete confirmation, loading, empty, success, and error states.

The legacy OpenSpec material for `hq-inventory-table` covers column visibility, responsive inventory workspace, structured filtering, modern add/edit flow, and localized action feedback. The new app should preserve that user-facing behavior while moving data and authorization to the backend.

## Goals

- Rebuild inventory as a typed NestJS/PostgreSQL capability.
- Preserve the legacy field model and Romanian operational copy.
- Keep the web route fast for repeated inventory scans and small edits.
- Avoid public image URLs and direct browser access to storage internals.
- Define role-sensitive editing at the API boundary.

## Non-Goals

- Import legacy Firestore data in this change.
- Build stock movement, loans, reservations, maintenance workflows, QR labels, or multiple images per item.
- Create dynamic category/owner/location administration.

## Data Model

Add `inventory_items`:

- `id` integer primary key;
- `name` required text;
- `quantity` integer, default `0`, constrained to be non-negative;
- `category` nullable text;
- `subcategory` nullable text;
- `owner` nullable text;
- `location_description` nullable text;
- `condition` nullable text, default `Buna`;
- `is_consumable` boolean, default `false`;
- `notes` nullable text;
- `created_by_user_id` nullable integer;
- `created_by_display_name` nullable text;
- `updated_by_user_id` nullable integer;
- `updated_by_display_name` nullable text;
- `created_at`, `updated_at`;
- `deleted_at` nullable timestamp for soft delete.

Add `inventory_item_images`:

- `id` integer primary key;
- `inventory_item_id` unique foreign-key-like reference;
- `original_filename`, `content_type`, `file_size`, `checksum_sha256`;
- `file_data` bytea;
- `uploaded_by_user_id` nullable integer;
- `uploaded_by_display_name` nullable text;
- `created_at`, `updated_at`.

Only one active image is supported per item in v1 to match the legacy `imageUrl` field. Replacing an image overwrites the previous active image record.

## Option Sets

The frontend and API DTO documentation should expose the legacy defaults:

- Categories: `Camp`, `Programe`, `Sediu`.
- Camp subcategories: `Infrastructura`, `Bucatarie`, `Prim Ajutor`, `Mancare`, `Scule`, `Corturi`.
- Programe subcategories: `Prim Ajutor - DEMO`, `Papetarie`, `Boardgames`, `De legat`, `Festivalul Luminii`, `Altele`.
- Sediu subcategories: `Mobila`, `Electronice`, `Curatenie`.
- Owners: `CL Vest`, `CL Nord`, `Comun`.
- Locations: `Pod - Camp`, `Pod - Programe`, `Pod - Misc`, `Sub Scari`, `Camera 1`, `Camera 2`, `Camera 3`.
- Conditions: `Buna`, `De reparat`.

The database stores strings rather than native enums so unknown legacy/manual values can still be listed and filtered without a migration. The UI labels should normalize Romanian diacritics for display, including `Buna` to `Bună`, `Bucatarie` to `Bucătărie`, and `Sub Scari` to `Sub Scări`.

## API

Add an `InventoryModule` with authenticated endpoints:

- `GET /api/inventory/items`: list non-deleted items with optional `search`, `category`, `subcategory`, `owner`, `locationDescription`, `condition`, `consumable`, `sort`, `direction`, `page`, and `pageSize`.
- `POST /api/inventory/items`: create an item.
- `GET /api/inventory/items/:id`: fetch one item.
- `PATCH /api/inventory/items/:id`: update editable fields.
- `DELETE /api/inventory/items/:id`: soft delete an item.
- `POST /api/inventory/items/:id/image`: upload or replace an image using the same base64 JSON file pattern currently used by finance/procurement upload flows.
- `DELETE /api/inventory/items/:id/image`: remove the active image.
- `GET /api/inventory/items/:id/image`: stream the active image when the caller may view inventory.

DTOs should return image metadata and a protected image URL/proxy path, not raw bytes in item lists.

## Authorization

Read access:

- Any authenticated user may list and view inventory items and images.

Write access:

- `moderator`, `admin`, and `super_admin` may create, update, delete, upload images, and remove images.
- `admin` inherits `moderator` through the existing roles guard.
- The web UI hides or disables write controls for non-editors, but NestJS remains authoritative.

This intentionally tightens legacy behavior, where the protected inventory page exposed write controls to any signed-in user who could open it.

## Image Storage

Inventory images should be stored in PostgreSQL `bytea` for v1, matching the current finance document storage pattern and avoiding a new object-storage dependency. The API must validate:

- image MIME type allowlist;
- file size limit suitable for item photos;
- non-empty content;
- checksum calculation for audit/debugging.

Images must not be placed in the public web root. The web app should request images through an authenticated SvelteKit or API route so direct storage details are never exposed to the browser.

If inventory images grow beyond what PostgreSQL storage can comfortably handle, a later proposal can introduce S3-compatible object storage behind the same API contract.

## Web UX

Add `/sediu/inventar` under the authenticated app shell and enable the `Inventar` entry in the `Sediu` menu.

Desktop:

- compact header with item count, filtered count, total quantity, and add action;
- search and structured filters;
- table with stable row height, thumbnails, labels, actions, sorting, pagination, and column visibility preferences;
- mandatory name/actions columns must stay visible.

Mobile:

- compact item cards instead of horizontal table scrolling;
- show name, quantity, condition, image, category, location, consumable state, notes, and available actions.

Forms:

- grouped add/edit dialog or panel for identity, classification, storage, condition/notes, and image;
- disable save while saving or uploading;
- show localized validation and error feedback without discarding unsaved form values;
- confirm before delete.

## Sorting And Filtering

The API should support server-side filtering and stable sorting for the fields exposed in the list. The SvelteKit page may still maintain local UI state for column visibility and small interaction preferences.

Search should be accent-insensitive and include name, category, subcategory, owner, location, condition, notes, and creator display name. Missing optional values are treated as empty strings.

## Audit And Metadata

Each write records `created_by`/`updated_by` metadata on inventory records. If the central audit journal from `add-kitchen-planning-module` is available when implementation starts, inventory create, update, image replace/remove, and delete operations should also create safe audit entries that include item id/name and changed field names, but never image bytes.

## Rollout

1. Add database migration and API module behind authenticated routes.
2. Enable `/sediu/inventar` in the web app after API list/create/update/delete flows pass tests.
3. Keep the legacy app as the operational source until the new page is accepted.

## Rollback

Rollback should disable the web route/menu entry and API module. Database rollback should not destroy inventory records in production without an explicit data-retention decision.
