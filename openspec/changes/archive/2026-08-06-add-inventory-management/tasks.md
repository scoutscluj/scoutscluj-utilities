# Tasks

## 1. Backend Model And API

- [x] Add MikroORM entities and migration for `inventory_items` and `inventory_item_images`.
- [x] Add inventory DTOs, validation, option metadata, and Swagger documentation.
- [x] Implement inventory service list/search/filter/sort behavior.
- [x] Implement create, get-one, update, soft-delete, image upload/replace, image remove, and image stream endpoints.
- [x] Enforce authenticated read access and `moderator`/`admin`/`super_admin` write access in NestJS.
- [x] Add backend tests for validation, filtering, sorting, soft delete, image handling, and role denial.

## 2. Web Inventory Page

- [x] Enable the `Sediu > Inventar` menu entry and add the `/sediu/inventar` route.
- [x] Add server load/actions or API helpers for listing, creating, updating, deleting, and image operations.
- [x] Build the desktop inventory table with sorting, pagination, thumbnails, row actions, and column visibility preferences.
- [x] Build the mobile inventory card layout.
- [x] Add search and structured filters for category, subcategory, owner, location, condition, and consumable state.
- [x] Add grouped add/edit flow with validation, upload preview, save/upload disabled states, and localized feedback.
- [x] Add delete confirmation, loading, empty, and error states.
- [x] Hide or disable edit controls for authenticated users without inventory editor roles.

## 3. Security And Operations

- [x] Validate image MIME type, file size, and non-empty content server-side.
- [x] Serve images only through authenticated routes and avoid public raw storage URLs.
- [x] Record created/updated actor metadata for item and image changes.
- [x] Add central audit journal entries for inventory writes if the audit module is available before implementation.
- [x] Document rollback behavior and image storage limits.

## 4. Validation

- [x] Run `openspec validate add-inventory-management --strict`.
- [x] Run focused API tests for the inventory module.
- [x] Run web type/lint checks after adding the inventory page.
- [ ] Smoke-test desktop and mobile inventory workflows.
