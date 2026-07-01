# PRD: Camp Kitchen Planner Redesign

## Problem Statement

The current `Plan de bucătărie` implementation proves the core data model, but
the user experience still feels like an early slice. Shared catalog work,
activity meal planning, source planning, and reports are mixed together in ways
that make the module harder to understand during real camp preparation.

Coordinators need a kitchen workspace that separates reusable catalog data from
activity-specific planning, makes daily meal planning easier to scan, supports
modal-based editing instead of long inline forms, and shows whether upcoming
meals are covered by local stock, shopping runs, deliveries, suppliers, or
people bringing items. Shared recipes and ingredients must evolve over time
without silently changing what an activity already planned or used.

## Solution

Redesign the kitchen module around two clear mental areas:

- `Catalog`: shared reusable `Ingrediente` and `Rețete`, visually separated
  inside the activity kitchen menu for now.
- `Plan`: activity-specific `Mese`, `Aprovizionare`, and `Rapoarte`.

For this redesign, `Ingrediente` and `Rețete` remain in the activity kitchen
menu, but the UI must label them subtly as shared catalog sections. Moving the
shared catalog to a top-level `Catalog bucătărie` module is deferred until the
workflow has been validated.

The redesigned module should provide:

- a compact operational kitchen overview
- compact list views for ingredients and recipes
- modal create/edit flows
- nested ingredient creation while editing a recipe
- `Condimente` as unquantified recipe guidance, separate from quantified
  ingredients
- `Rețetă atribuită` snapshots when recipes are assigned to meals
- day tabs for `Mese`
- chronological meal coverage in `Aprovizionare`
- flexible `Sursă de aprovizionare` and quantity-aware coverage
- reports and exports aligned with planning, source coverage, and shopping
  needs

## User Stories

1. As a `Coordonator`, I want the kitchen workspace to show a compact overview,
   so that I immediately understand what still needs attention.
2. As a `Coordonator`, I want the kitchen menu split into `Catalog` and `Plan`,
   so that I understand which pages change shared data and which pages belong to
   the current activity.
3. As a `Coordonator`, I want `Ingrediente` and `Rețete` to be visually labeled
   as shared catalog pages, so that I do not accidentally treat them as
   activity-local.
4. As a `Coordonator`, I want the shared catalog to remain accessible from the
   activity kitchen flow for now, so that I can plan without jumping to another
   module.
5. As a future product owner, I want the design to leave room for a top-level
   `Catalog bucătărie`, so that shared catalog work can later move out of an
   activity context.
6. As a `Coordonator`, I want a compact ingredient list, so that I can scan many
   ingredients quickly.
7. As a `Coordonator`, I want to click an ingredient and edit it in a modal, so
   that the page does not become a long stack of forms.
8. As a `Coordonator`, I want to create ingredients from a modal, so that adding
   catalog items is fast.
9. As a `Coordonator`, I want ingredient create/edit modals to show that the
   ingredient belongs to the shared catalog, so that I understand the scope of
   the change.
10. As a `Coordonator`, I want a compact recipe list, so that I can scan the
    recipe catalog quickly.
11. As a `Coordonator`, I want to click a recipe and edit it in a modal, so that
    the catalog stays tidy.
12. As a `Coordonator`, I want recipe modals to separate quantified
    `Ingrediente` from `Condimente`, so that cooking notes are not confused with
    shopping quantities.
13. As a `Coordonator`, I want `Condimente` to be editable as chips or a simple
    list, so that notes such as `sare`, `piper`, and `foi de dafin` remain easy
    to enter.
14. As a `Coordonator`, I want `Condimente` to remain outside calculated
    ingredient totals, so that cost and shopping quantities are not invented.
15. As a `Coordonator`, I want `Condimente` to appear in `Aprovizionare`, so
    that the shopping/source planning view still reminds me to check them.
16. As a `Coordonator`, I want shopping list exports to include `Condimente` in
    a separate unquantified section, so that buyers see the reminders without
    confusing them with measured quantities.
17. As a `Coordonator`, I want to create a missing ingredient from inside the
    recipe modal, so that I do not lose context while building a recipe.
18. As a `Coordonator`, I want inline ingredient creation to create a complete
    shared ingredient, so that later cost and procurement workflows work
    normally.
19. As a `Coordonator`, I want the newly created ingredient to be selected in
    the recipe automatically, so that I can continue editing the recipe.
20. As a `Coordonator`, I want a subtle shared-catalog label in nested ingredient
    creation, so that I know the ingredient will be available in all activities.
21. As a `Coordonator`, I want existing recipe assignments to preserve their
    recipe details when the shared catalog changes, so that past and current
    plans do not drift silently.
22. As a `Coordonator`, I want assigning a recipe to a meal to create a
    `Rețetă atribuită`, so that the activity stores the recipe name, servings,
    ingredients, condimente, and estimated prices used at that time.
23. As a `Coordonator`, I want the app to show when an assigned recipe is behind
    the shared catalog, so that I can decide whether to refresh it.
24. As a `Coordonator`, I want to keep the activity-specific assigned recipe
    unchanged, so that intentional historical differences remain valid.
25. As a `Coordonator`, I want to explicitly refresh an assigned recipe from the
    catalog, so that I can pull in shared updates before or during the activity.
26. As a `Coordonator`, I want completed activities to avoid noisy shared-catalog
    warnings by default, so that historical plans do not look broken just
    because the catalog evolved.
27. As a `Coordonator`, I want `Mese` organized by day tabs, so that camp days
    are easy to switch between.
28. As a `Coordonator`, I want the selected day to show standard `Slot de masă`
    sections, so that `Mic dejun`, `Gustare 1`, `Prânz`, `Gustare 2`, and
    `Cină` are easy to scan.
29. As a `Coordonator`, I want a meal to contain multiple assigned recipes, so
    that one planned eating moment can include several preparations.
30. As a `Coordonator`, I want meal cards to show presence, subgroup/context,
    assigned recipes, condimente indicators, and stale recipe warnings, so that
    I can review the plan quickly.
31. As a `Coordonator`, I want adding or editing a meal to happen in a modal, so
    that the day view remains compact.
32. As a `Coordonator`, I want assigning recipes to a meal to happen in a modal,
    so that I can search and add recipes without leaving the day.
33. As a `Coordonator`, I want the kitchen overview to show planning progress,
    so that I know how many days and meals still need attention.
34. As a `Coordonator`, I want the overview to show missing recipes, stale
    assignments, missing prices, unit conversion issues, and procurement
    coverage gaps, so that operational problems are visible early.
35. As a `Coordonator`, I want `Aprovizionare` to start from calculated needs,
    so that no required ingredient is forgotten.
36. As a `Coordonator`, I want unassigned needs to appear as `Neatribuite`, so
    that I can decide where each item comes from.
37. As a `Coordonator`, I want to define `Sursă de aprovizionare` records, so
    that items can come from the local center, shopping runs, supplier orders,
    deliveries, or named people.
38. As a `Coordonator`, I want a source to include owner, status, supplier or
    store, notes, and related financial documents, so that each fulfillment path
    is trackable.
39. As a `Coordonator`, I want long activities to support multiple shopping
    runs or deliveries, so that perishable or storage-limited items can be
    covered later.
40. As a `Coordonator`, I want the primary `Aprovizionare` view to be arranged
    by upcoming meals, so that I can see whether the next meals are covered.
41. As a `Coordonator`, I want each meal need to show coverage state, so that I
    can distinguish `neacoperit`, `parțial acoperit`, and `acoperit`.
42. As a `Coordonator`, I want coverage to be quantity-aware, so that partial
    sourcing such as `1 / 2 kg roșii` is visible.
43. As a `Coordonator`, I want the common interaction to be simple, such as
    marking an item covered, so that source planning is fast.
44. As a `Coordonator`, I want a modal or detailed editor to specify exact
    quantity and source, so that partial coverage can still be precise.
45. As a `Coordonator`, I want over-coverage to be visible but not blocking, so
    that practical buying buffers do not create unnecessary errors.
46. As a `Coordonator`, I want `Condimente` visible in `Aprovizionare` as a
    separate reminder list, so that buyers and kitchen staff can check them.
47. As a `Coordonator`, I want exports by source, so that one shopping run,
    delivery, or person can receive only their assigned list.
48. As a `Coordonator`, I want an export for upcoming uncovered or partially
    covered needs, so that I can prepare the next shopping run.
49. As a `Coordonator`, I want activity cost estimates to use the estimated
    prices copied into `Rețete atribuite`, so that later catalog price changes
    do not rewrite an activity's planning estimate.
50. As a `Coordonator`, I want procurement sources to override estimates or
    record actual prices, so that real buying can differ from planning.
51. As a `Coordonator`, I want reports to show planned estimates separately from
    procurement actuals, so that I can compare planning to reality.
52. As a `Responsabil financiar`, I want procurement documents to remain linked
    to source planning records, so that receipts and invoices keep accounting
    context.
53. As a `Coordonator`, I want `Rapoarte` to include meal plan, ingredient
    needs, source coverage, upcoming shopping needs, condimente reminders, and
    cost estimate views, so that handoff to buyers and kitchen staff is
    practical.
54. As a developer, I want the redesign to preserve existing kitchen
    permissions, so that coordinators, finance managers, and super admins keep
    their expected access boundaries.
55. As a developer, I want important kitchen mutations to keep central audit
    events, so that the app can answer who changed catalog, meals, assignments,
    and source planning.

## Implementation Decisions

- Keep the current activity kitchen menu for now, but split it visually into two
  subtle groups: `Catalog` and `Plan`.
- Put `Ingrediente` and `Rețete` under `Catalog`; put `Mese`, `Aprovizionare`,
  and `Rapoarte` under `Plan`.
- Keep group labels short and visually quiet, ideally as small muted labels on
  or above each menu group's border.
- Mark catalog pages and catalog modals as shared, because ingredient and recipe
  edits are global.
- Defer moving `Ingrediente` and `Rețete` to a top-level `Catalog bucătărie`
  module.
- Replace long inline forms with modal create/edit flows for ingredients,
  recipes, meals, assigned recipes, and procurement/source coverage.
- Store `Condimente` separately from recipe descriptions and quantified recipe
  ingredients.
- Treat `Condimente` as unquantified recipe guidance that does not affect
  ingredient totals, cost estimates, or procurement quantities by default.
- Show `Condimente` in cooking/meal details, meal plan reports, aprovizionare
  reminder sections, and shopping exports as a separate unquantified section.
- Support promoting a condiment/note to a quantified ingredient later, but do
  not require that in the first redesign slice.
- Allow complete shared ingredient creation from inside the recipe modal.
- Automatically select a newly created ingredient in the recipe being edited.
- When a recipe is assigned to a meal, create a `Rețetă atribuită` snapshot that
  stores the recipe name, normal serving count, ingredient rows, condimente, and
  estimated price context used at assignment time.
- Do not introduce background jobs or automatic activity-end snapshots.
- Store enough source recipe identity/version information on a `Rețetă
atribuită` to detect when the shared recipe has changed later.
- Show explicit refresh controls for stale assigned recipes on current/editable
  activities.
- Avoid noisy stale warnings on historical activities where divergence from the
  current catalog is expected.
- Organize `Mese` by kitchen day tabs and standard slot sections.
- Allow one `Masă` to contain multiple `Rețete atribuite`.
- Keep support for multiple meals in the same slot when subgroup/context differs.
- Redesign `Aprovizionare` around chronological meal coverage rather than a
  shopping-event-first table.
- Generate a `Neatribuite` planning list from calculated ingredient needs.
- Allow flexible sources such as local center stock, shopping run, supplier
  order, delivery, and person bringing items.
- Make coverage quantity-aware while keeping the common interaction simple.
- Allow source planning to cover chosen ingredient needs or quantities without
  forcing strict source date ranges.
- Keep procurement/financial document linkage attached to source planning
  records.
- Copy catalog estimated prices into `Rețete atribuite` and allow procurement
  source overrides/actuals.
- Reports should distinguish planned estimates from procurement actuals.
- Keep PDF generation, OCR, and supplier price analytics out of the first
  redesign.

## Testing Decisions

- Prefer route-level and API/service tests that assert externally visible
  behavior rather than component internals.
- Add backend tests for `Rețetă atribuită` creation, ensuring later shared recipe
  edits do not mutate existing assigned recipes.
- Add backend tests for detecting stale assigned recipes and explicitly
  refreshing from the shared catalog.
- Add backend tests for condimente storage, ensuring condimente do not enter
  calculated ingredient totals or cost estimates.
- Add backend tests for recipe modal payloads that include quantified
  ingredients plus condimente.
- Add backend tests for inline ingredient creation from recipe workflows,
  including shared-catalog persistence and automatic selection payloads.
- Add frontend checks for grouped kitchen navigation labels `Catalog` and
  `Plan`.
- Add frontend checks for compact ingredient and recipe lists opening modals.
- Add frontend checks for day tabs in `Mese` and slot sections inside a selected
  day.
- Add backend and frontend checks for chronological aprovizionare coverage:
  uncovered, partially covered, covered, over-covered, and source grouping.
- Add export tests for source-specific shopping lists and separate unquantified
  condimente sections.
- Keep existing kitchen fixture tests for catalog quality and extend them when
  legacy condimente are migrated.
- Keep central audit assertions for catalog edits, meal changes, assigned recipe
  refreshes, and source coverage changes.

## Out of Scope

- Moving shared ingredients and recipes to a top-level `Catalog bucătărie` menu.
- Background jobs for automatic activity-end snapshots.
- Whole-plan immutable snapshots.
- Polished PDF generation.
- OCR or automatic finance reconciliation for procurement receipts.
- Supplier price history analytics.
- Automatic optimization of shopping runs.
- Exact date-range purchasing math for all long-camp procurement sources.
- Drag and drop meal planning.
- Orgo attendance synchronization.
- Dietary restrictions, allergens, and menu approval workflows.

## Further Notes

The agreed design intentionally separates reusable catalog data from
activity-specific use without moving the catalog out of the activity flow yet.
The most important architectural decision is `Rețetă atribuită`: it preserves
what an activity used without adding scheduled jobs or freezing the entire
activity at the end.

The PRD also changes the meaning of `Aprovizionare`. It is not only a shopping
list; it is the operational source-planning surface for what comes from the
local center, what is bought, what is ordered, what is delivered, and what is
brought by people.
