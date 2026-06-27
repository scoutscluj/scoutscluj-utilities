# Design: PWA Support

## Context

The current app is a SvelteKit 2/Svelte 5 frontend served by the `web` package
behind the same production hostname as the NestJS API. Caddy routes `/api/*` to
the API and all other requests to SvelteKit. The legacy `old_app` PWA used:

- `public/manifest.webmanifest` with Romanian app metadata and 192/512
  maskable icons.
- `public/sw.js` with shell/runtime caches, an offline fallback, cache cleanup,
  and a `SKIP_WAITING` message handler.
- `PWAContext` for install prompt capture, iOS/manual install mode, standalone
  detection, offline state, service worker registration, waiting-worker
  detection, version mismatch detection, and update activation.
- `PWAStatusToasts` and `PWAStatusChip` to expose install/update/offline state.

The new app should preserve the user-facing behavior while translating runtime
details away from Next/Firebase:

- Static assets live in `apps/web/static`.
- Global head metadata can be emitted from `src/routes/+layout.svelte` and
  `src/app.html`.
- The existing toast dependency is `svelte-sonner`.
- Protected app routes currently live under the `(app)` route group and call the
  NestJS API through server-side SvelteKit loads.

## Goals

- Make the app installable on Android Chrome and iOS Safari where browser
  support allows.
- Preserve Romanian install/update/offline messaging.
- Keep service worker registration production-only by default.
- Use a cache strategy that improves repeat loads without storing sensitive
  authenticated data unexpectedly.
- Provide a deterministic update flow that activates a waiting worker only when
  the user accepts the refresh.
- Keep the implementation small and maintainable without introducing a PWA
  framework unless it is clearly needed during implementation.

## Non-Goals

- Offline mutation support.
- Feature-specific offline data models.
- Push notification APIs or notification permission prompts.
- Broad API response caching for finance/auth/user data.
- Multi-origin cache rules.

## Proposed Approach

### Manifest And Icons

Add `apps/web/static/manifest.webmanifest` based on the legacy manifest, renamed
for the new product where appropriate:

- `name`: `ScoutsCluj`
- `short_name`: `ScoutsCluj`
- `description`: Romanian operational portal description
- `start_url`: `/`
- `scope`: `/`
- `display`: `standalone`
- `lang`: `ro`
- `theme_color`: Scouts red
- icons: 192, 512, maskable 192, maskable 512

Copy or regenerate the legacy icon assets into `apps/web/static/icons`. Add
`apple-touch-icon`, `manifest`, and `theme-color` links in the global Svelte
layout/head. Replace the default Svelte favicon with ScoutsCluj branding as
part of the same task.

### Offline Route

Add a lightweight `/offline` SvelteKit page with Romanian copy. It should render
without API data and explain that cached pages may still be available while
operations that change data require internet access.

### Service Worker

Start with a SvelteKit-bundled `apps/web/src/service-worker.ts`, adapted from
`old_app`, so the contract stays explicit while still using SvelteKit's
generated asset list:

- Cache names include a version/build identifier.
- `install` precaches `/`, `/offline`, `/manifest.webmanifest`, favicon, and
  app icons.
- `activate` removes old app-owned caches and calls `clients.claim()`.
- `fetch` handles only `GET`.
- Navigation requests use network-first with cached-page fallback and then
  `/offline`.
- Same-origin static assets use cache-first or stale-while-revalidate.
- Same-origin API requests are not cached by default, except future allowlisted
  safe `GET` endpoints if a feature proposal explicitly opts in.
- Auth/session/logout/upload routes are excluded from runtime caching.
- `message` handles `{ type: "SKIP_WAITING" }`.

Implementation should let `/service-worker.js` revalidate quickly. The browser
must not keep an old service worker script
because of overly aggressive HTTP caching.

### Client State And UX

Add a Svelte PWA state module used from the root layout:

- Register `/service-worker.js` only in the browser and only for production builds unless a
  development override is enabled.
- Capture `beforeinstallprompt`, prevent the browser's automatic mini-infobar
  where supported, store the event, and expose an install CTA.
- Detect iOS Safari and expose manual install instructions when native prompt is
  unavailable.
- Track standalone mode using `display-mode: standalone` and iOS
  `navigator.standalone`.
- Track online/offline events.
- Detect `registration.waiting` on first registration and `updatefound` for new
  workers.
- Store active build metadata in `localStorage` and surface update prompts when
  stored metadata differs from the hydrated build metadata.
- On update acceptance, post `{ type: "SKIP_WAITING" }` to the waiting worker and
  reload after `controllerchange`; fall back to `window.location.reload()` if no
  waiting worker exists.

Use `svelte-sonner` for install/update/offline toasts. Add a compact status
chip to the app shell for online/offline/installed state, adapted from the
legacy app and sized to fit the current header without crowding mobile layouts.

### Build Metadata

Expose build metadata to the web app through public environment variables with
safe defaults:

- `PUBLIC_APP_VERSION`
- `PUBLIC_COMMIT_HASH`

Deployment scripts should populate them from the package version and commit SHA
when available. Local development can default to `0.0.0-dev` and `local`.

### Security And Privacy

The service worker must not cache:

- non-GET requests,
- auth callback/login/logout/session endpoints,
- uploads or document files,
- API responses unless explicitly allowlisted,
- responses with `Cache-Control: no-store`.

Offline messaging must be clear that cached views may be stale. The app should
never imply that financial or administrative actions were saved while offline.

### Rollout

The first implementation can ship independently from Web Push. Later
notification work can reuse the same service worker by adding push and
notification click handlers through a separate proposal.

Production rollout requires HTTPS. Local verification can use SvelteKit preview
or browser devtools, but actual installability should be validated on a staging
or production HTTPS URL.

## Alternatives Considered

### `vite-plugin-pwa`

A Vite PWA plugin could generate precache manifests and Workbox strategies. It
may be useful later, but the initial behavior is small and the legacy service
worker contract is explicit. A hand-written worker avoids adding dependency and
tooling surface before cache needs are complex.

### Cache API Responses By Default

Caching all same-origin `GET /api/*` responses would make more screens work
offline, but it risks retaining sensitive finance/user data and serving stale
authorization state. The safer default is to cache static shell assets and
visited pages only, then let future capability proposals opt specific endpoints
into offline reads.

### Register In Development

Development service workers often create confusing stale-bundle behavior. The
default should be production-only, with an explicit override if an implementer
needs local PWA debugging.

## Verification

- `pnpm --filter web verify`
- Root `pnpm verify` if focused checks pass.
- Browser smoke test: service worker registers in production preview and does
  not register in normal dev mode.
- Lighthouse PWA/installability audit on HTTPS.
- Android Chrome install test.
- iOS Safari Add to Home Screen/manual install smoke test.
- Offline smoke test: visit dashboard, go offline, reload visited route, visit
  unvisited route, confirm `/offline` fallback.
- Update smoke test: deploy/build with changed metadata, confirm update toast,
  `SKIP_WAITING`, `controllerchange`, and reload.
