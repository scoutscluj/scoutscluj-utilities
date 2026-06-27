# user-management Specification

## Purpose
TBD - created by archiving change add-user-role-management. Update Purpose after archive.
## Requirements
### Requirement: Super Admin User Listing

The system SHALL provide a super-admin-only view of existing local users.

#### Scenario: Super admin lists users

- **GIVEN** an authenticated user has `super_admin`
- **WHEN** they open the user administration page
- **THEN** the system lists existing local users
- **AND** each user row includes admin-safe identity fields, current roles, Orgo connection hints when available, created timestamp, and last login timestamp when available.

#### Scenario: Admin without super-admin access lists users

- **GIVEN** an authenticated user has `admin` but not `super_admin`
- **WHEN** they request the user administration page or API
- **THEN** the system denies access.

#### Scenario: Unauthenticated user lists users

- **WHEN** a request without a valid local session targets the user administration page or API
- **THEN** the system redirects to login or returns `401`, according to the surface being requested.

### Requirement: User Role Updates

The system SHALL let super admins update the application roles assigned to an existing user.

#### Scenario: Super admin changes a user's roles

- **GIVEN** an authenticated user has `super_admin`
- **AND** another local user exists
- **WHEN** the super admin submits a role change for that user
- **THEN** the system stores the new role set
- **AND** returns the updated user payload
- **AND** subsequent current-user and authorization checks use the new role set.

#### Scenario: Non-super-admin changes roles

- **GIVEN** an authenticated user does not have `super_admin`
- **WHEN** they attempt to change any user's roles
- **THEN** the API responds with `403`
- **AND** no roles are changed.

#### Scenario: Invalid role payload

- **GIVEN** a super admin submits roles containing an unsupported role value
- **WHEN** the API validates the request
- **THEN** the API rejects the request
- **AND** no roles are changed.

#### Scenario: Duplicate roles are submitted

- **GIVEN** a super admin submits the same valid role more than once
- **WHEN** the API processes the request
- **THEN** the stored role set contains each role at most once.

#### Scenario: Target user does not exist

- **GIVEN** a super admin submits a role change for a missing user id
- **WHEN** the API processes the request
- **THEN** the API responds with `404`.

#### Scenario: Super admin changes their own roles

- **GIVEN** a super admin is signed in
- **WHEN** they change their own roles
- **THEN** the system applies the new role set
- **AND** subsequent current-user data and authorization checks use the new roles.

### Requirement: Admin Users Navigation

The web app SHALL expose user role management under the Admin navigation group.

#### Scenario: Super admin sees users navigation

- **GIVEN** an authenticated user has `super_admin`
- **WHEN** the side menu renders
- **THEN** the Admin group includes an enabled `Utilizatori` link to `/admin/users`.

#### Scenario: Admin without super-admin access does not see enabled users navigation

- **GIVEN** an authenticated user has `admin` but not `super_admin`
- **WHEN** the side menu renders
- **THEN** the `Utilizatori` role management route is hidden or disabled.

### Requirement: Role Management Feedback

The web app SHALL provide clear feedback for role management actions.

#### Scenario: Role update succeeds

- **GIVEN** a super admin changes a user's roles from the web page
- **WHEN** the update succeeds
- **THEN** the page shows the updated roles without requiring a full browser refresh
- **AND** displays a Romanian success message.

#### Scenario: Role update fails validation

- **GIVEN** a role update request fails validation or authorization
- **WHEN** the web page receives the failure
- **THEN** the page preserves the existing stored roles
- **AND** displays a Romanian error message.

