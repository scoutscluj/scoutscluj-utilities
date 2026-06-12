# Change: Add Orgo Authentication System

## Why

The new Scouts Cluj Utilities monorepo needs a first platform slice that lets real users sign in before migrated modules are exposed. The legacy application authenticates through Firebase and then enriches the session with roles, navigation, profile, and Orgo connection data. The new architecture should replace that with a NestJS-owned auth boundary, Postgres persistence, and SvelteKit route protection.

This change implements Orgo SSO as the only initial login method: users land on `/login`, choose "Connect with Orgo", complete the Orgo OAuth flow, and return authenticated. If the Orgo account does not match an existing local account, the API creates one automatically.

## What Changes

- Add backend auth modules for Orgo SSO request-token, callback token verification, session issuance, logout, and current-user lookup.
- Add Postgres/MikroORM persistence for users, Orgo identity links, and roles.
- Add roles `moderator`, `admin`, and `super_admin`, exposed in session/user payloads and enforced by backend guards.
- Add SvelteKit login, callback, protected layout, side menu, user profile menu, logout, and route restriction behavior adapted from the legacy app.
- Add OpenAPI documentation and focused backend/frontend verification for the auth surface.

## Out Of Scope

- Legacy Firebase user or Firestore data migration.
- Username/password login.
- Full Orgo data modules such as fee history, unit/member retrieval, discussions, or token refresh outside what auth needs.
- Admin UI for editing roles beyond the minimum API/admin-safe seed path needed for development.
- Migrating every legacy menu target. Missing routes may be hidden or represented as disabled placeholders only when useful.

## Impact

- Introduces security-sensitive API endpoints and cookie/session handling.
- Adds database migrations that establish the first user tables.
- Establishes the shared frontend app shell that future feature proposals will extend.
- Requires Orgo OAuth environment variables in local and deployed environments.
