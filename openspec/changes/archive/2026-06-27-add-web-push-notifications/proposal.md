# Change: Add Web Push Notifications

## Why

Scouts Cluj Utilities needs backend-owned notification infrastructure so super
administrators can broadcast operational announcements to users who explicitly
enable browser push notifications. The legacy app already supports Web Push
subscriptions, multi-device delivery, test sends, broadcast sends, and delivery
logs through Firebase/Next.js. The new app should preserve that user-facing
broadcast behavior while moving subscriptions, authorization, delivery, and
audit history into NestJS, Postgres, MikroORM, and the SvelteKit PWA shell.

Current Web Push guidance also suggests improving the legacy approach: request
browser permission only from a direct user action, use feature detection instead
of browser-specific assumptions, keep in-site notification controls available,
store PushSubscription data server-side, and tune delivery with TTL, urgency,
and topic/collapse semantics.

## What Changes

- Add NestJS notification APIs for VAPID public configuration, subscription
  registration, device-specific unsubscribe, current-user notification status,
  current-user test sends, super-admin broadcast sends, and broadcast recipient
  counts.
- Add Postgres/MikroORM persistence for push subscriptions, notification
  messages/campaigns, and delivery logs.
- Add server-side Web Push delivery using VAPID keys, with validation,
  per-device delivery attempts, transient retry handling, expired subscription
  cleanup, and delivery/audit logging.
- Extend the SvelteKit PWA service worker from `add-pwa-support` with push,
  notification click, and notification close handlers.
- Add user-facing notification settings under the profile area with Romanian
  copy, platform support detection, permission state, subscribe/unsubscribe,
  and test notification controls.
- Add a super-admin notification administration page for broadcast counts,
  composing announcements, optional protected-route links, and delivery result
  summaries.
- Require users to re-subscribe in the new app instead of importing legacy
  Firestore notification subscriptions.

## Out Of Scope

- Native mobile push through APNs/FCM SDKs outside the standards-based Web Push
  protocol.
- Reintroducing Firebase Cloud Messaging as a direct app dependency.
- Offline write sync, background sync, or local notification scheduling.
- Full message inbox/read-state UI beyond settings, admin send surfaces, and
  delivery logs needed for audit/debugging.
- Finance workflow notification wiring or other domain-triggered sends. This
  proposal is standalone and should not depend on the financial document
  workflow proposal.
- Bypassing browser/OS notification permission decisions.

## Impact

- Affected specs: `web-push-notifications` (new).
- Affected app areas: API notifications module, database migrations,
  environment configuration, web profile/settings route, web admin route,
  service worker, app shell/profile navigation, Swagger/OpenAPI.
- Dependencies: should build on the PWA service worker and install metadata from
  `add-pwa-support`; if both changes are implemented concurrently, service
  worker edits must be coordinated in one generated worker.
- Security impact: high. Subscription endpoints are authenticated, send
  endpoints are role-gated, VAPID private keys remain server-only, notification
  click targets are route-validated, and sensitive workflow details are kept out
  of push payloads.
