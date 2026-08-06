# inventory-management Specification

## Purpose
TBD - created by archiving change add-inventory-data-import. Update Purpose after archive.
## Requirements
### Requirement: Legacy Inventory Import

The system SHALL provide an operator-invoked utility that imports a validated Firestore inventory JSON export into PostgreSQL.

#### Scenario: Operator imports a valid export

- **GIVEN** a valid inventory JSON export and an empty PostgreSQL inventory
- **WHEN** the operator runs the inventory import utility
- **THEN** every legacy item is inserted in one database transaction
- **AND** creator display names and all supported inventory fields are preserved.

#### Scenario: Inventory already contains records

- **GIVEN** PostgreSQL already contains inventory items
- **WHEN** the operator runs the utility without explicitly allowing append mode
- **THEN** the utility exits without inserting any records.

### Requirement: Legacy Image Migration

The import utility SHALL download supported Firebase Storage images to a local cache and store their bytes and metadata in `inventory_item_images`.

#### Scenario: Export contains image URLs

- **GIVEN** inventory records with valid Firebase Storage download URLs
- **WHEN** the import runs with image migration enabled
- **THEN** each image is downloaded before database writes begin
- **AND** its bytes, content type, original filename, size, and SHA-256 checksum are stored with the corresponding PostgreSQL item.

#### Scenario: An image cannot be downloaded or validated

- **GIVEN** any image is unavailable, empty, too large, or has an unsupported type
- **WHEN** the utility prepares the import
- **THEN** it exits before inserting inventory records.

### Requirement: Migration Traceability

The import utility SHALL produce a local report mapping each Firestore document ID to its inserted PostgreSQL item ID.

#### Scenario: Import commits successfully

- **WHEN** the database transaction commits
- **THEN** the utility writes a JSON mapping report
- **AND** the report includes cached image paths where applicable.

### Requirement: Offline SQL Migration

The import utility SHALL be able to generate a self-contained PostgreSQL SQL file without connecting to the target database.

#### Scenario: Operator prepares a production migration locally

- **GIVEN** a validated export and locally cached images
- **WHEN** the operator selects SQL output mode
- **THEN** the utility writes transactional SQL containing the item fields and image `bytea` values
- **AND** the SQL refuses to import into a non-empty inventory unless append mode was explicitly selected.

### Requirement: Inventory Item Storage

The system SHALL store inventory items in PostgreSQL with the fields needed by the legacy sediu inventory workflow.

#### Scenario: Inventory item is created

- **GIVEN** an authenticated inventory editor submits a valid item with a name
- **WHEN** the API creates the item
- **THEN** the item is persisted with name, quantity, category, subcategory, owner, location, condition, consumable state, notes, creator metadata, and timestamps
- **AND** the created item is returned in the inventory list.

#### Scenario: Missing optional values

- **GIVEN** an inventory item omits optional classification, location, notes, or image fields
- **WHEN** the item is listed or opened
- **THEN** the API returns a valid item response
- **AND** the web page renders empty optional values without crashing.

### Requirement: Inventory Listing, Search, Filtering, And Sorting

The system SHALL let authenticated users list inventory items with search, structured filters, and stable sorting.

#### Scenario: Search matches text fields

- **GIVEN** inventory items have names, categories, subcategories, owners, locations, conditions, notes, and creator names
- **WHEN** a user searches with accent-insensitive text
- **THEN** the list includes only non-deleted items matching at least one searchable field.

#### Scenario: Structured filters are combined

- **GIVEN** inventory items have category, subcategory, owner, location, condition, and consumable values
- **WHEN** a user applies multiple structured filters
- **THEN** the list includes only items matching all selected filters.

#### Scenario: Sort order is stable

- **WHEN** a user sorts inventory by a supported field
- **THEN** the API returns non-deleted items in the requested direction
- **AND** ties use a stable deterministic order.

### Requirement: Inventory Images

The system SHALL support one optional protected image per inventory item.

#### Scenario: Editor uploads an item image

- **GIVEN** an authenticated inventory editor selects a valid image file for an existing item
- **WHEN** the image upload succeeds
- **THEN** the system stores the image bytes and metadata server-side
- **AND** the item response includes protected image metadata or a protected image URL.

#### Scenario: User views an item image

- **GIVEN** an authenticated user can view inventory
- **WHEN** the user opens an item image
- **THEN** the system serves the image through an authenticated endpoint
- **AND** does not expose a public raw storage URL.

#### Scenario: Invalid image is rejected

- **WHEN** an editor uploads an empty, oversized, or unsupported image file
- **THEN** the API rejects the upload with a validation error
- **AND** the previous item image remains unchanged.

### Requirement: Inventory Write Permissions

The system SHALL enforce inventory write permissions in the API and reflect them in the UI.

#### Scenario: Authenticated user reads inventory

- **GIVEN** a user has a valid local session
- **WHEN** the user opens the inventory page
- **THEN** the user can view inventory items and item images.

#### Scenario: Non-editor attempts write

- **GIVEN** an authenticated user lacks `moderator`, `admin`, and `super_admin`
- **WHEN** the user attempts to create, update, delete, upload an image, or remove an image through the API
- **THEN** the API denies the request.

#### Scenario: Editor manages inventory

- **GIVEN** an authenticated user has `moderator`, `admin`, or `super_admin`
- **WHEN** the user creates, edits, deletes, uploads an image, or removes an image
- **THEN** the API authorizes the action
- **AND** the web page shows the relevant controls.

### Requirement: Inventory Administration Workflow

The web app SHALL provide localized create, edit, delete, and feedback workflows for inventory editors.

#### Scenario: Add inventory item

- **GIVEN** an inventory editor opens the add-item flow
- **WHEN** the editor fills the required fields and saves
- **THEN** the item is created
- **AND** the page shows localized success feedback and refreshes the list.

#### Scenario: Edit inventory item

- **GIVEN** an inventory editor opens an existing item for editing
- **WHEN** the edit form renders
- **THEN** current item values are prefilled
- **AND** saving updates the existing item without creating a duplicate.

#### Scenario: Delete inventory item

- **GIVEN** an inventory editor chooses to delete an item
- **WHEN** the editor confirms the destructive action
- **THEN** the item is removed from normal inventory lists
- **AND** cancellation leaves the item unchanged.

#### Scenario: Save error preserves form state

- **WHEN** an item save, delete, or image operation fails
- **THEN** the web app shows a localized error message
- **AND** keeps the user in context without discarding unsaved form values.

### Requirement: Responsive Inventory Workspace

The web app SHALL expose the inventory page as a responsive operational workspace under the authenticated `Sediu` navigation group.

#### Scenario: Desktop inventory management

- **GIVEN** an authenticated user opens `Sediu > Inventar` on a desktop-width viewport
- **WHEN** inventory items are loaded
- **THEN** the page shows a compact header, item counts, filters, column visibility control, and a scannable table with thumbnails and actions.

#### Scenario: Column visibility preferences

- **GIVEN** a user changes visible inventory table columns
- **WHEN** the page rerenders
- **THEN** optional columns follow the user's saved preference
- **AND** mandatory name and action controls remain visible.

#### Scenario: Mobile inventory management

- **GIVEN** an authenticated user opens inventory on a narrow viewport
- **WHEN** inventory items are loaded
- **THEN** the page shows compact item cards with name, quantity, condition, image, category, location, consumable state, notes, and available actions
- **AND** the user can search and filter without horizontal table scrolling.

### Requirement: Inventory Option Labels

The system SHALL preserve the legacy inventory option sets and render Romanian labels consistently.

#### Scenario: Known options are displayed with labels

- **GIVEN** an item uses a known category, subcategory, owner, location, or condition value
- **WHEN** the item appears in the inventory UI
- **THEN** the UI displays the configured Romanian label for that value.

#### Scenario: Unknown stored option remains usable

- **GIVEN** an item contains an option value outside the configured defaults
- **WHEN** filters and item rows render
- **THEN** the unknown value remains visible and selectable instead of hiding the item.

### Requirement: Efficient Inventory Image Metadata Retrieval

The system SHALL list inventory image metadata without retrieving original or thumbnail binary payloads.

#### Scenario: Inventory items with images are listed

- **GIVEN** inventory items have protected original images and generated thumbnails
- **WHEN** an authenticated user requests an inventory item list
- **THEN** the API returns the image metadata needed to render protected versioned thumbnail URLs
- **AND** the list query does not select or hydrate original image bytes
- **AND** the list query does not select or hydrate thumbnail bytes.

#### Scenario: A page contains many large originals

- **GIVEN** a requested inventory page contains many multi-megabyte original images
- **WHEN** the API serializes the inventory list
- **THEN** API and database work for the list remains independent of the total original-image byte size.

### Requirement: Protected Inventory Image Thumbnails

The system SHALL maintain one small protected thumbnail for each valid inventory image while preserving the protected original for explicit viewing.

#### Scenario: Editor uploads or replaces an image

- **GIVEN** an authenticated inventory editor submits a supported valid image
- **WHEN** the API processes the upload
- **THEN** the system stores the original bytes and metadata
- **AND** generates and stores a bounded WebP thumbnail and checksum
- **AND** returns metadata for protected original and thumbnail delivery.

#### Scenario: Thumbnail generation fails during replacement

- **GIVEN** an inventory item already has a valid original and thumbnail
- **WHEN** an editor submits bytes that cannot be decoded or transformed safely
- **THEN** the API rejects the replacement
- **AND** the previous original and thumbnail remain unchanged.

#### Scenario: Existing images are backfilled

- **GIVEN** existing inventory image records do not have thumbnails
- **WHEN** an operator runs the thumbnail backfill
- **THEN** valid images receive deterministic thumbnail bytes and metadata in bounded batches
- **AND** the operation can resume safely without regenerating completed records
- **AND** invalid images are reported without deleting or rewriting their originals.

#### Scenario: Authenticated user views a preview

- **GIVEN** an inventory item has a generated thumbnail
- **WHEN** an authenticated user views the table or mobile card
- **THEN** the preview is served through a protected thumbnail endpoint
- **AND** the original bytes are not served unless the user explicitly opens the full image.

### Requirement: Efficient Inventory Image Delivery

The system SHALL deliver inventory previews lazily with version-aware private caching and without unnecessary response buffering.

#### Scenario: Inventory page initially renders

- **GIVEN** an authenticated user opens an inventory page containing images
- **WHEN** desktop table rows or mobile cards render
- **THEN** preview elements reference only protected thumbnail URLs
- **AND** thumbnails are eligible for native lazy loading and asynchronous decoding
- **AND** preview dimensions are reserved before image decoding
- **AND** no original-image request is made solely to render a preview.

#### Scenario: Unchanged thumbnail is requested again

- **GIVEN** the browser has a cached protected thumbnail with an entity tag
- **WHEN** its private cache entry requires revalidation
- **THEN** the authenticated delivery path honors the conditional request
- **AND** returns `304 Not Modified` without retransmitting unchanged bytes.

#### Scenario: Image is replaced

- **GIVEN** an inventory item's image is replaced successfully
- **WHEN** the inventory page renders the updated item
- **THEN** its thumbnail URL contains a new content version
- **AND** the browser does not continue displaying the replaced thumbnail from cache.

#### Scenario: Protected image is proxied

- **GIVEN** an authenticated image request succeeds upstream
- **WHEN** the SvelteKit route forwards the response
- **THEN** it streams the upstream body instead of buffering the complete image
- **AND** preserves the content, length, disposition, cache, and validator headers needed by the browser.

