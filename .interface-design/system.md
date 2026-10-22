# Scouts Cluj product interface

## Intent and domain

Volunteer leaders manage members, units, groups, branch progression, activities,
and contributions. The register is the focal point: identifying a person and
choosing a precise action should take little effort. Keep Romanian domain labels.

The visual world comes from the red Scouts identity, white forms, charcoal ink,
quiet grey work surfaces, and green confirmation marks. Preserve the Scouts and
ONCR marks. Unit, branch, and structure names supply the product's identity.

Use one restrained red accent for actions and navigation. Reserve green for
success. Avoid competing red/green navigation, excessively bold table metadata,
and row expansions that move the rest of the register.

## Foundation

- Shared tokens: `apps/web/src/lib/styles/theme.css`; use `--sc-*` variables.
- Keep the existing sans-serif font stack. Body 14–16px; metadata 12–13px;
  section headings 18–20px; page headings 28–32px. Weight 600 for emphasis,
  400–500 for supporting text. Page headings use slightly tighter tracking.
- Spacing base: 4px. Page padding 24px desktop / 16px mobile. Control height
  38px; row action and close buttons 36px. Control radius 7px, surfaces 10px,
  dialogs 14px. Keep useful table density rather than oversized cards.
- Neutral canvas, white surfaces, inset form controls, quiet borders. Elevate
  menus and dialogs with the shared shadow. Keep semantic status colors.
- Preserve keyboard focus rings, disabled states, reduced motion, mobile
  navigation, and horizontal scrolling contained inside wide tables.

## Components and interaction

- `ActionMenu.svelte`: accessible Bits UI dropdown, ellipsis trigger with the
  person's/unit's name in its accessible label, 36px items. Each entry names
  one operation. Destructive entries use the red semantic treatment.
- `Modal.svelte`: accessible Bits UI dialog with title, description, close
  button, backdrop, scrollable content, focus containment and Escape dismissal.
  Width up to 600px; leave 16px viewport margins. Use for focused edits and
  confirmations, preserving the table beneath it.
- Member changes retain server preview, revision/version checks, explicit
  confirmation, and existing permissions. Opening a menu never submits a change.
- Table selection uses the header checkbox for the current page; there is no
  duplicate select-all-results button. Changing filters removes hidden member
  selections. Select the “Toate (total)” page size before selecting all matches.
- Member tables: sortable headers with `aria-sort`, page-size controls,
  optional columns, selected-row tint, explicit empty state and pagination.
- Users: searchable identities, role filter, name sorting and pagination.
- `TableToolbar.svelte`, `TablePageSize.svelte`, and `TablePagination.svelte`
  define the shared table layout for members, users, cotizații and receipts.
  Put filters, page size, columns and optional plus action on one desktop row;
  wrap controls at mobile widths. Controls are 36px tall, labels 12px, gaps
  10–12px. Footer shows the current range, filtered total and loaded total when
  different. Offer 10, 25, 50, 100, 250, 500 and “Toate (total)” page sizes.
- `/units` is the compact browsing view. Creation, bulk changes, units/groups,
  annual progression, initial classification and Orgo administration live under
  `/admin/members`. Keep API-owned permissions, including delegated unit leaders.
  Add a member with an accessible plus button in the management table toolbar.
- Avoid redundant eyebrows, subtitles and “Registru” headings on the member
  screens. Use one page title and a compact inline member/unit summary.

## Implementation

The Interface Design and official shadcn-svelte agent skills are installed.
Follow their composition and accessibility guidance. The current app uses
scoped CSS and Bits UI directly; reuse them rather than introducing a parallel
Tailwind setup merely to restyle existing pages. The shared wrappers are local
components around existing Bits UI, not generated registry components.

Validate interaction changes with the synthetic local API and Playwright suite
in `apps/web/e2e`, including desktop/mobile screenshots. Do not test mutations
against production.
