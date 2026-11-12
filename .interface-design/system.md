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

### Responsive workspaces and appearance

- Appearance offers Sistem / Luminoasă / Întunecată in the profile menu. Persist
  the preference in this browser, apply it before first paint, and follow device
  changes in System mode. Use shared semantic tokens for canvas, surfaces, ink,
  borders, focus and statuses. Solid accent and readable accent text have separate
  tokens; do not put dark-theme pink text on a pale hardcoded background.
- Keep the mobile topbar compact. Orgo refresh runs in the background, with status
  and retry in a focused dialog available from the header/profile menu. It must
  not push page content down or reload entered form data.
- Mobile participant and member lists prioritize names, useful affiliation/class,
  quick actions and a context menu. Expand secondary details within the row.
  Put search and the filter trigger on one row; reveal filter controls on demand,
  count active filters and preserve a visible reset action.
- Use actual available content width for participant layout: the sidebar can
  leave tablet content narrower than the viewport breakpoint suggests. Menus and
  receipt actions remain reachable without scrolling the page horizontally.
- Activity settings and kitchen use one section selector on mobile. Financial
  summaries and advanced settings are progressive disclosures, preserving the
  original actions, validation and revision checks.
- Mobile interactive controls have 44px targets. Text contrast is at least 4.5:1;
  essential control boundaries at least 3:1. Verify rendered elements as well as
  tokens in light/dark at 320, 390, 768, 1024 and desktop widths.

The Interface Design and official shadcn-svelte agent skills are installed.
Follow their composition and accessibility guidance. The current app uses
scoped CSS and Bits UI directly; reuse them rather than introducing a parallel
Tailwind setup merely to restyle existing pages. The shared wrappers are local
components around existing Bits UI, not generated registry components.

Validate interaction changes with the synthetic local API and Playwright suite
in `apps/web/e2e`, including desktop/mobile screenshots. Do not test mutations
against production.

Run Svelte checks and the production build sequentially; both use generated
SvelteKit files. Browser acceptance waits for application initialization and
rejects runtime errors, in addition to inspecting the rendered layout.

- Activity registrations own participant handoff: physical agreement and cash receipts live in each table row, with exact amounts and the existing atomic combined action. Authorized readers open uploaded signed PDFs from that row; acceptance remains limited to consent administrators. At widths up to 760px, use simple divider-separated rows: name (up to two lines), current school grade, applicable agreement/cash buttons and the context menu. Tapping the name expands the other details and family selection. Quick receipt buttons open the existing explicit confirmation dialogs; never silently record a receipt. Keep 44px touch targets, filtering and pagination. Keep publication/link controls in one compact bar and secondary bulk actions in a disclosure. Legacy handoff and activity agreement pages redirect to registrations.

- Mobile participant receipt buttons use “AP” for the parental agreement. Confirmed paper/digital agreements and fully covered cash tranches retain a check mark with the stronger `--sc-success-control-*` background, text and border. Uploaded agreements awaiting review use an eye icon and orange `--sc-review-control-*` colors. The review dialog tells the leader that an online agreement requires a digital signature, not a handwritten signature, and asks them to inspect the PDF before accepting. Keep the cash button visible after completion; never show a completed cash state when no positive cash tranche applies. Outstanding cash keeps the exact remaining amount and a quiet blue treatment.

- Hide withdrawn activity registrations by default, including in unpaid/agreement follow-up filters. Offer explicit “Doar retrași” and “Toate, inclusiv retragerile” selections. Completed AP and cash controls open a confirmation modal before reverting. Retain uploaded documents, snapshot the revision and exact cash receipts, and use audited reversal entries rather than deleting financial history. Keep digital agreements accessible from the correction modal. Do not reverse cash coverage supplied by unrelated card/bank/support entries.

- The member workspace is named “Membri și unități”. Responsibility dialogs separate scope fields, a vertical permissions group and a full-width action footer. Enhanced submissions preserve entered data after errors and show a disabled pending action until revalidation completes. Unit management and Orgo sync tools use centered dialogs; transfer history remains in audit. Keep the active-member and unit counts beside the page title. Put Orgo refresh status and the manual refresh command in the “Actualizări Orgo” modal opened from the header context menu. Omit missing subgroup labels from member table rows, retaining the unassigned filter.
- Public activities emphasize the Romanian deadline above the registration actions, show practical program/transport/equipment information directly and use a branch selector only when needed. Keep the safety/privacy summary concise; the full agreement remains in the PDF. Specific activities and equipment use the shared list editor.
- Authenticated activity registration offers explicit “Salvează și continuă mai târziu”. Show private, unsubmitted drafts separately from completed registrations, with resume and confirmed discard actions. Guests see saving progress as a login benefit. Explain the identity provider as “Orgo (membri.scout.ro)” in prose while preserving short button labels.
