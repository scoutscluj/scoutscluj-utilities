# Design: Add Orgo Authentication System

## Context

The target architecture keeps external integrations and persistence in NestJS while SvelteKit owns UI and routing. The legacy app uses Firebase Auth custom claims (`isModerator`, `isAdmin`, `isSuperAdmin`) and a protected layout with a side drawer plus profile menu. The contingent-management app already has a working Orgo SSO pattern:

- `POST /auth/orgo/request-token` exchanges app credentials for a request token and returns an Orgo login URL.
- Orgo redirects back with `successToken`.
- `POST /auth/orgo/signin` verifies the success token, resolves or creates the local user, upserts an Orgo connection record, and returns a local access token.

This proposal adapts that flow to SvelteKit and keeps the API as the authority for identity, roles, and session validity.

## Goals

- Use Orgo SSO as the single initial login path.
- Auto-provision local users when Orgo verification succeeds and no local user exists.
- Persist enough identity data to render the app shell, profile, and future audit/debug surfaces.
- Enforce authorization at the API boundary and mirror it in SvelteKit navigation/route guards.
- Avoid copying Firebase-specific architecture or migrating legacy user data in this change.

## Non-Goals

- Migrating existing Firebase accounts, Firestore documents, or custom claims.
- Building a full role administration workflow.
- Persisting Orgo success tokens long term unless a later Orgo integration proposal requires it.
- Implementing direct Orgo username/password authentication.

## Data Model

### `users`

Suggested fields:

- `id`: UUID or numeric primary key, following the repository's migration conventions at implementation time.
- `email`: normalized lowercase email from Orgo, nullable only if Orgo does not return one.
- `display_name`: derived from Orgo first/last name.
- `first_name`, `last_name`: nullable profile fields from Orgo.
- `avatar_url`: nullable Orgo profile image URL.
- `roles`: enum array containing zero or more of `moderator`, `admin`, `super_admin`.
- `created_at`, `updated_at`, `last_login_at`.

Constraints:

- Unique normalized email when present.
- Roles default to an empty array for auto-provisioned users.

### `orgo_connections`

Suggested fields:

- `id`: primary key.
- `user_id`: unique foreign key to `users`.
- `orgo_user_id`: numeric Orgo profile id when present.
- `card_id`: Orgo card/member id when present.
- `email`: normalized Orgo email when present.
- `profile`: JSON profile snapshot from Orgo verification.
- `connected_at`, `last_login_at`, `updated_at`.

Constraints:

- Unique `user_id`.
- Unique `orgo_user_id` when present.
- Unique `card_id` when present.
- Indexed `email`.

The success token SHOULD be kept only in the browser session for Orgo logout during the current login session. It SHOULD NOT be stored in Postgres as part of this auth slice.

## Backend Flow

### Start Login

`POST /api/auth/orgo/request-token`:

1. Reads `ORGO_OAUTH_BASE_URL`, `ORGO_OAUTH_CLIENT_ID`, and `ORGO_OAUTH_CLIENT_SECRET`.
2. Calls `/api/v1/request-token-sso` on Orgo.
3. Returns `{ request_token, redirect_url }`.
4. Never exposes app secrets or raw upstream error bodies.

### Complete Login

`POST /api/auth/orgo/signin` accepts `{ successToken }`:

1. Validates the token is present.
2. Calls Orgo `/api/v1/verify-success-token-sso`.
3. Resolves an existing user by Orgo id/card id first, then normalized email.
4. Creates a new user if no match exists and the Orgo profile has enough identity data.
5. Upserts `orgo_connections`.
6. Sets/returns the local session. The implementation may use an httpOnly cookie directly, or return an access token plus a SvelteKit route that sets the cookie, but protected server rendering MUST be able to authenticate without localStorage.

Auto-provisioned users receive no elevated roles.

### Current User

`GET /api/auth/me` or `GET /api/users/me` returns:

- Stable user id.
- Display name, email, avatar/profile fields.
- Roles.
- Orgo connection summary.

### Logout

`POST /api/auth/logout` clears the local session. If the caller includes the current Orgo success token, the API attempts `/api/v1/logout-sso?successToken=...` and treats expired/already-logged-out upstream responses as local logout success.

## Authorization Model

Roles are application roles, not Orgo roles. The first implementation supports:

- `moderator`
- `admin`
- `super_admin`

Role hierarchy:

- `super_admin` includes `admin` and `moderator` capabilities.
- `admin` includes `moderator` capabilities.
- `moderator` only includes moderator capabilities.

NestJS guards/decorators SHOULD support both "has any role" and "has at least role" checks so future modules can choose precise access rules.

SvelteKit route metadata or a central route registry SHOULD define:

- Public routes: `/login`, `/api/orgo/callback`, `/auth/orgo/callback`, health/static assets.
- Authenticated routes: dashboard, profile, and migrated feature pages.
- Role-restricted routes: admin routes and future privileged workflows.

Frontend checks hide inaccessible navigation and redirect users early, but the API remains authoritative.

## Frontend Flow

### Login Page

`/login` renders a focused login page with a single primary button labeled "Connect with Orgo". When selected, it stores a validated redirect target if present, calls the request-token endpoint, and redirects the browser to Orgo.

### Callback Page

`/api/orgo/callback` reads `successToken`, exchanges it with the API, establishes the local session, loads the current user, and redirects to the intended protected route or the dashboard. `/auth/orgo/callback` remains a compatibility alias. Failures clear partial auth state and show a Romanian user-facing error.

### App Shell

Protected routes render a SvelteKit layout adapted from the legacy app:

- Top app bar with mobile menu toggle.
- Responsive side menu.
- Active route highlighting.
- Profile/avatar menu with user name, profile link, and logout.
- Role-filtered menu entries.

The initial menu should mirror the old structure where relevant to the new app:

- Dashboard
- Info
- Sediu
- Financiar
- Micro-stagii
- Parteneri
- Profil
- Admin, visible only to moderator/admin/super_admin with sub-items filtered by role

Only routes available in the new app should be clickable unless an implementation intentionally adds disabled placeholders.

### Profile

`/profile` or `/user` shows current user identity, roles, Orgo connection state, last login/connection freshness, and logout access. Profile content should use Romanian copy where the legacy app already did.

## Environment

Required API variables:

- `ORGO_OAUTH_BASE_URL`
- `ORGO_OAUTH_CLIENT_ID`
- `ORGO_OAUTH_CLIENT_SECRET`
- local session/JWT secret, named by the implementation consistently with NestJS config conventions

Required web variables:

- API base URL if not already provided by existing scaffold.

## Security Considerations

- Use httpOnly, secure, SameSite cookies for local auth sessions.
- Validate callback redirect targets against local relative paths to prevent open redirects.
- Keep Orgo client secret server-side only.
- Do not log success tokens, client secrets, or full upstream payloads containing sensitive data.
- Normalize emails before matching.
- Handle duplicate matches deterministically by failing closed and surfacing an admin-readable error.
- Ensure role checks happen in NestJS, not only in SvelteKit.

## Testing

Backend:

- Auth service tests for request-token handling, success-token verification, user resolution, auto-provisioning, duplicate-match failures, role serialization, and logout.
- Controller tests for public auth endpoints and guarded current-user/role-restricted endpoints.
- Migration checks for uniqueness constraints.

Frontend:

- SvelteKit typecheck.
- Unit tests or route/load tests for redirect target validation, login start, callback success/failure, session loading, menu filtering, and protected route redirects once a web test runner is selected.

Manual:

- Orgo sandbox/local OAuth happy path.
- New user auto-provision path.
- Existing user login path.
- Logout path.
- Moderator/admin/super_admin menu visibility and restricted route behavior.

## Rollout And Rollback

Rollout:

1. Add migrations and auth implementation behind required environment variables.
2. Seed or manually assign the first `super_admin` in local/deployed environments.
3. Verify Orgo OAuth redirect URI is configured to the Svelte callback route.
4. Enable protected app routes after the login flow is verified.

Rollback:

- Revert the feature deployment to restore the previous unauthenticated scaffold.
- Keep database migrations reversible where practical; if user data exists, rollback should disable the auth routes rather than dropping production identity data without explicit approval.
