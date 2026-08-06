# Change: Add Inventory Management

## Why

The legacy app provides the working `Inventar` surface for sediu equipment, but it is still backed directly by Firestore and Firebase Storage from the frontend. The new app needs the same operational capability behind the NestJS API, PostgreSQL, and SvelteKit route structure.

## What Changes

- Add a PostgreSQL-backed inventory item model with the legacy inventory fields: name, quantity, category, subcategory, owner, location, condition, consumable state, notes, creator/updater metadata, and an optional image.
- Add authenticated NestJS APIs for listing, filtering, sorting, creating, updating, deleting, and image upload/removal.
- Add a SvelteKit `Inventar` page under the `Sediu` navigation group with desktop table scanning, mobile item cards, structured filters, column visibility preferences, add/edit workflows, image preview, delete confirmation, and localized feedback states.
- Make inventory read access available to authenticated users and restrict write actions to inventory editors through API role checks.
- Store inventory images server-side and serve them only through authenticated endpoints.

## Out Of Scope

- Legacy Firestore/Firebase Storage data migration or import from `inventoryItems`.
- Multi-image galleries, QR labels, booking/reservation workflows, check-in/check-out flows, maintenance tickets, and stock movement history.
- Manual category administration beyond the fixed option sets and preserving unknown existing values.

## Impact

- Affected specs: `inventory-management` (new)
- Affected app areas: API inventory module, database migrations, web `Sediu > Inventar` route, app side menu, authenticated file/image proxying, role-based UI controls.
- Affected data: new inventory item and inventory image records in PostgreSQL.
- Security impact: write actions and image access must be authorized by the API; raw storage paths or image bytes must not be publicly exposed.
