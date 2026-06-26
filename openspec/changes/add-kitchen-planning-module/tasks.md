# Tasks

Current status: this change is implemented as a WIP vertical slice. The API,
web routes, seed import, reports, and central audit journal exist, but the meal
planner still needs real-camp feedback and broader automated coverage before it
is considered complete.

## 1. Audit Foundation

- [x] Add central `app_audit_entries` database model and migration.
- [x] Add an audit service for recording actor, action, entity type, entity id, activity id, metadata, and timestamp.
- [x] Add API endpoints for activity-scoped audit visibility and super-admin global audit visibility.
- [x] Emit central audit entries from existing finance document create/status-change paths.
- [x] Add focused tests for audit metadata redaction.
- [ ] Add broader tests for audit recording and visibility rules.

## 2. Kitchen Schema And Seed Import

- [x] Add kitchen catalog entities for ingredients, recipes, and recipe ingredients.
- [x] Add kitchen plan, day, meal, meal recipe, attendance, adjustment, price estimate, procurement, and procurement document entities.
- [x] Add database migration for kitchen tables, enums, indexes, and foreign keys.
- [x] Move old kitchen planner JSON exports into app fixture/import resources.
- [x] Add an idempotent kitchen catalog seed/import command.
- [ ] Remove temporary legacy JSON fixtures after the production seed is verified.
- [ ] Add tests for seed import idempotency, legacy ID preservation, and ambiguous row handling.

## 3. Calculation Core

- [x] Add unit-family normalization helpers.
- [x] Add recipe scaling logic with proportional default and whole-batch option.
- [x] Add ingredient aggregation for meal, day, and whole-plan scopes.
- [x] Add manual quantity adjustment merging.
- [x] Add estimated cost and procurement coverage calculation.
- [x] Add focused calculation tests for attendance, duplicate ingredients, rounding modes, unit rejection, adjustments, and coverage.

## 4. Kitchen APIs

- [x] Add kitchen plan create/read setup for an activity.
- [x] Add kitchen day generation and date sync APIs.
- [x] Add ingredient and recipe catalog APIs.
- [x] Add meal CRUD APIs with standard slot handling and duplicate-context support.
- [x] Add meal recipe assignment APIs.
- [x] Add meal attendance APIs.
- [x] Add ingredient overview API.
- [x] Add procurement event and item APIs.
- [x] Add procurement financial document link/upload APIs.
- [x] Enforce coordinator, finance, and super-admin permissions on API paths.

## 5. Activity Workspace And Kitchen UI

- [x] Convert `/activities/:activityId` into a tabbed workspace with `Prezentare`, `Financiar`, and `Bucatarie`.
- [x] Move current activity financial document UI under the `Financiar` tab.
- [x] Add kitchen setup and overview states.
- [x] Add meal planner UI with day/slot layout, loading, empty, error, and delete-confirmation states.
- [x] Add ingredient and recipe catalog views inside the kitchen area.
- [x] Add ingredient overview with table and compact card views.
- [x] Add procurement event management UI.
- [x] Add invoice/receipt upload or link actions from procurement.
- [x] Add activity-scoped audit view where permitted.
- [ ] Polish meal-planner UX after real-camp feedback.

## 6. Reports And Exports

- [x] Add `Plan mese` printable report.
- [x] Add `Necesar ingrediente` printable report.
- [x] Add `Lista aprovizionare` printable report.
- [x] Add CSV export for ingredient totals.
- [x] Add CSV export for procurement lists.
- [x] Add CSV export for individual procurement events.
- [x] Keep PDF export as a follow-up unless explicitly reprioritized.

## 7. Documentation And Validation

- [x] Document kitchen seed/import usage.
- [x] Document audit event conventions and sensitive-field exclusions.
- [x] Document rollout, rollback, and WIP status.
- [x] Validate OpenSpec change when the CLI is available.
- [x] Run focused API tests after backend slices.
- [x] Run web type checks after frontend slices.
- [ ] Run full `pnpm verify` before calling the meal feature complete.
