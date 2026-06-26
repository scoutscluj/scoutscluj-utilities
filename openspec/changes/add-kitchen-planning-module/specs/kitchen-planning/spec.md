## ADDED Requirements

### Requirement: Activity-Scoped Kitchen Workspace

The system SHALL expose kitchen planning inside an `Activitate` workspace rather than as a standalone global module.

#### Scenario: Coordinator opens kitchen tab

- **GIVEN** an authenticated coordinator opens an activity they coordinate
- **WHEN** they select `Bucătărie`
- **THEN** the app shows the kitchen workspace for that activity
- **AND** does not require a separate camp or event record.

#### Scenario: Main navigation remains activity focused

- **GIVEN** the authenticated app shell renders
- **WHEN** kitchen planning is enabled
- **THEN** the main sidebar still points users to `Activități`
- **AND** kitchen routes are reached from an activity.

### Requirement: Kitchen Plan Setup From Activity Dates

The system SHALL create one primary kitchen plan per activity and generate kitchen days from the activity date range.

#### Scenario: Activity has dates

- **GIVEN** an activity has a start date and end date
- **WHEN** a coordinator creates or opens the kitchen plan for the first time
- **THEN** the system creates one kitchen day for each date in the inclusive range.

#### Scenario: Activity has missing dates

- **GIVEN** an activity has no complete date range
- **WHEN** a coordinator opens the kitchen workspace
- **THEN** the app shows a setup state asking for activity dates
- **AND** does not create meal days yet.

#### Scenario: Activity dates change

- **GIVEN** a kitchen plan already has days and meals
- **WHEN** the activity date range changes
- **THEN** the system offers a sync action
- **AND** adds newly covered dates
- **AND** marks now-outside dates for review without deleting meals silently.

### Requirement: Shared Kitchen Catalog

The system SHALL provide shared ingredients and recipes that can be reused across activities.

#### Scenario: Ingredient is reused

- **GIVEN** an ingredient exists in the shared catalog
- **WHEN** a coordinator creates a recipe or procurement item for any activity
- **THEN** the same ingredient can be selected
- **AND** activity-specific quantities, estimates, and procurement state stay on the kitchen plan.

#### Scenario: Recipe is reused

- **GIVEN** a recipe exists in the shared catalog
- **WHEN** a coordinator assigns it to a meal
- **THEN** the meal uses the shared recipe definition
- **AND** serving override and scaling mode are stored on the meal recipe assignment.

### Requirement: Legacy Kitchen Catalog Import

The system SHALL seed the shared kitchen catalog from the old kitchen planner JSON exports through an idempotent import.

#### Scenario: Import runs for the first time

- **GIVEN** the old kitchen planner export files are available as fixtures
- **WHEN** the import command runs
- **THEN** it creates ingredients, recipes, and recipe ingredient links from the exported content
- **AND** preserves legacy source identifiers for future idempotent imports.

#### Scenario: Import runs again

- **GIVEN** the catalog was previously imported
- **WHEN** the import command runs again
- **THEN** matching ingredients, recipes, and recipe ingredients are updated or skipped safely
- **AND** duplicates are not created.

### Requirement: Standard Meal Slots

The system SHALL plan meals using the standard daily meal slots `Mic dejun`, `Gustare 1`, `Prânz`, `Gustare 2`, and `Cină`.

#### Scenario: Day shows standard slots

- **GIVEN** a kitchen day exists
- **WHEN** the meal planner renders the day
- **THEN** it shows the five standard meal slots in order.

#### Scenario: Multiple meals share a slot

- **GIVEN** a day has a lunch for the main camp and a lunch for a hike group
- **WHEN** the coordinator creates both meals under `Prânz`
- **THEN** both meals appear in the lunch slot with distinct context or names.

### Requirement: Meal Attendance

The system SHALL support plan default attendance and per-meal custom attendance by subgroup.

#### Scenario: Meal uses plan default attendance

- **GIVEN** a kitchen plan has a default participant count
- **AND** a meal uses plan default attendance
- **WHEN** ingredient needs are calculated
- **THEN** the meal attendance equals the plan default participant count.

#### Scenario: Meal uses custom subgroup attendance

- **GIVEN** a meal has custom attendance rows
- **WHEN** ingredient needs are calculated
- **THEN** the meal attendance equals the sum of those subgroup rows.

### Requirement: Recipe Assignment Scaling

The system SHALL scale assigned recipes proportionally by default and support whole-batch rounding per assignment.

#### Scenario: Recipe scales proportionally

- **GIVEN** a recipe serves 10 people
- **AND** the meal attendance is 15
- **AND** the recipe assignment uses proportional scaling
- **WHEN** ingredient needs are calculated
- **THEN** each recipe ingredient quantity is multiplied by 1.5.

#### Scenario: Recipe rounds to whole batches

- **GIVEN** a recipe serves 10 people
- **AND** the meal attendance is 15
- **AND** the recipe assignment uses whole-batch scaling
- **WHEN** ingredient needs are calculated
- **THEN** each recipe ingredient quantity is multiplied by 2.

### Requirement: Derived Ingredient Needs

The system SHALL derive ingredient needs from recipes, attendance, unit normalization, plan estimates, procurement actuals, and manual adjustments.

#### Scenario: Duplicate ingredients aggregate

- **GIVEN** a meal has multiple recipes that use the same ingredient in compatible units
- **WHEN** ingredient needs are calculated
- **THEN** the ingredient appears once in the meal total
- **AND** the quantity is the normalized sum.

#### Scenario: Manual adjustment changes need

- **GIVEN** a coordinator adds a manual quantity adjustment for a meal ingredient
- **WHEN** the meal and plan totals are calculated
- **THEN** the adjustment is included
- **AND** the adjustment note remains visible.

#### Scenario: Incompatible unit conversion is rejected

- **GIVEN** an ingredient belongs to the mass unit family
- **WHEN** a recipe or procurement item attempts to use a volume unit without an explicit conversion
- **THEN** the system rejects the value with Romanian user-facing guidance.

### Requirement: Ingredient Overview

The system SHALL provide a kitchen-plan ingredient overview grouped by category with needed, procured, remaining, estimated cost, and breakdown details.

#### Scenario: Coordinator reviews ingredient coverage

- **GIVEN** meals and procurement items exist for a kitchen plan
- **WHEN** the coordinator opens `Ingrediente`
- **THEN** the app shows total needed quantity, procured quantity, remaining quantity, coverage percentage, and estimated cost per ingredient.

#### Scenario: Coordinator opens breakdown

- **GIVEN** an ingredient appears in multiple meals
- **WHEN** the coordinator opens its breakdown
- **THEN** the app shows which days and meals require that ingredient.

### Requirement: Procurement Management

The system SHALL manage procurement events and procurement items for a kitchen plan.

#### Scenario: Coordinator creates procurement event

- **GIVEN** a coordinator manages an activity kitchen plan
- **WHEN** they create a procurement event with supplier, date, method, status, and notes
- **THEN** the event is stored under that kitchen plan.

#### Scenario: Coordinator adds remaining quantities from meal plan

- **GIVEN** the ingredient overview shows remaining quantities
- **WHEN** the coordinator uses `From meal plan`
- **THEN** the selected remaining quantities are added to a procurement event as procurement items.

### Requirement: Procurement Financial Documents

The system SHALL allow invoices and receipts to be uploaded or linked from procurement as `Document financiar` records.

#### Scenario: Receipt is uploaded from procurement

- **GIVEN** a procurement event exists
- **WHEN** a user uploads a receipt from that procurement event
- **THEN** the system creates a financial document linked to the activity
- **AND** relates it to the procurement event
- **AND** the document follows the finance workflow.

#### Scenario: Existing financial document is linked

- **GIVEN** a financial document is already linked to the activity
- **WHEN** a permitted user links it to a procurement event
- **THEN** the procurement event shows that document
- **AND** finance document permissions still apply.

### Requirement: Kitchen Reports And CSV Exports

The system SHALL provide printable kitchen reports and CSV exports for operational use.

#### Scenario: Meal plan report

- **GIVEN** a kitchen plan has days, meals, recipes, and attendance
- **WHEN** the coordinator opens `Rapoarte`
- **THEN** the app shows a printable day-by-day meal plan.

#### Scenario: Ingredient CSV export

- **GIVEN** ingredient needs have been calculated for a kitchen plan
- **WHEN** a permitted user exports ingredients as CSV
- **THEN** the CSV includes ingredient name, category, total needed, procured, remaining, unit, and estimated cost.

#### Scenario: Procurement CSV export

- **GIVEN** procurement events and items exist
- **WHEN** a permitted user exports procurement as CSV
- **THEN** the CSV includes supplier, event, ingredient, quantity, estimated price, real price, and status.

### Requirement: Kitchen Authorization

The system SHALL restrict kitchen data by activity relationship and existing elevated roles.

#### Scenario: Coordinator manages own activity kitchen

- **GIVEN** an authenticated user is the activity coordinator
- **WHEN** they create or edit kitchen records for that activity
- **THEN** the API allows the operation.

#### Scenario: Unauthorized user is denied

- **GIVEN** an authenticated user is not the activity coordinator and lacks elevated access
- **WHEN** they attempt to modify kitchen records for the activity
- **THEN** the API denies the operation.

#### Scenario: Finance user views procurement finance data

- **GIVEN** an authenticated user has `Responsabil financiar` access
- **WHEN** they open procurement records related to finance documents
- **THEN** they can access finance-relevant procurement and document information
- **AND** they are not automatically granted meal-planning edit access.

### Requirement: Kitchen Audit Events

The system SHALL emit central audit entries for important kitchen actions.

#### Scenario: Meal is changed

- **GIVEN** a coordinator updates a meal
- **WHEN** the update succeeds
- **THEN** the central audit journal records the actor, action, meal entity, activity, timestamp, and safe metadata.

#### Scenario: Procurement document is linked

- **GIVEN** a user links a financial document to procurement
- **WHEN** the link succeeds
- **THEN** the central audit journal records the procurement-document link action.
