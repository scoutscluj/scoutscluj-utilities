## ADDED Requirements

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
