# Change: Optimize Inventory Image Loading

## Why

The inventory table and mobile cards currently render protected original images as small previews. A typical page can include up to 100 items, while many imported originals are several megabytes each. Initial page rendering therefore creates a large burst of authenticated image requests, image decoding work, and memory pressure across PostgreSQL, the NestJS API, the SvelteKit proxy, and the browser.

The inventory list path also hydrates complete image entities, including `bytea` file data, when it only needs image metadata. This makes even the JSON list request scale with the total size of the images on the page. The existing five-minute browser cache reduces some repeat traffic but does not make the first load efficient and cannot validate unchanged content with an ETag.

## What Changes

- Store a small, deterministic WebP thumbnail alongside each protected inventory original and generate it before a new upload replaces the previous image.
- Backfill thumbnails for existing inventory images with a resumable, bounded operator command, and generate thumbnails during future legacy imports.
- Add a protected thumbnail endpoint while preserving the current protected original-image endpoint for explicit full-size viewing.
- Ensure inventory list queries retrieve image metadata without selecting original or thumbnail binary columns.
- Render only thumbnail URLs in inventory table and mobile preview contexts, use lazy asynchronous image decoding, and reserve the preview dimensions in the layout.
- Add versioned thumbnail URLs, strong ETags, conditional requests, and private browser caching without exposing public storage URLs.
- Stream image responses through the SvelteKit authenticated proxy instead of buffering the complete response before forwarding it.
- Add performance-focused API and browser regression coverage that prevents original images from being fetched during initial inventory rendering.

## Out Of Scope

- Moving inventory images from PostgreSQL to S3, a CDN, or another object-storage service.
- Recompressing, resizing, or deleting the protected original image bytes.
- Multiple thumbnail sizes, responsive image negotiation, or a general-purpose media transformation service.
- Changing inventory search, filtering, sorting, or the user-visible pagination model beyond work needed to stop image blob hydration.
- Making inventory images public or weakening the existing authenticated read policy.

## Impact

- Affected specs: `inventory-management`.
- Affected app areas: API inventory entity and migration, image processing, inventory list serialization, image delivery endpoints, import/backfill tooling, SvelteKit image proxy routes, desktop table thumbnails, mobile card thumbnails, and focused tests.
- Affected data: nullable thumbnail bytes and metadata added to existing `inventory_item_images` records, followed by a resumable backfill.
- Dependency impact: reuse the API's existing `sharp` dependency; no new storage or media infrastructure is introduced.
- Security impact: thumbnails remain protected by the same authentication boundary as originals, and cache responses remain private.
- Operational impact: rollout requires a bounded thumbnail backfill before the web UI switches existing records to the thumbnail endpoint.
