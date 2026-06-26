# Tasks

## 1. API Role Administration

- [x] Add user list DTOs that expose admin-safe identity, roles, Orgo connection hints, and timestamps.
- [x] Add a guarded `GET /users` or `GET /admin/users` endpoint restricted to `super_admin`.
- [x] Add a guarded role update endpoint restricted to `super_admin`.
- [x] Validate requested roles against the server `UserRole` enum and reject unknown role values.
- [x] Normalize role arrays to avoid duplicates and deterministic ordering.
- [x] Ensure role updates flush persistence and return the updated admin-safe user payload.

## 2. Web Admin Users Page

- [x] Add `/admin/users` route guarded by `super_admin`.
- [x] Enable the `Admin > Utilizatori` menu item for users who can access the page.
- [x] Render a scan-friendly user list with display name, email, Orgo/card hint, current roles, and last login.
- [x] Add per-user role controls for `moderator`, `admin`, `finance_manager`, and `super_admin`.
- [x] Submit role changes through SvelteKit server actions or server-side API helpers without exposing API internals to the browser.
- [x] Show success and validation/error states in Romanian.
- [x] Refresh local current-user data when the signed-in user's roles change.

## 3. Tests And Validation

- [x] Add API tests for unauthorized, non-super-admin, and super-admin access to user listing.
- [x] Add API tests for role update success, invalid roles, duplicate roles, and missing target user.
- [x] Add API tests covering self-demotion or document the chosen self-demotion behavior.
- [x] Add SvelteKit type checks for the new route and server action.
- [x] Run `pnpm --filter api verify`.
- [x] Run `pnpm --filter web verify`.
- [x] Run `openspec validate add-user-role-management --strict`.
