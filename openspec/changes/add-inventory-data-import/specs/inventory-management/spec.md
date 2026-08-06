## ADDED Requirements

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
