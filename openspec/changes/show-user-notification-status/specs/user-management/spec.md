## MODIFIED Requirements

### Requirement: Super Admin User Listing

The system SHALL provide a super-admin-only view of existing local users.

#### Scenario: Super admin lists users

- **GIVEN** an authenticated user has `super_admin`
- **WHEN** they open the user administration page
- **THEN** the system lists existing local users
- **AND** each user row includes admin-safe identity fields, current roles, Orgo connection hints when available, created timestamp, last login timestamp when available, and whether the user has at least one active push notification subscription.

#### Scenario: User notification status is enabled

- **GIVEN** an existing local user has at least one active push subscription
- **WHEN** a super admin opens the user administration page
- **THEN** that user is shown with notifications enabled.

#### Scenario: User notification status is disabled

- **GIVEN** an existing local user has no active push subscriptions
- **WHEN** a super admin opens the user administration page
- **THEN** that user is shown with notifications disabled.

#### Scenario: Admin without super-admin access lists users

- **GIVEN** an authenticated user has `admin` but not `super_admin`
- **WHEN** they request the user administration page or API
- **THEN** the system denies access.

#### Scenario: Unauthenticated user lists users

- **WHEN** a request without a valid local session targets the user administration page or API
- **THEN** the system redirects to login or returns `401`, according to the surface being requested.
