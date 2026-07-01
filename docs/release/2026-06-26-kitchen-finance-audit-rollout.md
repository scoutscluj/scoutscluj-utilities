# 2026-06-26 Kitchen, Finance Uploads, And Audit Rollout

## Summary

This release adds the first activity-scoped kitchen planning slice, expands
financial document upload/linking, and introduces a central app audit journal.

The kitchen/meal feature must be described as work in progress in the PR and
release notes. It is ready for local and coordinator smoke testing, but it still
needs real-camp feedback before we call the meal planner complete.

## Included

- Activity workspace tabs for overview, finance, kitchen, and activity audit.
- Activity navigation now lives in the left menu: selecting an activity opens
  `Prezentare`, enabled departments appear under the current activity, and page
  titles are shown in the top bar.
- Activity departments are stored per activity and can be managed after
  creation by the coordinator or `super_admin`.
- Camp kitchen planner under `/activities/:activityId/kitchen`.
- Shared kitchen ingredients and recipes.
- Legacy kitchen catalog import from API fixture files.
- Meal slots, recipe assignments, attendance assumptions, ingredient totals,
  procurement coverage, procurement events, and procurement items.
- Procurement invoice/receipt upload and linking through financial documents.
- Small protected previews for financial documents in both the global finance
  register and activity finance views, with click-to-open previews for PDFs and
  browser-previewable images.
- Printable kitchen reports and CSV exports.
- Central app audit table, API, and web views.
- Central audit events for kitchen writes and finance document writes.
- API request body limit increase for base64 financial document uploads.

## Production Steps

1. Deploy the API and web artifacts from the PR branch.
2. Run database migrations:

   ```bash
   pnpm --filter api migration:up
   ```

3. Seed the kitchen catalog:

   ```bash
   pnpm --filter api kitchen:seed
   ```

   The seed reads the temporary fixture files from
   `apps/api/src/modules/kitchen/fixtures/legacy-catalog/` unless
   `KITCHEN_EXPORTS_DIR` is set.

4. After the production seed is verified, open a follow-up PR that removes the
   temporary legacy JSON fixture files.

5. Smoke-test:

   - sign in as a coordinator or super admin
   - open an activity kitchen tab
   - verify days generate from activity dates
   - add or edit one meal
   - check ingredient totals
   - create a procurement event
   - upload or link one receipt/invoice
   - open the activity audit tab

## Known WIP

- Meal planner UX is not final.
- No Orgo attendance sync yet.
- No participant/member based attendance source yet.
- No polished PDF export yet.
- No allergen or dietary workflow yet.
- No OCR or automatic finance reconciliation for receipts.
- Seed idempotency and controller authorization need broader automated coverage.
- Temporary legacy JSON fixture files should be removed after production seed
  verification.

## Validation Used

- `pnpm --filter api typecheck`
- `pnpm --filter web typecheck`
- `pnpm --filter api exec jest --runInBand`
- `pnpm openspec validate add-kitchen-planning-module --strict`
- Local API upload replay for the request-body-limit fix
- Browser smoke checks for activity finance and kitchen tabs

## Rollback

Prefer a feature/config rollback or route hiding over destructive database
rollback. Do not delete uploaded financial documents, audit records, or seeded
kitchen catalog data from production unless the team has a retention-approved
cleanup plan.
