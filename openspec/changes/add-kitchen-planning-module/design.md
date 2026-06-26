# Design: Kitchen Planning Module And App Audit Journal

## Context

Scouts Cluj Utilities is a SvelteKit, NestJS, and Postgres rewrite. Current foundations include:

- Orgo SSO and local sessions.
- Role-aware app shell and side menu.
- Local `Activitate` records with type, dates, coordinator, and optional Orgo event references.
- Finance document upload and status workflow.
- Finance-specific document audit history.

The domain glossary defines `Activitate` as the umbrella concept for camps, hikes, trainings, festivals, meetings, and other scouting activities. The kitchen module should therefore attach to `Activitate`, not to a separate event or camp entity.

The old kitchen planner exports are bundled temporarily under `apps/api/src/modules/kitchen/fixtures/legacy-catalog/` and include:

- `ingredients.json`: 91 shared ingredients.
- `recipes.json`: 42 shared recipes.
- `recipe_ingredients.json`: 201 recipe ingredient links.

The exports contain content, not the target schema. The new app should preserve the content and convert it into app-native tables.

## Goals

- Let coordinators plan kitchen logistics from the activity workspace.
- Reuse shared ingredients and recipes across activities.
- Keep activity-specific attendance, price estimates, procurement, and overrides local to the kitchen plan.
- Calculate ingredient needs consistently for UI, reports, CSV exports, and tests.
- Track procurement coverage against required ingredients.
- Let users attach invoices and receipts from procurement using existing financial-document concepts.
- Seed the shared kitchen catalog from last year's exports in a repeatable way.
- Add a central audit journal for important actions across the app.

## Non-Goals

- Replace Orgo as the source for canonical events or members.
- Build full Orgo registration sync in this slice.
- Add global kitchen navigation outside the activity context.
- Store every calculated ingredient row as the source of truth.
- Add multiple kitchen scenarios per activity.
- Build a polished PDF renderer as a required v1 deliverable.

## Navigation

The activity detail page becomes a tabbed activity workspace:

- `Prezentare`
- `Financiar`
- `Bucătărie`

Kitchen routes live under the activity:

- `/activities/:activityId/kitchen`
- `/activities/:activityId/kitchen/meals`
- `/activities/:activityId/kitchen/ingredients`
- `/activities/:activityId/kitchen/recipes`
- `/activities/:activityId/kitchen/procurement`
- `/activities/:activityId/kitchen/reports`

The main sidebar remains activity-focused. There is no top-level kitchen sidebar item in v1.

## Data Model

Use app-native integer primary keys to match current database conventions. Preserve old export UUIDs in nullable `legacy_source_id` fields so seed imports can be idempotent.

### Shared Catalog

`kitchen_ingredients`:

- `id`
- `legacy_source_id`
- `name`
- `category`
- `unit_family`
- `default_unit`
- `default_price_per_unit`
- `created_at`
- `updated_at`

`kitchen_recipes`:

- `id`
- `legacy_source_id`
- `name`
- `description`
- `servings`
- `created_at`
- `updated_at`

`kitchen_recipe_ingredients`:

- `id`
- `legacy_source_id`
- `recipe_id`
- `ingredient_id`
- `quantity`
- `unit`
- `created_at`
- `updated_at`

### Activity Kitchen Plan

`kitchen_plans`:

- `id`
- `activity_id` unique
- `default_participant_count`
- `created_at`
- `updated_at`

`kitchen_days`:

- `id`
- `kitchen_plan_id`
- `date`
- `date_status`: `current` or `outside_activity_dates`
- `created_at`
- `updated_at`

`kitchen_meals`:

- `id`
- `kitchen_day_id`
- `slot`: `breakfast`, `snack_1`, `lunch`, `snack_2`, `dinner`
- `context`
- `name`
- `sort_order`
- `attendance_mode`: `plan_default` or `custom`
- `created_at`
- `updated_at`

`kitchen_meal_recipes`:

- `id`
- `meal_id`
- `recipe_id`
- `serving_override`
- `scaling_mode`: `proportional` or `whole_batch`
- `created_at`
- `updated_at`

`kitchen_meal_attendance`:

- `id`
- `meal_id`
- `subgroup_name`
- `attendance`
- `created_at`
- `updated_at`

`kitchen_quantity_adjustments`:

- `id`
- `meal_id`
- `ingredient_id`
- `quantity_delta`
- `unit`
- `notes`
- `created_at`
- `updated_at`

`kitchen_plan_ingredient_estimates`:

- `id`
- `kitchen_plan_id`
- `ingredient_id`
- `estimated_unit_price`
- `created_at`
- `updated_at`

### Procurement

`kitchen_procurement_events`:

- `id`
- `kitchen_plan_id`
- `name`
- `supplier`
- `date`
- `method`: `delivery` or `self_purchase`
- `status`: `planned`, `in_progress`, `completed`
- `notes`
- `created_at`
- `updated_at`

`kitchen_procurement_items`:

- `id`
- `procurement_event_id`
- `ingredient_id`
- `quantity`
- `unit`
- `estimated_unit_price`
- `estimated_total_cost`
- `real_unit_price`
- `real_total_cost`
- `notes`
- `created_at`
- `updated_at`

`kitchen_procurement_documents`:

- `id`
- `procurement_event_id`
- `financial_document_id`
- `created_at`

Financial documents linked from procurement remain `Document financiar` records and follow the finance workflow.

### Audit

`app_audit_entries`:

- `id`
- `actor_id` nullable
- `action`
- `entity_type`
- `entity_id`
- `activity_id` nullable
- `metadata` JSONB
- `created_at`

The metadata payload stores small structured context or diffs. It must not store secrets, tokens, large file content, or full document payloads.

## Date Handling

A kitchen plan requires activity dates before meal planning starts.

When the kitchen plan is first created, the system generates one kitchen day for each date from `activity.startDate` through `activity.endDate`, inclusive.

If activity dates later change, the system does not silently delete existing kitchen days. A sync action:

- adds missing days now covered by the activity range,
- marks days outside the new activity range as `outside_activity_dates`,
- keeps existing meals for review.

## Meal Planning

Every kitchen day uses the five standard slots:

- `Mic dejun`
- `Gustare 1`
- `Prânz`
- `Gustare 2`
- `Cină`

Leaders may create multiple meals in the same slot when context differs, such as `Prânz - tabără` and `Prânz - grup drumeție`.

Each meal can:

- set context and display name,
- use plan default attendance or custom attendance,
- have one or more assigned recipes,
- show derived ingredients and estimated cost,
- keep manual quantity adjustments.

## Attendance

V1 stores:

- a plan-level default participant count,
- optional per-meal attendance rows by free-text subgroup name.

Future Orgo or local participant modules can replace or link those rows to canonical attendance sources.

## Ingredient Calculation

Ingredient need is derived from current recipe assignments, recipe ingredient quantities, attendance, scaling mode, unit normalization, plan estimates, procurement actuals, and manual adjustments.

Attendance:

- If the meal uses plan default attendance, use `kitchen_plans.default_participant_count`.
- If the meal uses custom attendance, sum the meal attendance rows.

Scaling:

- Default mode is proportional.
- `scale = mealAttendance / effectiveRecipeServings`
- `effectiveRecipeServings = serving_override` when present, otherwise recipe servings.
- Whole-batch mode uses `ceil(mealAttendance / effectiveRecipeServings)`.

Unit handling:

- Normalize within the ingredient's unit family.
- Do not convert across mass, volume, and count families without an explicit ingredient-specific conversion.

Manual adjustments:

- Store explicit deltas with notes.
- Merge adjustments into meal and plan totals.
- Do not rewrite the shared recipe when only one activity needs practical adjustment.

## Procurement Coverage

The ingredient overview compares derived required quantities with procured quantities:

- total needed,
- estimated cost,
- procured quantity,
- remaining quantity,
- coverage percentage,
- daily and meal breakdown.

Procurement items contribute to coverage when their units are compatible with the ingredient unit family.

The "From meal plan" helper shows all required ingredients with needed, procured, remaining, and coverage values, and can add remaining quantities to a procurement event.

## Reports And Exports

V1 requires:

- CSV ingredient export.
- CSV procurement export.
- CSV per-procurement-event export.
- Printable reports page.

The reports page includes:

- `Plan mese`: day-by-day meals, recipes, and attendance.
- `Necesar ingrediente`: ingredient totals grouped by category with daily/meal breakdown.
- `Listă aprovizionare`: needed, procured, remaining, supplier/event grouping, and CSV actions.

Polished PDF export is specified as a later slice unless explicitly prioritized.

## Seed Import

The old kitchen exports become temporary fixture data for an idempotent import command.

Import behavior:

- Upsert ingredients by `legacy_source_id` when present, otherwise stable normalized name.
- Upsert recipes by `legacy_source_id` when present, otherwise stable normalized name.
- Upsert recipe ingredients by `legacy_source_id` when present, otherwise recipe, ingredient, quantity, and unit.
- Preserve Romanian names, categories, units, and prices.
- Report skipped or ambiguous rows.

The seed command should be safe to run in dev, staging, and production after review.

After the production seed is run and verified, remove the temporary JSON fixture files in a follow-up change. The database catalog becomes the source of truth after seeding.

## Permissions

Kitchen access is activity relationship based:

- The activity `Coordonator` can manage the kitchen plan for that activity.
- `super_admin` can manage all kitchen plans.
- `Responsabil financiar` can see procurement and linked financial documents where finance access already applies, but does not automatically edit meal planning.
- Shared ingredient and recipe catalog edits are allowed to coordinators in v1.
- API checks are authoritative.

Audit visibility:

- Coordinators can see audit entries for their own activities and related records.
- `Responsabil financiar` can see audit entries relevant to finance records.
- `super_admin` can see the global audit journal.
- Regular users do not get a global audit browser.

## Audit Behavior

All important write operations emit central audit entries, including:

- kitchen plan creation,
- date sync,
- ingredient and recipe create/update/delete,
- meal create/update/delete,
- recipe assignment changes,
- attendance changes,
- manual quantity adjustments,
- procurement event and item changes,
- procurement document links,
- financial document uploads from procurement,
- export generation when useful for traceability.

Existing finance document status history can remain specialized while also writing central audit entries for cross-app visibility.

## Rollout

Recommended vertical slices:

1. Central audit journal foundation.
2. Kitchen schema and catalog seed import.
3. Ingredient calculation service with unit normalization and tests.
4. Kitchen plan/date/meal APIs.
5. Activity workspace tabs and kitchen overview.
6. Meal planner UI.
7. Ingredient and recipe catalog UI.
8. Procurement UI and financial document links.
9. Reports and CSV exports.

## Validation

Backend work should include service/controller tests for:

- authorization,
- catalog import idempotency,
- proportional and whole-batch calculation,
- unit-family normalization and rejection,
- ingredient aggregation,
- procurement coverage,
- audit emission.

Frontend work should pass SvelteKit type checks and include focused tests when the UI testing stack is available.

Run `pnpm verify` after implementation slices.
