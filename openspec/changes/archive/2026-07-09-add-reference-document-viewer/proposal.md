# Change: Add Reference PDF Document Viewer

## Why

The legacy application gives authenticated users direct access to three frequently
used organizational documents through an in-app PDF viewer. Those routes are not
yet migrated, and their corresponding entries in the new app shell are absent or
disabled.

The legacy implementation also loads its PDF.js worker from a public CDN. The new
application should keep both the documents and the viewer runtime under its own
deployment so document access does not depend on a third-party worker URL.

The canonical legacy app and the checked-in `old_app` snapshot contain the same
three files with matching SHA-256 hashes:

| Legacy route | Menu location | Document | Pages | Size |
| --- | --- | --- | ---: | ---: |
| `/info/statut` | `Info` → `Statut ONCR` | `statut-2025.pdf` | 31 | 440,197 bytes |
| `/programe/regulamente` | `Info` → `Regulament ONCR` | `regulament-oncr-2025.pdf` | 38 | 2,818,582 bytes |
| `/sediu/regulament` | `Sediu` → `Regulament` | `regulament-sediu.pdf` | 4 | 452,735 bytes |

## What Changes

- Add a reusable Svelte PDF viewer for static reference documents.
- Bundle PDF.js and its worker with the web application instead of loading the
  worker from a CDN.
- Support document title, loading and error states, continuous document
  scrolling, in-document text search, zoom controls, responsive rendering, and
  direct PDF download.
- Copy the three legacy PDFs from the repository's `old_app` snapshot into
  `apps/web/static/documents/` without changing their filenames or contents.
- Add authenticated SvelteKit pages at the three legacy-compatible routes.
- Add enabled app-shell menu entries for `Statut ONCR`, `Regulament ONCR`, and
  the headquarters `Regulament`.
- Keep the documents available only through the authenticated application
  navigation and pages; this change does not add document administration or an
  API-backed document store.

## Out Of Scope

- Uploading, editing, replacing, or versioning reference documents through the UI.
- Moving the PDFs into Postgres or object storage.
- OCR, annotations, form filling, signatures, or collaborative review.
- Migrating Google Docs, forms, calendars, or other legacy iframe routes.
- Changing the contents of the three legacy PDF files.
- Offline precaching of the PDF documents.

## Impact

- Affected specs: `reference-documents` (new).
- Affected app areas: web dependencies, static assets, authenticated routes,
  reusable web components, app menu configuration, and typed route helpers.
- Affected data: three immutable static PDF assets; no database or API changes.
- Security impact: page access remains behind the existing authenticated SvelteKit
  layout. Static files are deployment assets and are not a confidential-document
  authorization boundary.
- Deployment impact: the web artifact grows by approximately 3.7 MB plus the
  PDF.js client/worker bundle.
- Migration impact: the three route paths and menu labels remain compatible with
  the legacy application.
