# Change: Show Notification Status In User Administration

## Why

Super admins currently cannot tell from the user administration list which
users can receive push notifications. This makes it harder to diagnose missing
notifications and understand broadcast reach.

## What Changes

- Include an account-level notification-enabled indicator in admin user payloads.
- Treat a user as enabled when they have at least one active push subscription.
- Show the indicator in the admin users table.

## Impact

- Affected specs: `user-management`.
- Affected app areas: API users module and admin users page.
- Affected data: read-only access to existing push subscriptions; no migration.
