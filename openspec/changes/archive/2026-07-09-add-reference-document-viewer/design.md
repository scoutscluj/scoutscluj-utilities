# Design: Reference PDF Document Viewer

## Context

The legacy Next.js app uses `@react-pdf-viewer` with PDF.js to show three local
PDFs. Its shared component provides a title, zoom controls, download, loading
feedback, and PDF render errors. The default-layout plugin also provides page
navigation. Its worker is loaded from `unpkg.com`.

The new web app is SvelteKit 2/Svelte 5 and currently has no PDF dependency or
frontend component test stack. The documents are fixed reference material rather
than user-managed records, so adding an API or database model would add no useful
capability.

## Goals

- Restore access to all three legacy PDF routes and documents.
- Provide one reusable, responsive viewer rather than duplicating route logic.
- Keep PDF parsing and the worker in the deployed web application.
- Preserve an explicit download path if rendering is unsupported or fails.
- Avoid any backend or persistence dependency.

## Non-Goals

- Reproduce every toolbar feature exposed by the old third-party default-layout
  plugin.
- Build thumbnails, bookmarks, annotations, or print controls in the first
  migration slice.
- Treat public static asset URLs as authorization-protected storage.

## Route And Document Mapping

| SvelteKit route | Viewer title | Static asset |
| --- | --- | --- |
| `/info/statut` | `Statut ONCR 2025` | `/documents/statut-2025.pdf` |
| `/programe/regulamente` | `Regulament ONCR 2025` | `/documents/regulament-oncr-2025.pdf` |
| `/sediu/regulament` | `Regulament Sediu` | `/documents/regulament-sediu.pdf` |

All pages live under `apps/web/src/routes/(app)/`, which applies the existing
authenticated layout. Each page supplies only the title and asset URL to the
shared viewer.

## Viewer Architecture

Add `pdfjs-dist` as a web dependency and implement a browser-only Svelte
component under `apps/web/src/lib/components/documents/`.

The component will use PDF.js's browser viewer components:

1. Configure PDF.js with a worker URL imported from the installed package so the
   Vite build emits and serves the matching worker locally.
2. Create an `EventBus`, `PDFLinkService`, `PDFFindController`, and `PDFViewer`.
3. Attach the loaded document to the link service, find controller, and viewer.
4. Build the complete vertical page surface so users can scroll through the
   document continuously while PDF.js renders visible pages efficiently.
5. Enable text layers so document text remains selectable and search matches can
   be highlighted and scrolled into view.
6. Destroy the PDF loading task and worker resources during teardown.

The initial control surface includes:

- current page and total page count while scrolling,
- expandable text search with result count and previous/next match controls,
- zoom out and zoom in with bounded scale,
- document download,
- loading progress/state,
- Romanian error guidance with a download fallback.

Controls use native buttons and accessible names. Status changes are announced
through an appropriate live region. The canvas has a descriptive accessible
label, while the document title remains a visible heading.

## Static Assets

Copy files from:

`old_app/public/documents/`

to:

`apps/web/static/documents/`

The implementation must preserve filenames and verify the copied SHA-256 values:

- `statut-2025.pdf`:
  `f54873b8b102efa05a52d0ad540d24bdf4a2ff4fcc3e61e72663fc7aa5ca9489`
- `regulament-oncr-2025.pdf`:
  `51515af4314cb73c241cfe54886ecd7acc09526d0e1945c31b8cdf90c2729693`
- `regulament-sediu.pdf`:
  `722e0a52c8e07a118fbc44c4ddbdbb0214f47a53d1285e8d4c39fcf094054982`

The repository snapshot is the implementation source because it makes the
migration reproducible. It was verified against the canonical legacy checkout.

## Navigation

Update the menu and `AppHref` route union with:

- `Info` → `Statut ONCR` → `/info/statut`
- `Info` → `Regulament ONCR` → `/programe/regulamente`
- `Sediu` → `Regulament` → `/sediu/regulament`

The new route helper cases must use SvelteKit's `resolve` helper consistently with
the existing app shell. Existing disabled entries remain unchanged.

## Error And Fallback Behavior

If PDF.js cannot load or render a document, the page shows Romanian error text and
a normal link to download/open the source PDF. Navigation controls are disabled
while no usable document is loaded and at their page boundaries.

The component must not fetch from a remote PDF or worker URL. All three route
configurations use same-origin static paths.

## Verification

- Confirm copied hashes match the legacy assets.
- Run the web lint, Svelte type check, and production build.
- Exercise all three routes while authenticated.
- Verify continuous page scrolling, search result navigation, zoom limits, and
  download filenames.
- Verify the layout at desktop and narrow mobile viewport widths.
- Verify an invalid PDF URL produces the error state and usable download fallback.
- Verify no PDF.js worker request targets a third-party origin.

## Trade-Offs

The PDF.js viewer and find-controller modules add more client CSS and JavaScript
than a single-canvas renderer, but preserve the legacy reading model: continuous
scrolling, selectable text, highlighted search, zooming, and downloading. The
implementation still avoids a React adapter and leaves thumbnails, bookmarks,
annotations, and print controls for later work.
