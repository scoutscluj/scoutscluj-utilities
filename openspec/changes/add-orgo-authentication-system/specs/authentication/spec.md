## ADDED Requirements

### Requirement: Orgo SSO Login Entry Point

The system SHALL provide Orgo SSO as the initial login method and keep Orgo client credentials server-side.

#### Scenario: Login page starts Orgo flow

- **GIVEN** an unauthenticated user opens `/login`
- **WHEN** the user selects "Connect with Orgo"
- **THEN** the web app calls the backend Orgo request-token endpoint
- **AND** the browser is redirected to the Orgo login URL returned by the backend
- **AND** Orgo app credentials are never exposed to the browser.

#### Scenario: Request token failure

- **GIVEN** Orgo is unavailable or rejects the app credentials
- **WHEN** the user selects "Connect with Orgo"
- **THEN** the backend returns a safe error response without secrets or raw upstream payloads
- **AND** the login page shows a Romanian error message and remains on `/login`.

### Requirement: Orgo SSO Callback Authentication

The system SHALL exchange Orgo success tokens for local authenticated sessions.

#### Scenario: Existing user completes Orgo login

- **GIVEN** Orgo redirects the browser to the SvelteKit callback route with a valid `successToken`
- **AND** the verified Orgo identity matches an existing user by Orgo id, card id, or normalized email
- **WHEN** the callback exchanges the token with the backend
- **THEN** the backend upserts the Orgo connection metadata
- **AND** issues a local authenticated session
- **AND** the web app redirects the user to the intended protected route or dashboard.

#### Scenario: Missing success token

- **GIVEN** Orgo redirects to the callback route without `successToken`
- **WHEN** the callback attempts to complete login
- **THEN** no local session is created
- **AND** the web app shows an authentication error.

#### Scenario: Invalid success token

- **GIVEN** Orgo rejects the supplied `successToken`
- **WHEN** the backend verifies the token
- **THEN** the backend rejects the login
- **AND** the web app clears partial auth state and shows an authentication error.

### Requirement: User Auto-Provisioning

The system SHALL create a local user automatically when a verified Orgo identity has no matching local account.

#### Scenario: New Orgo user is created locally

- **GIVEN** Orgo verification returns a valid identity that does not match any local user
- **WHEN** the backend completes signin
- **THEN** the backend creates a user record from the Orgo profile
- **AND** creates an Orgo connection linked to that user
- **AND** assigns no elevated roles by default
- **AND** issues a local authenticated session.

#### Scenario: Insufficient Orgo identity data

- **GIVEN** Orgo verification returns no stable Orgo id, card id, or email usable for local identity
- **WHEN** the backend attempts auto-provisioning
- **THEN** the backend rejects the login
- **AND** no local user is created.

#### Scenario: Ambiguous local match

- **GIVEN** Orgo verification returns identity data that matches multiple local users
- **WHEN** the backend resolves the account
- **THEN** the backend rejects the login safely
- **AND** no user records are merged automatically.

### Requirement: Local Session Management

The system SHALL maintain local authenticated sessions that can be read during SvelteKit server rendering and validated by NestJS APIs.

#### Scenario: Session is established after login

- **GIVEN** Orgo signin succeeds
- **WHEN** the backend issues the local session
- **THEN** the browser receives an httpOnly session cookie
- **AND** protected SvelteKit server loads can identify the current user without relying on localStorage.

#### Scenario: Current user is returned

- **GIVEN** a request includes a valid local session
- **WHEN** the web app or API client requests the current user endpoint
- **THEN** the response includes user identity, roles, and Orgo connection summary.

#### Scenario: Logout clears local session

- **GIVEN** an authenticated user selects logout
- **WHEN** the logout request succeeds
- **THEN** the local session cookie is cleared
- **AND** the user is redirected to `/login`.

#### Scenario: Orgo logout is attempted when possible

- **GIVEN** the browser still has the current Orgo success token for the login session
- **WHEN** the user logs out
- **THEN** the backend attempts Orgo SSO logout
- **AND** local logout still succeeds if Orgo reports the token as expired or already logged out.

### Requirement: Application Roles

The system SHALL support the roles `moderator`, `admin`, and `super_admin` for authorization decisions.

#### Scenario: Auto-provisioned user has no elevated role

- **GIVEN** a user is created through first-time Orgo login
- **WHEN** the current-user payload is returned
- **THEN** the roles list is empty.

#### Scenario: Role hierarchy is applied

- **GIVEN** a route or API action requires `moderator`
- **WHEN** a user with `admin` or `super_admin` accesses it
- **THEN** access is allowed.

#### Scenario: Admin role includes moderator capabilities

- **GIVEN** a route or API action requires `admin`
- **WHEN** a user with only `moderator` accesses it
- **THEN** access is denied.

#### Scenario: Super admin role is highest privilege

- **GIVEN** a route or API action requires `super_admin`
- **WHEN** a user with only `admin` or `moderator` accesses it
- **THEN** access is denied.

### Requirement: API Authorization Enforcement

The API SHALL enforce authentication and role restrictions independently from the frontend.

#### Scenario: Missing session on protected API

- **WHEN** a request without a valid local session calls a protected API endpoint
- **THEN** the API responds with `401`.

#### Scenario: Missing role on restricted API

- **GIVEN** an authenticated user lacks a required role
- **WHEN** the user calls a role-restricted API endpoint
- **THEN** the API responds with `403`.

#### Scenario: Authorized API access

- **GIVEN** an authenticated user has the required role
- **WHEN** the user calls a role-restricted API endpoint
- **THEN** the API processes the request.
