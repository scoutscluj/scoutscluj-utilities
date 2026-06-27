# Tasks

## 1. Backend Foundation

- [x] Add auth/user/orgo modules to `apps/api` with configuration validation for Orgo and local session secrets.
- [x] Add MikroORM entities and migrations for users, Orgo connections, roles, timestamps, and uniqueness constraints.
- [x] Add Orgo SSO client service for request-token, success-token verification, and logout with safe error handling.
- [x] Add auth service logic for existing-user resolution, auto-provisioning, Orgo connection upsert, session issuance, current-user serialization, and logout.
- [x] Add NestJS guards/decorators for authenticated users and role-restricted handlers.
- [x] Expose Swagger/OpenAPI metadata for the auth endpoints and current-user payload.

## 2. Web Auth Flow

- [x] Add SvelteKit API/session helpers for storing and reading httpOnly local auth sessions.
- [x] Build `/login` with a "Connect with Orgo" button and redirect target preservation.
- [x] Build `/api/orgo/callback` to exchange `successToken`, establish the session, load the current user, and handle errors, with `/auth/orgo/callback` kept as a compatibility alias.
- [x] Add logout behavior that clears local session state and attempts Orgo logout when a success token is available.

## 3. App Shell And Access

- [x] Add a protected SvelteKit layout with top bar, responsive side menu, active route state, and profile/avatar menu.
- [x] Add a central route/menu registry with public, authenticated, and role-restricted route definitions.
- [x] Add route/load guards that redirect unauthenticated users to `/login` with a safe return target.
- [x] Add role-based redirects or forbidden states for users missing required roles.
- [x] Add a profile page showing current user identity, roles, Orgo connection summary, and logout access.

## 4. Verification

- [x] Add backend unit/controller tests for session signing and role guards.
- [x] Run frontend lint/typecheck/build plus browser smoke coverage for login and protected-route redirect; no dedicated web test runner exists yet.
- [x] Run `pnpm --filter api verify`.
- [x] Run `pnpm --filter web verify`.
- [x] Run root `pnpm verify` if the focused checks pass.

## 5. Deployment Notes

- [x] Document required Orgo and session environment variables.
- [x] Document how to assign or seed the first `super_admin`.
- [x] Confirm the Orgo redirect URI for each environment points to the new SvelteKit callback route.
