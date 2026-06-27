# app-shell Specification

## Purpose
TBD - created by archiving change add-orgo-authentication-system. Update Purpose after archive.
## Requirements
### Requirement: Protected SvelteKit Routes

The web app SHALL protect authenticated routes and preserve safe intended destinations during login redirects.

#### Scenario: Unauthenticated user opens protected route

- **GIVEN** a user has no valid local session
- **WHEN** the user opens a protected route
- **THEN** SvelteKit redirects to `/login`
- **AND** includes a safe relative return target.

#### Scenario: Authenticated user opens protected route

- **GIVEN** a user has a valid local session
- **WHEN** the user opens a protected route
- **THEN** SvelteKit loads the current-user payload
- **AND** renders the protected route.

#### Scenario: Unsafe return target is ignored

- **GIVEN** a login redirect contains an absolute external URL as the return target
- **WHEN** login completes
- **THEN** the web app ignores the unsafe target
- **AND** redirects to the dashboard.

### Requirement: Role-Restricted SvelteKit Routes

The web app SHALL restrict role-gated routes using the current-user roles returned by the API.

#### Scenario: User lacks route role

- **GIVEN** an authenticated user lacks the role required by a route
- **WHEN** the user opens that route directly
- **THEN** SvelteKit redirects to an allowed route or renders a forbidden state.

#### Scenario: User has route role

- **GIVEN** an authenticated user has the role required by a route
- **WHEN** the user opens that route
- **THEN** SvelteKit renders the route.

### Requirement: Authenticated App Shell

The web app SHALL provide an authenticated shell adapted from the legacy side menu, top bar, and profile menu.

#### Scenario: Desktop shell

- **GIVEN** an authenticated user opens the app on a desktop viewport
- **WHEN** a protected route renders
- **THEN** the layout shows a persistent side menu
- **AND** a top bar with the product name and profile/avatar menu
- **AND** the active route is visually indicated.

#### Scenario: Mobile shell

- **GIVEN** an authenticated user opens the app on a mobile viewport
- **WHEN** a protected route renders
- **THEN** the side menu is available through a menu button
- **AND** selecting a menu item closes the mobile menu.

#### Scenario: Profile menu logout

- **GIVEN** an authenticated user opens the profile/avatar menu
- **WHEN** the user selects logout
- **THEN** the web app runs the logout flow
- **AND** returns the user to `/login`.

### Requirement: Role-Aware Side Menu

The side menu SHALL render entries according to the current user's roles and the routes available in the SvelteKit app.

#### Scenario: Regular authenticated user menu

- **GIVEN** an authenticated user has no elevated roles
- **WHEN** the side menu renders
- **THEN** general authenticated entries are visible
- **AND** admin-only entries are hidden.

#### Scenario: Moderator menu

- **GIVEN** an authenticated user has `moderator`
- **WHEN** the side menu renders
- **THEN** moderator-accessible admin entries are visible
- **AND** admin-only and super-admin-only entries remain hidden.

#### Scenario: Admin menu

- **GIVEN** an authenticated user has `admin`
- **WHEN** the side menu renders
- **THEN** admin and moderator entries are visible
- **AND** super-admin-only entries remain hidden.

#### Scenario: Super admin menu

- **GIVEN** an authenticated user has `super_admin`
- **WHEN** the side menu renders
- **THEN** all admin, moderator, and super-admin entries are visible.

#### Scenario: Unimplemented route handling

- **GIVEN** a legacy menu target has not been migrated to the new SvelteKit app
- **WHEN** the side menu renders
- **THEN** the target is hidden or clearly disabled
- **AND** it does not navigate to a broken route.

### Requirement: User Profile Surface

The web app SHALL provide a profile page or profile section for current-user identity, roles, and Orgo connection state.

#### Scenario: Profile displays identity

- **GIVEN** an authenticated user opens the profile page
- **WHEN** the current-user payload loads
- **THEN** the page shows the user's display name, email when available, avatar when available, and roles.

#### Scenario: Profile displays Orgo connection

- **GIVEN** an authenticated user has an Orgo connection
- **WHEN** the profile page renders
- **THEN** it shows the Orgo connection status, card id or Orgo id when available, and last login or verification timestamp.

#### Scenario: Profile handles missing Orgo details

- **GIVEN** an authenticated user has no complete Orgo profile fields
- **WHEN** the profile page renders
- **THEN** the page still renders without broken labels or empty required UI.

