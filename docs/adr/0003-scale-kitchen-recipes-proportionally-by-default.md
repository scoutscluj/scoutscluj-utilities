# ADR 0003: Scale Kitchen Recipes Proportionally By Default

## Status

Accepted

## Context

Meal ingredient needs depend on recipe servings and expected attendance. A simple
whole-batch rule rounds every recipe up with `ceil(attendance / servings)`. That
is easy to explain, but it can significantly overstate quantities and costs when
attendance is only slightly above the recipe serving count.

Some recipes do need whole-batch handling because the preparation cannot be
scaled cleanly or leaders intentionally want batch buffers.

## Decision

Recipe assignments scale proportionally by default.

Each meal recipe assignment may opt into whole-batch rounding when that recipe
should be prepared in complete batches for the specific meal.

## Consequences

Default ingredient totals and estimated costs better match expected attendance.

The UI and reports must make the rounding mode visible where recipe assignments
are edited or reviewed.

Calculation tests must cover both proportional scaling and whole-batch rounding.
