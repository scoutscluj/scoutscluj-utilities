# Change: Add Kitchen Planning Module And App Audit Journal

## Why

Centrul Local Cluj needs a working kitchen-planning area for activities with meal logistics, especially camps. Leaders need to plan meals, reusable recipes, ingredients, participant assumptions, procurement, invoice/receipt attachments, and operational exports from inside the activity workspace.

The repository already has local `Activitate` records, activity detail pages, finance documents, and Orgo SSO. The kitchen module should build on those foundations instead of creating a separate camp or event model.

The team also needs an app-wide audit journal that shows who did what and when. Finance currently has a document-status audit table, but the application is expanding into activity, finance, kitchen, procurement, and future modules that need consistent audit visibility.

Old kitchen planner exports from last year are bundled temporarily under `apps/api/src/modules/kitchen/fixtures/legacy-catalog/`. They contain a useful shared kitchen catalog:

- 91 ingredients
- 42 recipes
- 201 recipe ingredient rows

The new module should seed that content into the new database through an idempotent import path.

After the production seed is run and verified, the temporary JSON fixture files should be removed in a follow-up change.

## What Changes

- Add `Plan de bucătărie` as an activity-scoped module available from `/activities/:activityId`.
- Convert the activity detail area into a tabbed workspace with `Prezentare`, `Financiar`, and `Bucătărie`.
- Add shared kitchen catalogs for `Ingrediente` and `Rețete`.
- Add a fixture-backed, idempotent kitchen catalog seed/import using the old JSON exports.
- Add one primary kitchen plan per activity.
- Generate and manage kitchen days from the activity date range.
- Add fixed daily meal slots: `Mic dejun`, `Gustare 1`, `Prânz`, `Gustare 2`, and `Cină`.
- Allow multiple meals in the same slot when context or group differs.
- Add plan-level participant assumptions and per-meal custom attendance by free-text subgroup.
- Add recipe assignments to meals with proportional scaling by default and optional whole-batch rounding.
- Derive ingredient needs from recipes, attendance, and manual quantity adjustments rather than storing calculated rows as the source of truth.
- Add ingredient overview reports with needed, procured, remaining, estimated cost, and daily/meal breakdown.
- Add procurement events and procurement items for kitchen purchasing.
- Allow invoices and receipts to be uploaded or linked from procurement as `Document financiar` records.
- Add CSV exports and printable operational reports for meal plans, ingredient needs, and procurement lists.
- Add a central app audit journal for important user and system actions across kitchen, finance, activity, and future modules.

## Out Of Scope

- Full Orgo attendance synchronization.
- Full member or participant management.
- Multiple kitchen plan scenarios per activity.
- Finalized or locked kitchen plan versions.
- Automatic cross-family unit conversion, such as kilograms to liters or packs to grams.
- Polished PDF generation as a v1 acceptance requirement.
- Nutrition, allergens, dietary restrictions, and menu approval workflows.
- Automatic OCR or parsing of invoice and receipt contents.
- Automatic finance reconciliation from procurement receipts.

## Impact

- Affected specs: `kitchen-planning` (new), `audit-journal` (new)
- Affected app areas: API kitchen module, API audit module, API finance document links, web activity workspace, web kitchen routes, activity detail layout, report/export routes, seed/import tooling.
- Affected data: kitchen catalog, kitchen plans, kitchen days, meals, meal recipes, meal attendance, ingredient adjustments, plan-specific estimates, procurement events, procurement items, procurement-financial-document links, app audit entries.
- Security impact: kitchen data is activity-scoped; financial documents remain protected; audit entries must not expose secrets or large file payloads.
- Migration impact: add new tables and seed/import commands; existing activity and finance records remain intact.
