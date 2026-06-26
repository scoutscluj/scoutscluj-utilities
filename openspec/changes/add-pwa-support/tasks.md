# Tasks

## 1. Manifest And Assets

- [x] Add ScoutsCluj favicon and icon assets under `apps/web/static`.
- [x] Add `apps/web/static/manifest.webmanifest` with Romanian metadata,
      standalone display, scope/start URL, theme colors, and any/maskable icons.
- [x] Add manifest, icon, Apple touch icon, and theme-color metadata to the
      SvelteKit root layout/head.
- [x] Set the document language to Romanian in `apps/web/src/app.html`.

## 2. Offline Fallback And Service Worker

- [x] Add a lightweight `/offline` route that renders without authenticated API
      data.
- [x] Add `apps/web/src/service-worker.ts` with versioned shell/runtime caches,
      install, activate, fetch, and `SKIP_WAITING` handlers.
- [x] Precache the shell entry points, offline page, manifest, favicon, and PWA
      icons.
- [x] Runtime-cache only safe same-origin GET navigations/static assets by
      default.
- [x] Exclude auth routes, uploads, non-GET requests, `no-store` responses, and
      API responses unless explicitly allowlisted.

## 3. Client PWA State

- [x] Add a Svelte PWA state module/provider for install prompt capture,
      standalone detection, online/offline state, service worker registration,
      waiting-worker detection, and update activation.
- [x] Register the service worker only in browser production builds, with a
      documented development override if needed.
- [x] Add build metadata helpers for `PUBLIC_APP_VERSION` and
      `PUBLIC_COMMIT_HASH` with safe local defaults.
- [x] Persist active/dismissed build identifiers in `localStorage` to re-prompt
      users after long-running or offline sessions.

## 4. User Interface

- [x] Surface install availability with Romanian copy and native
      `beforeinstallprompt.prompt()` where supported.
- [x] Surface iOS/manual install guidance when native install prompt is not
      available.
- [x] Surface offline status with a persistent warning while the browser is
      offline.
- [x] Surface update availability with build metadata and an "Actualizează"
      action that posts `SKIP_WAITING` and reloads after `controllerchange`.
- [x] Add a compact online/offline/installed status chip to the app shell with
      responsive behavior for the current header.

## 5. Deployment And Documentation

- [x] Populate `PUBLIC_APP_VERSION` and `PUBLIC_COMMIT_HASH` in deployment
      scripts when available.
- [x] Document cache/header expectations for `/service-worker.js`, manifest,
      and static assets.
- [x] Document what works offline and what still requires connectivity.
- [x] Document mobile install steps for Android Chrome and iOS Safari.

## 6. Verification

- [x] Run `openspec validate add-pwa-support --strict`.
- [x] Run `pnpm --filter web verify`.
- [x] Run root `pnpm verify` if focused checks pass.
- [ ] Run Lighthouse PWA/installability checks on an HTTPS environment.
- [ ] Smoke test Android Chrome install flow.
- [ ] Smoke test iOS Safari Add to Home Screen/manual install flow.
- [ ] Smoke test offline reload of a previously visited protected route and
      `/offline` fallback for uncached navigation.
- [ ] Smoke test service worker update prompt and `SKIP_WAITING` refresh flow.
