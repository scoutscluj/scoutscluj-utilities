# Design: Web Push Notifications

## Context

The new app is a SvelteKit 2/Svelte 5 frontend and NestJS 11 API backed by
Postgres through MikroORM. Authentication and roles are owned by the API, with
roles including `admin`, `finance_manager`, and `super_admin`. The PWA proposal
adds install metadata and a production service worker, but intentionally excludes
Web Push APIs and permission prompts.

The legacy implementation inspected for this proposal:

- `docs/implementation_plan.md`
- `old_app/openspec/specs/web-push-notifications/spec.md`
- `old_app/app/api/notify/subscribe/route.ts`
- `old_app/app/api/notify/unsubscribe/route.ts`
- `old_app/app/api/notify/test/route.ts`
- `old_app/app/api/notify/send/route.ts`
- `old_app/app/api/notify/broadcast/route.ts`
- `old_app/src/hooks/useNotifications.ts`
- `old_app/src/lib/web-push.ts`
- `old_app/src/lib/web-push-client.ts`
- `old_app/src/lib/device-id.ts`
- `old_app/src/components/NotificationSettings.tsx`
- `old_app/src/components/NotificationForm.tsx`
- `old_app/src/components/NotificationWelcome.tsx`
- `old_app/public/sw.js`
- `old_app/docs/push-notifications.md`
- `old_app/scripts/vapid/generate.ts`
- `old_app/scripts/vapid/test.ts`

Legacy behavior to preserve:

- Authenticated users can subscribe and unsubscribe browser/device
  subscriptions.
- One user can have multiple active devices.
- Users can send a test notification to their own subscribed devices.
- Super admins can see active subscriber/device counts and send a broadcast.
- Delivery attempts are logged.
- Expired or invalid subscriptions are marked inactive.
- Notification clicks open or focus the app at a route from the payload.
- Romanian copy is used for user-facing settings, status, and errors.

Intentional changes:

- Use `/api/notifications/*` as the new API surface instead of the legacy
  `/api/notify/*` naming.
- Store data in Postgres rather than Firestore.
- Do not use Firebase ID tokens or Firebase Cloud Messaging directly.
- Do not import legacy Firestore notification subscriptions; users will
  re-subscribe in the new app.
- Keep v1 focused on user subscription management, current-user test sends, and
  `super_admin` broadcasts that match the previous implementation's intent.
- Do not add category-level notification preferences in v1; an active
  subscription is the user's opt-in, and unsubscribe is the opt-out.
- Do not show an automatic first-visit permission prompt. Permission requests
  must come from a user gesture in settings or a contextual workflow CTA.
- Prefer feature detection over user-agent/version checks.
- Use a locally generated random device id plus PushSubscription endpoint
  uniqueness instead of browser fingerprinting as durable identity.
- Keep payloads generic and route-gated so pushes do not expose sensitive
  personal or administrative details on lock screens.

## Research Notes

- MDN describes the Push API as a way for opted-in web apps to receive server
  messages even when the app is not open, with service worker additions for push
  handling: [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).
- web.dev outlines the standard flow: ask permission, create a
  PushSubscription, store it on a server, send via the browser vendor push
  service, and display notifications from the service worker. It also calls out
  TTL, urgency, and topic controls:
  [Push notifications overview](https://web.dev/articles/push-notifications-overview).
- web.dev permission UX guidance recommends stable in-site controls and warns
  against showing the browser permission dialog as soon as users land on a site:
  [Permission UX](https://web.dev/articles/push-notifications-permissions-ux).
- Apple/WebKit requires iOS/iPadOS Home Screen web apps to request permission in
  response to direct user interaction, recommends feature detection, and notes
  Web Push works through the same standards-based Push API, Notifications API,
  and Service Workers:
  [Web Push for Web Apps on iOS and iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
- web.dev subscription guidance notes that denied permissions cannot be
  re-prompted programmatically and users must manually unblock the app:
  [Subscribe a user](https://web.dev/articles/push-notifications-subscribing-a-user).

## Goals

- Preserve legacy Web Push subscription, send, broadcast, and log workflows.
- Provide reusable notification infrastructure later, without making this
  proposal depend on any other active feature proposal.
- Respect browser permission UX and OS-level controls.
- Keep all server-side secrets and authorization checks in NestJS.
- Make subscription and delivery state observable enough for support/debugging.
- Keep the initial implementation small enough to ship without a separate queue
  service while leaving a clear path to background workers if volume grows.

## Non-Goals

- Native app notification SDKs.
- An in-app notification inbox.
- A marketing automation system.
- Rich targeting based on personal profile fields beyond explicit user ids,
  roles, and event recipients approved by feature specs.
- Background push actions that mutate server state without opening the app.

## Data Model

### `push_subscriptions`

Suggested fields:

- `id`: UUID primary key.
- `user_id`: foreign key to `users`.
- `device_id`: client-generated random id stored in localStorage.
- `endpoint`: full PushSubscription endpoint.
- `endpoint_hash`: deterministic hash for uniqueness without relying on long
  endpoint comparisons in every query.
- `p256dh`: subscription public encryption key.
- `auth_secret`: subscription auth secret.
- `expiration_time`: nullable timestamp from the browser.
- `platform`: best-effort platform label from feature detection/device info.
- `browser_name`, `browser_version`, `os_name`, `is_mobile`: nullable
  diagnostics.
- `user_agent`: nullable diagnostics; consider length-limited storage.
- `is_active`: boolean.
- `last_seen_at`, `subscribed_at`, `unsubscribed_at`, `expired_at`.
- `last_error_code`, `last_error_message`, `last_failed_at`.
- `created_at`, `updated_at`.

Constraints and indexes:

- Unique `endpoint_hash`.
- Index `(user_id, is_active)`.
- Index `(device_id, user_id)`.
- Index `last_seen_at` for cleanup/reporting.

Store subscription keys encrypted at rest if the project adds an application
encryption helper before implementation. At minimum, do not log endpoints or
keys.

### `notification_messages`

Suggested fields:

- `id`: UUID primary key.
- `kind`: enum such as `admin_broadcast` or `test`.
- `title`: displayed title.
- `body`: displayed body.
- `route_path`: nullable protected relative route.
- `data`: JSON payload with non-sensitive metadata only.
- `sent_by_user_id`: nullable foreign key for system-generated messages.
- `targeting`: JSON summary such as role/user/category criteria.
- `status`: `draft`, `sending`, `sent`, `partial_failure`, `failed`.
- `created_at`, `sent_at`.

### `notification_delivery_logs`

Suggested fields:

- `id`: UUID primary key.
- `message_id`: nullable foreign key to `notification_messages`.
- `subscription_id`: nullable foreign key to `push_subscriptions`.
- `user_id`: foreign key to `users`.
- `device_id`: nullable copied value for historical debugging.
- `status`: `success`, `failed`, `skipped`, `expired`, `retry_scheduled`.
- `http_status`: nullable push service response code.
- `error_code`, `error_message`: nullable sanitized diagnostics.
- `attempt`: integer.
- `delivered_at`, `failed_at`, `created_at`.

Indexes:

- `(message_id, status)`.
- `(user_id, created_at)`.
- `(subscription_id, created_at)`.

## API Surface

All paths are NestJS routes served under the production `/api` prefix.

### Public Configuration

`GET /notifications/vapid-public-key`

Returns the VAPID public key and safe metadata needed by the web app. The
private key is never exposed. The frontend may alternatively receive the public
key via `PUBLIC_VAPID_PUBLIC_KEY`; the API endpoint is still useful for support
diagnostics and server validation.

### Current User Status

`GET /notifications/me`

Authenticated. Returns active subscription count and whether the
current browser-provided device id appears active. This endpoint must not return
raw subscription keys.

### Subscribe

`POST /notifications/subscribe`

Authenticated. Accepts:

- `deviceId`
- `subscription.endpoint`
- `subscription.keys.p256dh`
- `subscription.keys.auth`
- `subscription.expirationTime`
- optional diagnostics: browser, OS, mobile, platform, user agent

Validation:

- `endpoint` must be HTTPS.
- endpoint host must be a known browser push service or pass a documented
  allowlist strategy.
- keys must be present and length-bounded.
- `deviceId` must be length-bounded and generated client-side, not trusted for
  authorization.

Behavior:

- Upsert by `endpoint_hash`.
- Associate the subscription with the authenticated user.
- Mark old rows for the same endpoint inactive when re-subscribed with changed
  metadata.
- Return active subscription status without exposing secret keys.

### Unsubscribe

`DELETE /notifications/subscriptions/:deviceId`

Authenticated. Marks the current user's matching active subscription(s)
inactive. The web client should also call `PushSubscription.unsubscribe()` when
possible.

`DELETE /notifications/subscriptions`

Authenticated. Marks all active subscriptions for the current user inactive.
This preserves legacy all-device unsubscribe behavior.

### Test Notification

`POST /notifications/test`

Authenticated. Sends a Romanian test notification to the current user's active
devices if active subscriptions exist. Returns delivery counts by status.

### Broadcast

`GET /notifications/broadcast/summary`

`super_admin` only. Returns active subscribed user and device counts.

`POST /notifications/broadcast`

`super_admin` only. Sends an announcement to all active subscribers, preserving
the previous implementation's broadcast workflow. Requires title and body.
Optional route links must be relative protected app paths and should be
validated against a route allowlist or route registry.

## Delivery Service

Use the standards-based `web-push` library or an equivalent maintained package
compatible with Node/NestJS. The service should:

- Validate `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` at
  startup or first use.
- Ensure the public key exposed to the web matches the server public key.
- Generate helper scripts to create and validate P-256 VAPID keys.
- Encrypt payloads through the Web Push library; do not hand-roll crypto.
- Set `TTL`, `urgency`, and `topic` based on notification kind.
- Send to each active subscription for each target user.
- Mark subscriptions inactive for `410 Gone` and authentication/key mismatch
  responses that require re-subscription.
- Retry transient `429` and `5xx` failures with bounded exponential backoff.
- Record every skip, success, retry, and failure in delivery logs.
- Avoid logging raw subscription endpoints, auth secrets, or sensitive payloads.

Suggested defaults:

- Test notification: short TTL, normal urgency, topic `test`.
- Admin broadcast: moderate TTL, normal urgency, topic derived from message id.

The first implementation can run delivery inline for explicit admin/test sends
if counts are small. Domain-triggered sends should go through a service method
that can later be moved to a queue without changing feature modules.

## Service Worker

Extend the PWA service worker with:

- `push`: parse JSON payload safely, default to a generic `ScoutsCluj`
  notification, display via `registration.showNotification()`, and never throw
  on malformed payloads.
- `notificationclick`: close the notification, validate the route is same-origin
  and relative, focus an existing app client when possible, navigate it to the
  route, or open a new window.
- `notificationclose`: optionally record local diagnostics later, but no server
  mutation is required in the initial implementation.

Payload shape:

```json
{
  "notification": {
    "title": "ScoutsCluj",
    "body": "Ai o notificare noua.",
    "icon": "/icons/icon-192.png",
    "badge": "/icons/icon-192.png",
    "tag": "broadcast",
    "data": {
      "url": "/",
      "kind": "admin_broadcast"
    },
    "actions": [
      { "action": "view_details", "title": "Vezi detalii" }
    ]
  }
}
```

The service worker must treat payload data as untrusted input.

## Frontend UX

Add notification settings under the profile/user area:

- Detect support through `serviceWorker`, `PushManager`, and `Notification`
  availability.
- Show current browser permission: `default`, `granted`, or `denied`.
- Show current app subscription state for this device and active devices count
  for the account.
- Provide a toggle/button to enable notifications. This user action is the only
  place the browser permission prompt should be triggered.
- Provide unsubscribe for this device and all devices.
- Provide a test notification button after subscription.
- Show denied-permission guidance in Romanian, explaining that the user must
  change browser/OS settings manually.
- For iOS/iPadOS, show install/Home Screen guidance only when capability
  detection indicates push is unavailable in the current browser context.

Do not port the legacy first-dashboard `NotificationWelcome` modal as an
automatic prompt. A contextual CTA is acceptable after a workflow action makes
the notification value clear, but it must still require an explicit click before
calling `Notification.requestPermission()`.

Admin UI:

- Add `/admin/notifications`, visible to `super_admin`.
- Show active user/device counts.
- Provide title/body inputs with length limits.
- Offer optional route linking from a curated allowlist.
- Show send progress and summarized delivery results.
- Keep Romanian validation and success/error copy.

## Authorization

- Subscribe, unsubscribe, status, and test endpoints require an authenticated
  local session.
- Users can manage only their own subscriptions.
- Test notifications target only the current user's devices.
- Broadcast summary and broadcast send require `super_admin`.
- Regular users, moderators, admins, and finance managers cannot send arbitrary
  notifications through this proposal.
- Future feature services may add domain-recipient sends or category preferences
  only through later approved proposals.

## Legacy Rollout

Do not import legacy Firestore notification subscriptions or logs. Existing
legacy subscribers must opt in again from the new app's notification settings.
This avoids sending to stale endpoints tied to the old Firebase/Next.js runtime,
old VAPID configuration, or users who have not chosen to enable notifications in
the new application.

The rollout should document the behavior clearly in Romanian:

1. Users who want notifications open profile notification settings.
2. They enable notifications from an explicit button click.
3. The browser permission prompt appears only from that action when permission is
   still `default`.
4. The new Postgres subscription becomes the only source used for delivery.

## Environment

API:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`, e.g. `mailto:admin@scoutscluj.ro`

Web:

- `PUBLIC_VAPID_PUBLIC_KEY` only if the implementation chooses build-time public
  configuration instead of fetching `/api/notifications/vapid-public-key`.

Deployment:

- Production and staging must serve the web app over HTTPS.
- Outbound network policy must allow browser push service endpoints, including
  Apple Web Push endpoints for iOS/iPadOS Home Screen apps.
- Service worker script caching must allow quick revalidation.

## Security And Privacy

- Do not put personal details, member names, or privileged admin content in push
  payloads.
- Route links must be protected by normal app auth when opened.
- Validate relative routes to prevent open redirects or cross-origin opens.
- Never expose VAPID private keys to SvelteKit/browser code.
- Never log raw PushSubscription auth keys.
- Rate-limit broadcast endpoints.
- Include sender id and targeting summary in audit records.
- Treat delivery success as "accepted by push service", not proof the user read
  the notification.

## Rollout And Rollback

Rollout:

1. Add migrations and notification module behind required VAPID configuration.
2. Deploy service worker push handlers with PWA support.
3. Enable user settings and test sends.
4. Enable super-admin broadcast UI.

Rollback:

- Disable notification UI and domain event dispatch through configuration.
- Keep existing subscriptions in Postgres but stop sending.
- If a VAPID key is compromised or rotated, mark affected subscriptions inactive
  and prompt users to re-subscribe.

## Testing

Backend:

- VAPID config validation tests.
- Subscription DTO validation and endpoint hash deduplication tests.
- Authorization tests for subscribe/unsubscribe/status/test/broadcast endpoints.
- Delivery service tests for success, `410`, auth failures, `429`, and `5xx`
  retry decisions with the push client mocked.
- Log creation tests for success, skipped, retry, expired, and failed attempts.

Frontend:

- SvelteKit type checks.
- Unit tests for support detection, permission states, subscribe/unsubscribe
  actions, and denied-permission messaging where the test stack supports browser
  API mocking.
- Service worker tests or focused integration checks for push parsing and click
  route validation.

Manual:

- Subscribe/unsubscribe in Chrome desktop and Android Chrome.
- Subscribe/unsubscribe in Safari where supported.
- iOS/iPadOS Home Screen smoke test on HTTPS.
- Denied permission recovery guidance.
- Test notification to current user.
- Super-admin broadcast recipient count and send.
- Notification click opens/focuses the protected route and requires auth.
