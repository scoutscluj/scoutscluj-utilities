# Tasks

## 1. Thumbnail Model And Processing

- [x] Add nullable thumbnail content type, file size, checksum, and `bytea` columns to `inventory_item_images` with a MikroORM migration and snapshot update.
- [x] Add a shared inventory thumbnail generator using `sharp` with orientation correction, bounded 192 by 192 cover resizing, deterministic WebP output, and checksum calculation.
- [x] Generate and validate the thumbnail before mutating an existing image record so failed uploads preserve the previous original and thumbnail.
- [ ] Add focused tests for valid JPEG/PNG/WebP input, orientation, dimensions, corrupt bytes, safe replacement, and production-container HEIC behavior.

## 2. Metadata And Image Delivery

- [x] Change inventory list image lookup to an explicit metadata projection that excludes both original and thumbnail binary columns.
- [x] Add protected thumbnail retrieval and retain protected original retrieval for explicit full-size viewing.
- [x] Add strong ETags, `If-None-Match` handling, private cache headers, and version metadata for original and thumbnail responses.
- [x] Stream image bodies through the SvelteKit authenticated proxy and forward content, length, disposition, validator, and cache headers.
- [x] Add API/integration tests proving list queries do not hydrate blobs and unchanged conditional requests return `304 Not Modified`.

## 3. Existing Data And Import

- [x] Add an idempotent, resumable thumbnail backfill command with bounded batches, limited concurrency, incremental progress, and a failure report that omits image bytes.
- [x] Update the legacy inventory importer and generated SQL path to create the same thumbnail bytes and metadata.
- [x] Test backfill resume behavior, invalid-image isolation, importer output, and safe reruns.
- [x] Document backfill invocation, expected load, failure handling, and verification in the inventory import/operator documentation.

## 4. Web Inventory Previews

- [x] Expose versioned protected thumbnail URLs to the inventory page while keeping the original URL for explicit opening.
- [x] Update desktop table and mobile card previews to use only thumbnails with native lazy loading, asynchronous decoding, low fetch priority, and explicit dimensions.
- [x] Show the existing placeholder when a thumbnail is unavailable without automatically downloading the original as a preview.
- [ ] Add browser coverage proving initial desktop and mobile rendering makes no original-image request and replacement changes the thumbnail URL.

## 5. Validation And Rollout

- [x] Run `openspec validate optimize-inventory-image-loading --strict`.
- [x] Run focused API and web tests, type checks, lint checks, and formatting checks for changed files.
- [ ] Verify the API production container can generate thumbnails for every supported upload format, including HEIC/HEIF where advertised.
- [ ] Capture a throttled-network baseline and post-change trace for the reported inventory page, including request count, transferred image bytes, and time until the table is usable.
- [ ] Deploy nullable schema and server support, backfill existing thumbnails, review failures, and only then switch production preview URLs.
- [ ] Complete the pending desktop and mobile inventory smoke test with the image performance acceptance criteria.
