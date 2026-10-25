# Change: Unify Application Tables Around MUI-Inspired Interaction

## Why

Table filters clip their text, pagination inherits inconsistent button styles,
text searches are not consistently first, matching terms are not highlighted,
and column selectors occupy unnecessary toolbar space. These inconsistencies
affect members, fees, receipts, users, inventory and other application tables.

## What Changes

- Apply the interaction and layout conventions of MUI tables within the existing
  Svelte/Bits UI components and Scouts visual tokens.
- Make text search the first filter in both DOM/keyboard order and visual order
  wherever a table has filtering. Add a consistent search affordance and clear
  action, keeping the existing domain filters and permission checks.
- Give filter controls sufficient height, line-height and width, and let rows
  wrap before their selected values become unreadable. Keep overflow contained
  in the table at mobile widths.
- Highlight case-insensitive, accent-insensitive matching search terms in visible
  result cells without rendering user input as HTML or disrupting links/forms.
- Replace text-only previous/next blocks with a compact footer containing the
  result range, rows-per-page control, and neutral first/previous/next/last icon
  buttons with accessible Romanian names and correct disabled states.
- Move page-size selection into that footer for paginated listings so the
  toolbar prioritizes search, filters and useful actions.
- Show column-selection controls as icon-only triggers with accessible labels
  and tooltips; preserve column choices and selection behavior.
- Apply shared density, headings, hover/focus and empty-state treatment across
  all application tables: member/unit/Orgo views, membership and transfers,
  receipts, users, adult documents, inventory, audit, kitchen ingredient/report
  tables and member history. Apply the same presentation to editable tariff
  tables and reports while preserving editing/total/export semantics.
- Replace bespoke pagination in related tabular lists with the same common
  controls rather than leaving older navigation patterns alongside new ones.

## Impact And Validation

- New documented capability: `table-experience`.
- Shared table components, theme styles, search-highlighting utility and the
  application table/list consumers. No React/MUI runtime is added.
- No database migration, payment calculation, member authorization or mutation
  workflow changes are required for this refactor.
- Verify search order, accent-insensitive highlights, paging, page-size changes,
  column controls, filtered selection, readable filters and mobile overflow.
- Run web typecheck/build/tests, changed-file lint/format, and representative
  browser regression scenarios across the affected workspaces.

## Approval Status

Approved by the user on October 25, 2026: `Da, implementează propunerea
(recomandat)`. The profile/CIC bug fixes are delivered independently.
