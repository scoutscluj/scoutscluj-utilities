# Change: Add User Role Management

## Why

The new app already persists local users, assigns application roles, exposes role-aware navigation, and includes a disabled `Admin > Utilizatori` menu entry. Today, role changes still require database access or seed scripts, which makes routine administration slow and risky once more users sign in through Orgo.

Super administrators need a guarded UI to review existing users and change their application roles without direct database access.

## What Changes

- Add a super-admin-only API surface for listing users and updating user roles.
- Add a guarded SvelteKit page at `/admin/users`, linked from the Admin menu as `Utilizatori`.
- Show each user's identity, Orgo connection hints, current roles, and relevant timestamps.
- Allow super admins to change roles from the supported role set: `moderator`, `admin`, `finance_manager`, and `super_admin`.
- Refresh the current session user after role changes that affect the signed-in user.
- Add backend and frontend validation so unauthorized users cannot view or change roles.
- Add focused tests for role listing, role update authorization, invalid roles, and privilege-sensitive updates.

## Out Of Scope

- Creating users manually outside Orgo auto-provisioning.
- Deleting, disabling, or merging users.
- Editing profile identity fields sourced from Orgo.
- Full audit-log browsing UI, unless an audit trail already exists and can be reused cheaply.
- Bulk role assignment.

## Impact

- Affected specs: `user-management` (new)
- Affected app areas: API users module, auth role guards, web admin routes, role-aware menu.
- Affected data: existing `users.roles` values only; no new table is required unless implementation chooses an audit model.
- Security impact: high. Only `super_admin` should assign elevated roles, the API must enforce authorization independently of the frontend, and role payloads must be validated against the server role enum.
