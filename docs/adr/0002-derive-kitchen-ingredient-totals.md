# ADR 0002: Derive Kitchen Ingredient Totals

## Status

Accepted

## Context

The kitchen-planning module needs to show ingredient quantities, estimated
costs, procurement coverage, daily breakdowns, and meal-level ingredient lists.
The original module request proposed storing calculated ingredient rows for each
meal. Those values are derived from recipes, serving assumptions, and meal
attendance, all of which can change while leaders refine a plan.

Persisting every calculated row would make reads simple, but it creates stale
data risk whenever a recipe, recipe assignment, attendance value, or serving
override changes. It would also require recalculation and repair logic across
many write paths.

## Decision

Kitchen ingredient totals are derived from the current plan, recipes, servings,
and attendance when normal views and reports need them.

Manual quantity changes are stored separately as explicit adjustments with
notes. Reports and procurement helpers combine the derived need with those
manual adjustments.

## Consequences

The source of truth remains compact and easier to audit: recipes, meal
assignments, attendance assumptions, and manual adjustments.

Ingredient views and exports must use shared calculation code so totals remain
consistent across the UI, API, and tests.

If derived views become too slow for large plans, the system can add cache tables
or materialized summaries later without changing the domain model.
