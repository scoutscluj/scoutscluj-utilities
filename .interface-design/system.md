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

- `DateInput.svelte` owns date entry across the app: visible `zz.ll.aaaa` with
  optional `oo:mm`, ISO form values, typed-date validation and a Bits UI calendar
  in Romanian with Monday first. Reuse it instead of browser-localized native
  date inputs. Preserve normal labels and required/min/max/readonly behavior.
- Activity administration starts with a compact publication bar: saved public
  state, public-page link and one explicit publish/withdraw action. Pending edits
  must be saved first; ended activities show their automatic withdrawal state.

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
  define the shared table layout. Put text search first, followed by filters,
  an icon-only columns trigger and optional plus action. Wrap controls before
  their labels or values become cramped; filters are 40px tall with 20px line
  height. Place page size in the footer beside four neutral 36px icon buttons
  for first/previous/next/last page. Show the current range, filtered total and
  loaded total when different. Offer 10, 25, 50, 100, 250, 500 and “Toate (total)”
  for local tables; respect server limits for inventory.
- Search ignores case and diacritics, matches every word independently, and
  highlights matching body text with native CSS ranges via `table-search.ts`.
  Keep links, inputs, selections and Svelte-owned text intact. `TableView.svelte`
  supplies the same controls for simple tables; report/editor tables keep all
  rows mounted and print/export all rows regardless of the on-screen filter.
- `/units` is the single browsing and management workspace. Per-row API capabilities
  control profile, fee, mutation and responsibility actions. Delegation uses a focused
  dialog on the member row; the unit table has plus buttons on fixed units and
  rename/archive menus only on configurable subunits. Management has no separate
  admin submenu. Old `/admin/members` links redirect to this workspace.
- Filter primary category independently of subunit, including Nerepartizat and
  De verificat. Show structure and category beneath the member name. Basic roster
  rows without private-profile access have plain names rather than broken links.
- Avoid redundant eyebrows, subtitles and “Registru” headings on the member
  screens. Use one page title and a compact inline member/unit summary.

- `FormFeedback.svelte` presents submission errors as prominent alerts, with optional links to affected fields. Error panels receive focus; ordinary success messages do not steal input focus.
- The fixed activity agreement editor places a live PDF preview beside its fields on desktop and below them on mobile. Reuse PDF.js for page navigation and zoom; no browser PDF plugin is required. Keep common activities separate from optional activities selected by participant unit, and equipment as an add/remove list.
- Participant handoff uses explicit, revision-checked receipt actions for physical agreements and cash-only tranches. Display the exact cash amount and already-completed states; combine document/cash confirmation atomically. Existing installment plans change only after explicit application of a saved plan.

## Implementation

The Interface Design and official shadcn-svelte agent skills are installed.
Follow their composition and accessibility guidance. The current app uses
scoped CSS and Bits UI directly; reuse them rather than introducing a parallel
Tailwind setup merely to restyle existing pages. The shared wrappers are local
components around existing Bits UI, not generated registry components.

Validate interaction changes with the synthetic local API and Playwright suite
in `apps/web/e2e`, including desktop/mobile screenshots. Do not test mutations
against production.
