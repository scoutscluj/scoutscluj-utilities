# Tasks

## 1. Backend Data And Configuration

- [x] Add MikroORM entities and migration for push subscriptions, notification messages, and delivery logs.
- [x] Add indexes and uniqueness constraints for endpoint hashes, active user subscriptions, delivery logs, and cleanup/reporting queries.
- [x] Add API configuration validation for `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
- [x] Add a VAPID key generation/validation script adapted to the workspace toolchain.
- [x] Add Swagger/OpenAPI DTOs for notification status, subscription, unsubscribe, test send, broadcast summary, broadcast send, and delivery results.

## 2. Backend Notification APIs

- [x] Add authenticated current-user notification status endpoint.
- [x] Add authenticated subscribe endpoint with PushSubscription validation and endpoint deduplication.
- [x] Add authenticated device-specific and all-device unsubscribe endpoints.
- [x] Add authenticated current-user test notification endpoint.
- [x] Add `super_admin` broadcast summary endpoint.
- [x] Add `super_admin` broadcast send endpoint with route validation, length limits, and rate limiting.
- [x] Ensure users can manage only their own subscriptions and only `super_admin` users can broadcast notifications.

## 3. Delivery Service

- [x] Add Web Push delivery adapter using a maintained Web Push library.
- [x] Send payloads with configured TTL, urgency, and topic values by notification kind.
- [x] Handle expired/invalid subscriptions by marking rows inactive.
- [x] Retry transient `429` and `5xx` responses with bounded backoff.
- [x] Persist delivery logs for success, failure, skip, retry, and expired outcomes.
- [x] Sanitize logs so raw subscription keys and sensitive payload data are never stored in application logs.

## 4. Web Service Worker And Client State

- [x] Extend the PWA service worker with push event handling.
- [x] Add notification click handling that focuses or opens same-origin protected routes only.
- [x] Add notification close handling without required server mutation.
- [x] Add Svelte notification state/helpers for capability detection, permission state, device id, subscribe, unsubscribe, and test send.
- [x] Ensure `Notification.requestPermission()` is called only from an explicit user action.
- [x] Keep local device id generation random/stable per browser storage rather than fingerprint-derived.

## 5. Web User And Admin UI

- [x] Add profile/user notification settings route or panel with Romanian copy.
- [x] Show unsupported, default, granted, denied, subscribed, and unsubscribed states.
- [x] Add this-device unsubscribe and all-device unsubscribe controls.
- [x] Add test notification control for subscribed users.
- [x] Add denied-permission recovery guidance.
- [x] Add `/admin/notifications` for `super_admin` users.
- [x] Add admin broadcast recipient counts, compose form, route allowlist, validation states, and delivery result summary matching the previous implementation's broadcast workflow.
- [x] Add notification navigation entries under the appropriate profile/admin menus.

## 6. Legacy Rollout And Operations

- [x] Document that legacy Firestore notification subscriptions and logs are not imported.
- [x] Add Romanian user-facing copy that tells users they must re-enable notifications in the new app.
- [x] Document environment variables, HTTPS requirements, outbound push service access, and VAPID key rotation.
- [x] Document rollback steps for disabling sends and forcing re-subscription after key rotation.

## 7. Tests And Validation

- [x] Add API tests for subscription validation, subscribe, unsubscribe, status, test send, broadcast summary, broadcast send, and authorization failures.
- [x] Add delivery adapter tests with mocked push service responses for success, expired, auth failure, rate limit, and transient server errors.
- [x] Add payload sanitization tests.
- [x] Add frontend type checks and focused tests for notification settings/client helpers where the web test stack supports them.
- [x] Add service worker smoke tests or documented manual checks for push display and click routing.
- [x] Run `pnpm --filter api verify`.
- [x] Run `pnpm --filter web verify`.
- [x] Run `openspec validate add-web-push-notifications --strict`.
