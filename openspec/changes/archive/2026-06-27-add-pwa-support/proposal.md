# Change: Add PWA Support

## Why

Scouts Cluj Utilities is commonly used from phones during activities, meetings,
and HQ work. The new SvelteKit app should be installable from mobile browsers,
launch in standalone mode, remain usable for previously visited read-only views
during short connectivity interruptions, and clearly prompt users when a new
deployment is ready.

The legacy `old_app` implementation already established the behavior to preserve:
a Romanian web app manifest, static icon set, production service worker,
install prompt handling, offline status messaging, and an explicit
`SKIP_WAITING` update flow. This change adapts that behavior to the new
SvelteKit/NestJS/Postgres architecture instead of copying the old Next/Firebase
runtime assumptions.

## What Changes

- Add a SvelteKit-served web app manifest, app icons, Apple install metadata,
  and theme-color metadata for `ScoutsCluj`.
- Add a production service worker for the web app that precaches the app shell
  and static assets, runtime-caches successful same-origin GET responses, and
  falls back to a localized offline page for uncached navigations.
- Add a Svelte client-side PWA state module/provider that handles
  `beforeinstallprompt`, iOS/manual install messaging, standalone detection,
  online/offline state, service worker registration, waiting-worker detection,
  and one-click update activation.
- Surface install, offline, and update messages through the existing Svelte
  toast system and app shell using Romanian copy.
- Add a visible app-shell PWA status chip for online/offline/installed state,
  adapted from the legacy app.
- Add build metadata plumbing for update prompts so users and support can
  identify the running version/commit when a new build is available.
- Document deployment and QA requirements for HTTPS installability, cache
  invalidation, and mobile browser smoke testing.

## Out Of Scope

- Offline writes, background sync, conflict resolution, or local database
  replication.
- Web Push subscription APIs, VAPID keys, notification persistence, or
  notification sending workflows.
- Caching authenticated API responses that contain sensitive or finance-specific
  data without explicit feature-level approval.
- Replacing the current SvelteKit app shell or changing authentication behavior.
- Shipping native iOS/Android wrappers.

## Impact

- Affected specs: `pwa-support` (new)
- Affected app areas: `apps/web` static assets, root layout/head metadata,
  app shell, client-side state, service worker, offline route, deployment env.
- Affected infrastructure: no new infrastructure, but production must serve the
  web app over HTTPS and with correct cache headers for `sw.js` and the
  manifest.
- Security impact: the service worker controls same-origin requests, so it must
  avoid caching unsafe methods, auth redirects, session endpoints, uploads, and
  sensitive API responses by default.
