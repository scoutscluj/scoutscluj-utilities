# Tasks

## 1. Backend Data And Configuration

- [ ] Add MikroORM entities and migration for push subscriptions, notification messages, and delivery logs.
- [ ] Add indexes and uniqueness constraints for endpoint hashes, active user subscriptions, delivery logs, and cleanup/reporting queries.
- [ ] Add API configuration validation for `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
- [ ] Add a VAPID key generation/validation script adapted to the workspace toolchain.
- [ ] Add Swagger/OpenAPI DTOs for notification status, subscription, unsubscribe, test send, broadcast summary, broadcast send, and delivery results.

## 2. Backend Notification APIs

- [ ] Add authenticated current-user notification status endpoint.
- [ ] Add authenticated subscribe endpoint with PushSubscription validation and endpoint deduplication.
- [ ] Add authenticated device-specific and all-device unsubscribe endpoints.
- [ ] Add authenticated current-user test notification endpoint.
- [ ] Add `super_admin` broadcast summary endpoint.
- [ ] Add `super_admin` broadcast send endpoint with route validation, length limits, and rate limiting.
- [ ] Ensure users can manage only their own subscriptions and only `super_admin` users can broadcast notifications.

## 3. Delivery Service

- [ ] Add Web Push delivery adapter using a maintained Web Push library.
- [ ] Send payloads with configured TTL, urgency, and topic values by notification kind.
- [ ] Handle expired/invalid subscriptions by marking rows inactive.
- [ ] Retry transient `429` and `5xx` responses with bounded backoff.
- [ ] Persist delivery logs for success, failure, skip, retry, and expired outcomes.
- [ ] Sanitize logs so raw subscription keys and sensitive payload data are never stored in application logs.

## 4. Web Service Worker And Client State

- [ ] Extend the PWA service worker with push event handling.
- [ ] Add notification click handling that focuses or opens same-origin protected routes only.
- [ ] Add notification close handling without required server mutation.
- [ ] Add Svelte notification state/helpers for capability detection, permission state, device id, subscribe, unsubscribe, and test send.
- [ ] Ensure `Notification.requestPermission()` is called only from an explicit user action.
- [ ] Keep local device id generation random/stable per browser storage rather than fingerprint-derived.

## 5. Web User And Admin UI

- [ ] Add profile/user notification settings route or panel with Romanian copy.
- [ ] Show unsupported, default, granted, denied, subscribed, and unsubscribed states.
- [ ] Add this-device unsubscribe and all-device unsubscribe controls.
- [ ] Add test notification control for subscribed users.
- [ ] Add denied-permission recovery guidance.
- [ ] Add `/admin/notifications` for `super_admin` users.
- [ ] Add admin broadcast recipient counts, compose form, route allowlist, validation states, and delivery result summary matching the previous implementation's broadcast workflow.
- [ ] Add notification navigation entries under the appropriate profile/admin menus.

## 6. Legacy Rollout And Operations

- [ ] Document that legacy Firestore notification subscriptions and logs are not imported.
- [ ] Add Romanian user-facing copy that tells users they must re-enable notifications in the new app.
- [ ] Document environment variables, HTTPS requirements, outbound push service access, and VAPID key rotation.
- [ ] Document rollback steps for disabling sends and forcing re-subscription after key rotation.

## 7. Tests And Validation

- [ ] Add API tests for subscription validation, subscribe, unsubscribe, status, test send, broadcast summary, broadcast send, and authorization failures.
- [ ] Add delivery adapter tests with mocked push service responses for success, expired, auth failure, rate limit, and transient server errors.
- [ ] Add payload sanitization tests.
- [ ] Add frontend type checks and focused tests for notification settings/client helpers where the web test stack supports them.
- [ ] Add service worker smoke tests or documented manual checks for push display and click routing.
- [ ] Run `pnpm --filter api verify`.
- [ ] Run `pnpm --filter web verify`.
- [ ] Run `openspec validate add-web-push-notifications --strict`.
