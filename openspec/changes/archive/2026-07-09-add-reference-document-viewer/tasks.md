# Tasks

## 1. Viewer Dependency And Static Assets

- [x] Add `pdfjs-dist` to the web application dependencies.
- [x] Copy the three legacy PDFs from `old_app/public/documents/` to
  `apps/web/static/documents/`.
- [x] Verify each copied PDF against the SHA-256 hash recorded in the design.

## 2. Reusable PDF Viewer

- [x] Add a client-only Svelte PDF viewer component with a locally bundled
  version-matched PDF.js worker.
- [x] Add loading, render-error, and download-fallback states in Romanian.
- [x] Add a continuous vertical document surface with current/total page status.
- [x] Add selectable text and in-document search with highlighted matches,
  result count, and previous/next result navigation.
- [x] Add bounded zoom-in and zoom-out controls with responsive PDF.js rendering.
- [x] Release PDF.js loading and worker resources when the component is
  destroyed.
- [x] Add accessible labels, focus behavior, disabled states, and live status
  announcements.

## 3. Routes And Navigation

- [x] Add `/info/statut` using `statut-2025.pdf`.
- [x] Add `/programe/regulamente` using `regulament-oncr-2025.pdf`.
- [x] Add `/sediu/regulament` using `regulament-sediu.pdf`.
- [x] Extend the typed app-route union and route resolver for all three paths.
- [x] Enable the matching `Info` and `Sediu` menu entries with the legacy labels
  and hierarchy.

## 4. Verification

- [ ] Run the web formatter/linter, Svelte type check, and production build.
  Targeted formatting and lint, Svelte type check, and production build pass.
  The full web lint remains blocked by pre-existing formatting and ESLint errors
  in unrelated activity kitchen and audit files.
- [x] Verify all three authenticated routes render the correct title, page count,
  and PDF.
- [x] Verify continuous scrolling and highlighted previous/next search result
  navigation.
- [ ] Verify zoom limits and downloaded filenames.
- [ ] Verify desktop and mobile-width layouts.
- [ ] Verify a failed PDF load shows Romanian guidance and a working source link.
- [x] Verify the PDF worker and document requests remain same-origin with no CDN
  dependency.
