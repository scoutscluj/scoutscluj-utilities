## ADDED Requirements

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
