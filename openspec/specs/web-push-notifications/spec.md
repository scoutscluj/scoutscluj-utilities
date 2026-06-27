# web-push-notifications Specification

## Purpose
TBD - created by archiving change add-web-push-notifications. Update Purpose after archive.
## Requirements
### Requirement: VAPID Web Push Configuration

The system SHALL use standards-based Web Push with VAPID keys managed by the
backend.

#### Scenario: API validates VAPID configuration

- **GIVEN** the API starts in an environment where notifications are enabled
- **WHEN** the notification module initializes
- **THEN** it validates that the VAPID public key, private key, and subject are configured
- **AND** rejects malformed keys before sending notifications
- **AND** never exposes the VAPID private key to browser code.

#### Scenario: Web app obtains public push configuration

- **GIVEN** a signed-in user opens notification settings
- **WHEN** the web client needs to create a PushSubscription
- **THEN** it can obtain the VAPID public key from safe public configuration
- **AND** the public key matches the key used by the API delivery service.

### Requirement: Push Subscription Lifecycle

The system SHALL let authenticated users manage Web Push subscriptions for one
or more browser devices.

#### Scenario: User subscribes current device

- **GIVEN** an authenticated user has a browser that supports Service Workers, PushManager, and Notifications
- **AND** the user grants notification permission from an explicit user action
- **WHEN** the browser creates a PushSubscription and submits it to the API
- **THEN** the API stores an active subscription for the authenticated user and device
- **AND** deduplicates by subscription endpoint
- **AND** returns subscription status without exposing raw subscription secrets.

#### Scenario: User has multiple active devices

- **GIVEN** a user already has an active subscription on one device
- **WHEN** they subscribe from a second supported browser or device
- **THEN** both subscriptions remain active for that user
- **AND** future sends to that user target all eligible active subscriptions.

#### Scenario: User unsubscribes current device

- **GIVEN** an authenticated user has an active subscription for the current device
- **WHEN** they disable notifications for this device
- **THEN** the web client attempts to unsubscribe through the Push API
- **AND** the API marks that device subscription inactive
- **AND** other active devices for the same user remain subscribed.

#### Scenario: User unsubscribes all devices

- **GIVEN** an authenticated user has one or more active subscriptions
- **WHEN** they choose to disable notifications on all devices
- **THEN** the API marks all of their active subscriptions inactive
- **AND** the user is excluded from future sends until they subscribe again.

#### Scenario: Unsupported browser opens settings

- **GIVEN** a browser does not support the required Web Push APIs
- **WHEN** the user opens notification settings
- **THEN** the web app shows a Romanian unsupported-state message
- **AND** does not call browser permission or subscription APIs.

### Requirement: Permission And Subscription UX

The web app SHALL provide explicit, user-controlled notification permission and
subscription controls.

#### Scenario: Permission request is user initiated

- **GIVEN** a user's notification permission is `default`
- **WHEN** the user selects the enable-notifications control
- **THEN** the web app calls `Notification.requestPermission()` in response to that action
- **AND** it does not show the browser permission prompt automatically on first page load.

#### Scenario: Permission is denied

- **GIVEN** the browser reports notification permission as `denied`
- **WHEN** the user opens notification settings
- **THEN** the web app explains in Romanian that permission must be changed in browser or OS settings
- **AND** disables subscription actions that cannot succeed programmatically.

### Requirement: Notification Delivery

The system SHALL send Web Push notifications to eligible active subscriptions
and record delivery outcomes.

#### Scenario: Test notification targets current user

- **GIVEN** an authenticated user has active subscriptions
- **WHEN** they request a test notification
- **THEN** the API sends a Romanian test notification to their eligible active devices
- **AND** returns counts for successful and failed delivery attempts.

#### Scenario: Super admin broadcasts an announcement

- **GIVEN** an authenticated user has `super_admin`
- **WHEN** they submit a broadcast with a valid title and body
- **THEN** the API sends the notification to eligible active subscribers
- **AND** records the sender, targeting summary, message content, and per-device delivery outcomes
- **AND** returns a summarized delivery result.

#### Scenario: Non-super-admin attempts broadcast

- **GIVEN** an authenticated user does not have `super_admin`
- **WHEN** they attempt to send a broadcast notification
- **THEN** the API responds with `403`
- **AND** no notification message or delivery attempts are created.

### Requirement: Delivery Error Handling

The system SHALL handle expired, invalid, and transient push delivery failures
without breaking the overall send operation.

#### Scenario: Subscription is expired

- **GIVEN** a push service returns an expired or gone response for a subscription
- **WHEN** the delivery service processes the result
- **THEN** it marks that subscription inactive
- **AND** records an expired delivery log entry
- **AND** continues sending to other eligible subscriptions.

#### Scenario: Push service reports transient failure

- **GIVEN** a push service returns a rate-limit or temporary server error
- **WHEN** retry budget remains
- **THEN** the delivery service retries with bounded backoff
- **AND** records retry attempts and final outcome.

#### Scenario: VAPID authorization fails

- **GIVEN** a push service rejects a send due to VAPID authorization or key mismatch
- **WHEN** the delivery service processes the result
- **THEN** it records a sanitized error
- **AND** marks affected subscriptions inactive when re-subscription is required
- **AND** does not expose private key material in logs or responses.

### Requirement: Service Worker Notification Handling

The PWA service worker SHALL receive push events, display notifications, and
route notification clicks safely.

#### Scenario: Push event contains valid notification data

- **GIVEN** the service worker receives a push event with a valid JSON payload
- **WHEN** the payload includes notification title, body, icon, badge, data, and actions
- **THEN** the service worker displays the notification using the provided safe values
- **AND** applies default ScoutsCluj icon and badge values when optional values are missing.

#### Scenario: Push payload is malformed

- **GIVEN** the service worker receives a push event with missing or malformed payload data
- **WHEN** it handles the event
- **THEN** it displays a generic ScoutsCluj notification
- **AND** does not throw an unhandled error.

#### Scenario: User clicks notification with protected route

- **GIVEN** a displayed notification contains a relative same-origin app route
- **WHEN** the user clicks the notification or the view action
- **THEN** the service worker closes the notification
- **AND** focuses an existing app client or opens a new app window
- **AND** navigates only to the validated same-origin route.

#### Scenario: Notification contains unsafe route

- **GIVEN** a notification payload contains an absolute external URL or invalid route
- **WHEN** the user clicks the notification
- **THEN** the service worker ignores the unsafe target
- **AND** opens or focuses the app default route instead.

### Requirement: Notification Administration

The web app SHALL provide a super-admin-only notification administration
surface.

#### Scenario: Super admin views broadcast summary

- **GIVEN** an authenticated user has `super_admin`
- **WHEN** they open the notification administration page
- **THEN** the page shows active subscriber and device counts
- **AND** provides a broadcast compose form.

#### Scenario: Broadcast form validates content

- **GIVEN** a super admin is composing a broadcast
- **WHEN** title or body is missing, too long, or contains an invalid route target
- **THEN** the web app prevents submission
- **AND** shows a Romanian validation message.

#### Scenario: Unauthorized user opens admin page

- **GIVEN** an authenticated user does not have `super_admin`
- **WHEN** they request the notification administration page
- **THEN** the web app denies access or redirects according to the app shell authorization pattern.

### Requirement: Legacy Notification Re-Subscription

The system SHALL require users to re-subscribe to notifications in the new app
instead of importing legacy Firestore notification subscriptions.

#### Scenario: Legacy subscription data is not imported

- **GIVEN** legacy Firestore contains notification subscription documents
- **WHEN** the new notification feature rolls out
- **THEN** the system does not import those subscriptions into Postgres
- **AND** no notification is delivered to a user until they subscribe in the new app.

#### Scenario: User re-subscribes in the new app

- **GIVEN** a user previously enabled notifications in the legacy app
- **WHEN** they open notification settings in the new app
- **THEN** the web app explains in Romanian that notifications must be enabled again
- **AND** subscribing creates a new Postgres-backed PushSubscription for the new app.

