# Camp Kitchen Planner

## Current Status

The Camp Kitchen Planner is implemented as an activity-scoped kitchen workspace
under `/activities/:activityId/kitchen`. It is useful for local testing and
early coordinator feedback, but it should be treated as work in progress until
the team validates the meal-planning workflows on a real camp.

Implemented in this slice:

- activity workspace tabs for overview, finance, kitchen, and audit
- one primary kitchen plan per activity
- kitchen days generated from activity dates
- meal planning with standard meal slots
- shared ingredient and recipe catalogs
- proportional recipe scaling and optional whole-batch scaling
- ingredient totals, estimated cost, procurement coverage, and breakdowns
- procurement events and items
- invoice or receipt upload/linking from procurement through financial documents
- printable reports and CSV exports for ingredients and procurement
- central audit events for kitchen and finance writes
- idempotent legacy catalog seed/import from last year's exports

Known WIP areas:

- real-camp UX polish for the meal planner
- deeper validation around seed idempotency and controller authorization
- Orgo attendance synchronization
- participant/member-based meal attendance
- PDF generation
- allergen, dietary restriction, and menu approval workflows
- automatic document OCR or finance reconciliation
- multiple kitchen scenarios or locked plan versions

## Legacy Catalog Seed

Legacy exports from the old kitchen planner are stored in
`apps/api/src/modules/kitchen/fixtures/legacy-catalog/` and are imported into
the shared kitchen catalog with this local development command:

```bash
pnpm --filter api kitchen:seed
```

The importer reads `ingredients.json`, `recipes.json`, and
`recipe_ingredients.json`. It is idempotent by legacy UUID first, then by
ingredient or recipe name, so re-running the command updates catalog content
without duplicating rows.

Set `KITCHEN_EXPORTS_DIR=/absolute/path/to/exports` when importing from another
folder.

Run database migrations before the seed:

```bash
pnpm --filter api migration:up
pnpm --filter api kitchen:seed
```

In the production Docker image, the source tree is not copied. Use the compiled
entry point instead:

```bash
node apps/api/dist/seed-kitchen-catalog.js
```

Expected import totals from the current legacy exports:

- 91 ingredients
- 42 recipes
- 201 recipe ingredient links

Catalog text should stay display-ready: ingredient labels are lowercase,
recipe titles are sentence-cased, and Romanian names/descriptions use Romanian
diacritics. Recipe ingredient display names should match the canonical
ingredient labels.

The seed command is safe to run repeatedly after migrations. Production deploys
run it automatically after migrations so new databases or restored databases
keep the shared ingredients and recipes visible.

These JSON files are temporary bootstrap fixtures. After the production seed has
been run and verified, remove them in a follow-up PR so the repository does not
carry legacy export files longer than needed.

## Planning Model

Kitchen plans belong to an activity. Activity dates generate kitchen days,
meals sit in standard slots, and repeated contexts are allowed in the same slot
when a camp needs parallel meals.

Ingredient totals are derived from assigned recipes, attendance, scaling mode,
and manual adjustments. Procurement rows reduce the remaining quantity shown in
ingredient reports.

## Navigation

Kitchen planning is not a top-level module. Users reach it from an activity:

- `/activities/:activityId/kitchen` for setup and overview
- `/activities/:activityId/kitchen/meals` for the day/slot meal plan
- `/activities/:activityId/kitchen/ingredients` for calculated ingredient needs
- `/activities/:activityId/kitchen/recipes` for shared recipes
- `/activities/:activityId/kitchen/procurement` for shopping events and items
- `/activities/:activityId/kitchen/reports` for printable views and CSV exports

The activity side menu owns department navigation. Kitchen subsections are shown
as a horizontal contextual menu at the top of the kitchen workspace, not as a
second activity tab row and not as nested items inside the main sidebar. Finance
summary cards should remain only on the activity finance tab, not on kitchen
tabs.

The kitchen workspace is available only when `Bucătărie` is enabled as a
department for the activity. Coordinators can adjust enabled departments from
the activity `Prezentare` page.

## Permissions

Kitchen writes are activity-scoped:

- the activity coordinator can manage the kitchen plan for that activity
- `super_admin` can manage all kitchen plans
- `finance_manager` can review finance-relevant procurement/document data
- normal authenticated users do not get cross-activity kitchen access

The API remains authoritative. Web route guards are only a convenience layer.

## Procurement Documents

Procurement can create or link financial documents:

- upload an invoice or receipt from a procurement event
- link an existing activity financial document to a procurement event
- keep the document in the normal finance workflow
- keep file contents out of audit metadata

The API JSON body limit is configured to `25mb` because document uploads are
sent as base64 JSON. The finance document file limit remains lower than that to
allow for base64 overhead.

## Reports And Exports

The reports page provides:

- printable meal plan
- printable ingredient needs
- printable procurement list
- ingredient CSV export
- procurement CSV export
- per-procurement-event CSV export

CSV exports are the production-ready handoff path in this slice. PDF export is a
follow-up.

## Production Rollout

Release order:

1. Deploy the API and web changes.
2. The deploy script runs database migrations.
3. The deploy script imports the idempotent kitchen catalog seed.
4. Ask a coordinator to smoke-test one activity kitchen plan.
5. Keep the PR/release notes clear that the meal-planning feature is WIP.

Rollback should disable or hide kitchen routes rather than deleting kitchen
tables. Uploaded financial documents and audit entries are production records
and should be retained.
