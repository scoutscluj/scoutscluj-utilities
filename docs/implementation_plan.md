# Implementation Plan

This document is a working plan for migrating the legacy `utilities-scouts-cluj`
application into this new pnpm monorepo. It is written for future agents: the
next step is not to implement features directly, but to create OpenSpec
proposals that describe and approve each major capability before code is
written.

## Operating Rules

Before starting any proposal, the agent must:

1. Read `openspec/AGENTS.md` and `openspec/project.md` in this repository.
2. Inspect the matching legacy implementation in
   `/Users/florin/Projects/scouts/utilities-scouts-cluj`.
3. Inspect any relevant legacy OpenSpec specs or changes under the legacy
   repository's `openspec/` directory.
4. Create a focused OpenSpec change with:
   - `proposal.md`
   - `tasks.md`
   - `design.md` when data model, auth, integration, migration, or deployment
     decisions are involved
   - spec deltas under `openspec/changes/<change-id>/specs/.../spec.md`
5. Run `openspec validate <change-id> --strict`.
6. Wait for proposal approval before implementing.

The legacy app is the behavioral source of truth. The new app should not copy
its technical architecture when the proposed stack gives a cleaner boundary.

## Current Scaffold

The new repository currently provides:

- pnpm workspace monorepo.
- NestJS API app in `apps/api`.
- MikroORM configured for PostgreSQL.
- SvelteKit web app in `apps/web`.
- Health endpoint at `GET http://localhost:3000/api/health`.
- SvelteKit health check against `PUBLIC_API_BASE_URL/api/health`.
- OpenSpec initialized in `openspec/`.
- Docker Compose PostgreSQL service expected at
  `postgresql://postgres:postgres@localhost:5432/scoutscluj_utilities`.

The intended target architecture is:

- PostgreSQL as the source of truth.
- NestJS owns business logic, persistence, integrations, authorization, and
  external API calls.
- SvelteKit owns UI, routing, interaction state, and calls the NestJS API.
- MikroORM owns entities, migrations, repositories, and unit-of-work behavior.
- The web app must not call PostgreSQL, Firebase, Orgo, or notification services
  directly.
- API contracts should be documented through Swagger/OpenAPI as features are
  added.

## Migration Principles

- Preserve behavior first, then improve structure.
- Keep Romanian copy and terminology unless a proposal explicitly changes it.
- Prefer explicit PostgreSQL migrations over implicit schema changes.
- Preserve legacy identifiers where useful for migration and reconciliation.
- Move Firebase and Firestore access behind backend migration/import code.
- Treat Orgo, web push, file storage, and authentication as integrations with
  clear adapters.
- Add permissions at the API boundary, not only in the frontend.
- Each proposal must define tests, migration handling, and rollback/deployment
  notes appropriate to its risk.

## Legacy Capability Inventory

Use this inventory to decide proposal scope. Each item includes the main legacy
references to inspect before writing the related proposal.

### Platform, Auth, Users, And Roles

Legacy references:

- `src/lib/firebase.ts`
- `src/lib/auth-context.tsx`
- `src/lib/user-utils.ts`
- `src/app/api/session/route.ts`
- `functions/src/index.ts`
- `app/organigrama/page.tsx`
- legacy OpenSpec: `openspec/specs/frontend-platform`

Behavior to capture:

- Firebase Authentication currently provides identity.
- Custom claims are used for roles including admin, moderator, council, and
  super admin.
- A session cookie is created through `/api/session`.
- Cloud Functions administer users and role claims.
- Several frontend paths depend on the current user's role and claims.

### App Shell, Dashboard, Profile, And Navigation

Legacy references:

- `app/layout.tsx`
- `src/components/navigation.tsx`
- `src/components/app-sidebar.tsx`
- `app/page.tsx`
- `app/dashboard/page.tsx`
- `app/user/page.tsx`
- `src/lib/pwa-context.tsx`

Behavior to capture:

- Auth-aware navigation.
- Dashboard and user profile surface.
- Shared layout and route protection.
- Role-gated menu entries and actions.

### Inventory Management

Legacy references:

- `app/inventar/page.tsx`
- `src/lib/inventory-utils.ts`
- `src/components/item-details-sheet.tsx`
- legacy OpenSpec: `openspec/specs/hq-inventory-table`

Behavior to capture:

- Inventory items stored in Firestore collection `inventoryItems`.
- Firebase Storage-backed images.
- Filtering, sorting, item details, and item administration.
- Permission-sensitive editing.

### Financial Transactions And MT940 Analysis

Legacy references:

- `app/buget/page.tsx`
- `app/buget/mt940/page.tsx`
- `src/lib/mt940-parser.ts`
- `src/lib/transaction-categorization.ts`
- `src/lib/transaction-normalization.ts`
- `src/components/transaction-category-manager.tsx`
- `src/components/transaction-statistics.tsx`
- `src/components/mt940-import-section.tsx`
- legacy active change:
  `openspec/changes/add-mt940-transaction-analysis`

Behavior to capture:

- Firestore collections `financialTransactions` and `transactionCategories`.
- CSV and MT940 import flows.
- Automatic categorization and manual category management.
- Transaction statistics and budget views.
- Import idempotency and duplicate handling.

### Trainings

Legacy references:

- `app/stagii/page.tsx`
- Firestore collection `trainings`

Behavior to capture:

- Training listing and administration.
- Permission-sensitive actions.
- Any date, status, participant, or organizer data currently stored in Firestore.

### Units, Meetings, And Orgo Unit Data

Legacy references:

- `app/unitati/page.tsx`
- `app/api/unit-meetings/route.ts`
- `app/api/orgo/units/route.ts`
- `src/lib/orgo-api.ts`
- legacy OpenSpec: `openspec/specs/units-management`

Behavior to capture:

- Orgo unit/member count retrieval.
- Firestore collection `unitMeetings`.
- Unit meeting CRUD.
- Role-gated visibility and administrative workflows.

### Orgo Integration

Legacy references:

- `app/api/orgo/request-token/route.ts`
- `app/api/orgo/callback/route.ts`
- `app/api/orgo/refresh/route.ts`
- `app/api/orgo/logout/route.ts`
- `app/api/orgo/login-check/route.ts`
- `app/api/orgo/fee-history/route.ts`
- `app/api/orgo/discussions/route.ts`
- `src/lib/orgo-api.ts`
- legacy OpenSpec: `openspec/specs/orgo-integration`

Behavior to capture:

- Orgo authentication and token refresh.
- Login status checks.
- Fee history retrieval.
- Units and discussions retrieval.
- Storage of Orgo connection state currently tied to Firestore.

### Web Push Notifications

Legacy references:

- `app/api/notifications/subscribe/route.ts`
- `app/api/notifications/unsubscribe/route.ts`
- `app/api/notifications/send/route.ts`
- `app/api/notifications/test/route.ts`
- `app/api/notifications/broadcast/route.ts`
- `src/lib/notifications.ts`
- Firestore collections `notifications`, `devices`, and `notification_logs`
- legacy OpenSpec: `openspec/specs/web-push-notifications`

Behavior to capture:

- Browser push subscription lifecycle.
- Device subscription persistence.
- Test, direct, and broadcast notification flows.
- Notification logs.
- Permission and role requirements for sending notifications.

### PWA And Offline Support

Legacy references:

- `public/manifest.json`
- `public/sw.js`
- `src/lib/pwa-context.tsx`
- `src/components/pwa-install-prompt.tsx`
- legacy OpenSpec: `openspec/specs/pwa-support`

Behavior to capture:

- Install prompt behavior.
- Service worker registration.
- Offline/cache behavior.
- Update detection and user prompting.

### Documents, PDF Viewer, Info, Tasks, And Feedback

Legacy references:

- `app/documente/page.tsx`
- `app/utile/page.tsx`
- `app/sarcini/page.tsx`
- `app/feedback/page.tsx`
- `src/components/pdf-viewer.tsx`
- legacy OpenSpec: `openspec/specs/pdf-viewer`

Behavior to capture:

- Static document and utility pages.
- PDF rendering behavior.
- External embeds such as Notion or forms.
- Route protection and layout consistency.

### Release Management, Feature Flags, And Local Cache

Legacy references:

- `src/lib/feature-flags.ts`
- `src/lib/cache.ts`
- `src/lib/release-management.ts`
- legacy OpenSpec: `openspec/specs/release-management`

Behavior to capture:

- Feature flag behavior.
- Client cache conventions.
- Release/version display or update flow.

## Proposed OpenSpec Sequence

The sequence below is intentionally ordered by dependency and migration risk.
Agents may split a proposal further if inspection shows the scope is too large,
but should avoid merging later proposals into earlier foundation work.

### 1. `add-platform-auth-and-shell`

Goal: define the application foundation: identity, roles, route protection, app
shell, and API authorization.

Proposal must decide whether the first migration phase keeps Firebase Auth as an
identity provider or introduces first-party auth immediately. A conservative
path is to keep Firebase Auth temporarily while moving authorization and user
profile state into PostgreSQL through the NestJS API.

Required coverage:

- User, role, and permission model.
- Session/token verification strategy.
- NestJS guards and decorators.
- SvelteKit auth state and protected route behavior.
- Sidebar/navigation rules.
- Dashboard and profile baseline.
- Migration handling for existing Firebase users and claims.

### 2. `add-legacy-data-migration-framework`

Goal: create the repeatable path for importing and reconciling legacy Firestore
and Firebase Storage data into PostgreSQL and any new storage target.

Required coverage:

- Export input format from the old app.
- Import command shape in the new repo.
- Legacy ID columns and unique constraints.
- Dry-run and reconciliation reports.
- Error handling and resumability.
- Initial entities shared by multiple later features.

### 3. `add-user-admin-and-roles`

Goal: replace the legacy user administration Cloud Functions and organigrama
page.

Required coverage:

- User listing, creation, disabling/enabling, deletion, and role assignment.
- Super admin/admin/moderator/council behavior.
- Audit fields for administrative actions.
- API endpoints and SvelteKit administration UI.

### 4. `add-inventory-management`

Goal: migrate inventory management from Firestore/Firebase Storage to
PostgreSQL-backed API behavior.

Required coverage:

- Inventory item schema.
- Image storage decision.
- Filtering, sorting, details, create/edit/delete workflows.
- Permission rules.
- Import from legacy `inventoryItems`.

### 5. `add-trainings-management`

Goal: migrate the trainings/stagii capability.

Required coverage:

- Training schema and relationships.
- Listing and administration workflows.
- Permissions.
- Import from legacy `trainings`.

### 6. `add-orgo-integration`

Goal: move Orgo integration into NestJS services with explicit token and
connection persistence.

Required coverage:

- Orgo auth flow, callback, refresh, logout, and login check.
- Token storage and refresh error handling.
- Fee history, units, and discussions API contracts.
- Security model for per-user Orgo connections.
- Compatibility with old Orgo behavior.

### 7. `add-units-and-meetings`

Goal: migrate units and meeting management, using Orgo as the source for unit
metadata where appropriate and PostgreSQL for local meeting data.

Required coverage:

- Unit model and Orgo synchronization strategy.
- Unit meeting CRUD.
- Attendance/member count behavior if present in legacy data.
- Import from `unitMeetings`.
- UI for unit overview and meeting administration.

### 8. `add-financial-transactions`

Goal: migrate budget, transactions, categories, CSV import, MT940 import, and
analysis workflows.

Required coverage:

- Transaction, category, import batch, and categorization rule schemas.
- CSV parser behavior.
- MT940 parser behavior.
- Duplicate detection and idempotent imports.
- Automatic and manual categorization.
- Statistics and budget views.
- Import from `financialTransactions` and `transactionCategories`.

This proposal should reuse the legacy MT940 OpenSpec change as a source, but
adapt it to PostgreSQL, NestJS, MikroORM, and SvelteKit.

### 9. `add-web-push-notifications`

Goal: migrate notification subscriptions, sending, broadcast, and logs.

Required coverage:

- Push subscription schema.
- Subscribe/unsubscribe endpoints.
- Direct, test, and broadcast send flows.
- Notification logs.
- VAPID/env configuration.
- Browser permission UI.
- Role requirements for sending.

### 10. `add-pwa-support`

Goal: restore installable/offline PWA behavior in the SvelteKit app.

Required coverage:

- Manifest.
- Service worker strategy.
- Offline behavior.
- Update detection.
- Install prompt.
- Cache boundaries for authenticated data.

### 11. `add-documents-info-and-feedback`

Goal: migrate static document, PDF, useful links, task, and feedback surfaces.

Required coverage:

- Document and PDF viewer behavior.
- Static content source strategy.
- External embed handling.
- Access control.
- Responsive UI expectations.

### 12. `add-release-and-observability`

Goal: define release visibility, operational health, and observability needed
before replacing the legacy app.

Required coverage:

- Version/release display.
- Feature flag strategy.
- API health/readiness checks.
- Structured logging expectations.
- Error reporting strategy.

### 13. `decommission-legacy-firebase`

Goal: remove remaining runtime dependency on the old Firebase/Firestore
implementation after all required data and behavior have been migrated.

Required coverage:

- Final migration checklist.
- Data reconciliation report.
- Auth provider decision finalized.
- Firebase Storage replacement or archival.
- Cutover steps.
- Rollback window and fallback plan.

## Starter Domain Model

The exact model belongs in the relevant proposal designs, but agents should use
this as the initial map:

- `User`
- `Role`
- `UserRole`
- `AuthIdentity`
- `OrgoConnection`
- `InventoryItem`
- `InventoryImage`
- `Training`
- `TrainingParticipant`
- `Unit`
- `UnitMember`
- `UnitMeeting`
- `UnitMeetingAttendee`
- `FinancialTransaction`
- `TransactionCategory`
- `FinancialImport`
- `TransactionCategorizationRule`
- `PushSubscription`
- `NotificationLog`
- `FeatureFlag`
- `DocumentAsset`

Use `legacyId` fields where imported rows need traceability back to Firestore
document IDs or Firebase user IDs.

## Proposal Template For Agents

Each feature proposal should answer these questions:

- Which legacy files and specs were inspected?
- What user-facing behavior must be preserved?
- What behavior is intentionally changed?
- What PostgreSQL entities, indexes, and constraints are required?
- What MikroORM migrations are required?
- What NestJS modules, services, controllers, DTOs, and guards are required?
- What SvelteKit routes, components, load functions, and forms are required?
- What API endpoints are introduced or changed?
- What permissions apply to each endpoint and UI action?
- What legacy data must be imported?
- How will duplicate imports be prevented?
- What tests are required?
- What manual browser checks are required?
- What deployment, rollback, and environment variables are required?

## Verification Gates

For each implemented proposal, expect at minimum:

- `pnpm verify`
- `pnpm build`
- `pnpm --filter api mikro-orm debug --config ./mikro-orm.config.cjs`
- Migration generation and migration execution against local PostgreSQL.
- API tests for service and permission behavior.
- SvelteKit checks for route and form behavior.
- Browser smoke test for the main workflow.
- Data import dry-run when the feature migrates legacy data.

High-risk proposals, especially auth, Orgo, finance, notifications, and
decommissioning, must include more specific verification in their `tasks.md`.

## Acceptance Checklist For Each Proposal

A proposal is ready for implementation only when:

- It validates with `openspec validate <change-id> --strict`.
- It has explicit scenarios for each changed capability.
- It names the legacy files that define current behavior.
- It defines API, persistence, permissions, UI, and migration scope.
- It includes test and manual verification tasks.
- Any unresolved product or technical decision is listed under open questions.

