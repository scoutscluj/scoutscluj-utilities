# Scouts Cluj Utilities

Scouts Cluj Utilities is the internal utilities platform for Centrul Local Cluj. User-facing app content is Romanian with Romanian special characters.

## User Experience

Users may have little technical experience. Keep everyday tasks prominent, use
plain Romanian labels and action-specific confirmations, and reveal occasional
administrative settings only when needed. Hide unavailable navigation entries.
Keep the sidebar fixed to the viewport with independently scrollable navigation;
on mobile, provide a clear close action and keyboard access without scrolling
the background page. Filter dependent choices so users cannot accidentally
select a subgroup from another unit.

## Language

**Responsabil financiar**:
An internal trusted person who reviews financial activity, reconciles payments, follows missing documents, and prepares finance-facing reports.
_Avoid_: Financial representative, Keez

**Keez**:
The external finance partner system that receives fiscal documents and accounting handoff metadata.
_Avoid_: Responsabil financiar

**Orgo**:
The national Scouts management system used for single sign-on, member source of truth, and canonical API-owned objects such as events, users, units, local centers, roles, and event registrations. Scouts Cluj Utilities should prefer Orgo as the base record and attach local operational layers such as finance details, meal planning, and local workflow state. Current SSO success-token login is identity-only for this app; future Orgo API integrations must use either a tenant-scoped `Api-Token`/JWT for documented API endpoints or a confirmed OAuth authorization-code token if Orgo supports the target endpoint. Do not treat the SSO `successToken` as an Orgo API bearer token. Member writes may fall back from disabled or explicitly rejected (401/403) server access to the original actor’s encrypted OAuth access token, with current local authorization, center validation, readback and credential-mode audit. Uncertain writes do not switch credentials for an immediate duplicate attempt.
_Avoid_: Local member database as source of truth

**Stripe**:
The online payment processor intended for collecting payments such as camp fees and annual scout fees.
_Avoid_: BT, Keez

**BT**:
The bank whose account and card transactions are used as the source for reconciliation and financial statistics.
_Avoid_: Stripe, Keez

**Tranzacție BT**:
A bank or card transaction imported from BT statements and used for reconciliation, statistics, and document coverage checks.
_Avoid_: Document financiar

**Activitate**:
A planned scouting activity such as a camp, hike, festival, training, or other organized program effort. An activitate should be created from, linked to, or synchronized with an Orgo event whenever possible, then extended locally with participants, fees, expenses, documents, meal planning, and budget reports.
_Avoid_: Event, eveniment, camp as the generic umbrella unless referring to the Orgo event object

**Prezentare activitate**:
The always-available landing page for one activitate, used for orientation and high-level operational status. Opening an activitate from navigation lands here; it is not a departament de activitate.
_Avoid_: Department, tab, submenu item, settings page

**Setări activitate**:
The administrative area for changing the local details and enabled departments of one activitate. It controls the activity container itself and is not a departament de activitate.
_Avoid_: Department, delivery workspace, global settings

**Departament de activitate**:
A named operational area inside an activitate that owns a coherent slice of planning or delivery, such as finance, kitchen, program, or logistics. Departamentele de activitate are activity-scoped responsibility areas chosen for each activitate from a standard set, not standalone global modules.
_Avoid_: Tab, UI section, global module

**Departament administrativ**:
The activity-scoped responsibility area for administrative work. It contains features such as `Acord parental`; those features appear inside the department and are not modeled as separate departamente de activitate.
_Avoid_: Acord parental as a department, global Administrare

**Plan de bucătărie**:
A local operational plan attached to an activitate for organizing meals, recipes, ingredients, attendance assumptions, procurement, and kitchen-facing exports. A plan de bucătărie can support any activitate with meal logistics, while camp activities are the primary initial use case. Each activitate has one primary plan de bucătărie.
_Avoid_: Camp Kitchen Planner as the domain term, standalone camp kitchen detached from an activitate, separate scenario plans as the default

**Ingredient**:
A reusable food or kitchen supply item known to Centrul Local and used when building recipes, meal plans, ingredient totals, and procurement lists. Ingredients are shared across activities; plan-specific quantities, prices, and procurement state belong to the plan de bucătărie that uses them.
_Avoid_: Plan-owned ingredient as the default, grocery item when referring to the reusable catalog entry

**Catalog inițial de bucătărie**:
The reusable ingredients, recipes, and recipe ingredients imported from prior kitchen-planning exports to bootstrap the shared kitchen catalog.
_Avoid_: Treating prior exports as a complete activity meal plan

**Catalog de bucătărie**:
The shared reusable collection of ingredients, recipes, and recipe condiment notes used across activities. Editing the catalog changes what future and current kitchen plans can reuse; activity-specific quantities, assignments, procurement, and snapshots belong to the plan de bucătărie.
_Avoid_: Activity-specific meal plan, procurement list

**Rețetă**:
A reusable preparation definition made from one or more ingredients and a normal serving count. Recipes are shared across activities; assigning a recipe to a meal creates plan-specific serving assumptions and ingredient calculations.
_Avoid_: Meal, procurement item

**Condimente**:
Unquantified recipe guidance such as spices, seasoning, and preparation notes that should be visible when cooking but should not affect ingredient totals, shopping lists, or cost estimates by default. When a condiment or note must be bought and counted for planning, it should be promoted to a normal ingredient with a quantity.
_Avoid_: Quantified recipe ingredient, procurement item, recipe description

**Scalare rețetă**:
The way a recipe assignment is adjusted from its normal serving count to the expected prezență la masă. Scaling is proportional by default and may be rounded to whole batches when the assigned recipe requires it.
_Avoid_: Always rounding every recipe up to a whole batch

**Prezență la masă**:
The expected number of people eating a specific meal in a plan de bucătărie. It normally follows the plan's participant assumption, but can be adjusted when a meal serves only part of the activity.
_Avoid_: Orgo registration count unless the value is directly sourced from Orgo

**Subgrup de masă**:
A named group used to split or override prezență la masă for a specific meal, such as a hike group, excursion group, unit, or adult team.
_Avoid_: Permanent unit or Orgo group unless the subgroup is linked to that source

**Masă**:
A planned eating moment inside a plan de bucătărie, assigned to one of the standard meal slots and optionally distinguished by context or name when different groups eat separately.
_Avoid_: Rețetă, procurement event

**Rețetă atribuită**:
A recipe as copied into a specific masă inside a plan de bucătărie, including the recipe name, normal servings, quantified ingredients, condimente, and estimated price context used at assignment time. Later shared catalog edits should not silently change a rețetă atribuită; coordinators may explicitly refresh it from the catalog when appropriate.
_Avoid_: Live shared recipe, automatic post-event snapshot

**Zi de bucătărie**:
A date covered by a plan de bucătărie. Kitchen days are created from the activity's date range and are reviewed rather than silently deleted when activity dates change.
_Avoid_: Silently replacing planned meals when activity dates change

**Slot de masă**:
One of the standard daily kitchen planning slots: `Mic dejun`, `Gustare 1`, `Prânz`, `Gustare 2`, or `Cină`. Multiple meals may share the same slot when their context or served group differs.
_Avoid_: Free-form meal type list as the default

**Necesar de ingrediente**:
The quantity of ingredients needed for a meal, day, or entire plan de bucătărie based on selected recipes and prezență la masă.
_Avoid_: Procurement quantity, purchased quantity

**Preț estimat ingredient**:
The expected unit price used for kitchen planning before purchases are finalized. The shared ingredient catalog can provide a default estimate; a rețetă atribuită stores the estimate used at assignment time, and aprovizionare can override estimates for a specific activity source.
_Avoid_: Actual purchase price

**Ajustare manuală de cantitate**:
A deliberate kitchen-planning override to the normal necesar de ingrediente, usually with a note explaining practical judgment such as buffer, waste, appetite, or packaging constraints.
_Avoid_: Editing the reusable recipe when only one activity needs a quantity change

**Familie de unități**:
A measurement group used for kitchen quantities, such as mass, volume, or count. Quantities can be normalized within the same family, such as grams to kilograms or milliliters to liters, but not across families unless an explicit ingredient-specific conversion exists.
_Avoid_: Guessing package, mass, and volume conversions

**Aprovizionare**:
The operational planning and tracking of how needed ingredients and supplies reach a plan de bucătărie, including items brought from the local center, bought during shopping runs, ordered for delivery, or sourced from suppliers. A procurement record may have related financial documents such as invoices or receipts, but the financial document remains the accounting-relevant record and follows the finance workflow.
_Avoid_: Shopping-only list, document financiar as the procurement record itself

**Sursă de aprovizionare**:
The origin or fulfillment route for needed kitchen items, such as local center stock, a shopping run, a supplier order, a delivery, or a named person bringing items. A source can group multiple ingredients so coordinators know what comes from where.
_Avoid_: Ingredient category, financial document

**Tranșă de aprovizionare**:
A practical portion of needed ingredients assigned to a source for a shopping run, delivery, local stock pickup, or camp period. Longer activities may split perishable or storage-limited ingredients into multiple tranșe de aprovizionare, organized around upcoming meals rather than strict date ranges.
_Avoid_: Treating every ingredient need as one purchase at the beginning of camp

**Preț real de achiziție**:
The actual unit or total price recorded from a completed aprovizionare source, shopping run, delivery, or related financial document.
_Avoid_: Preț estimat ingredient

**Jurnal de audit**:
The app-wide record of important user or system actions, used to answer who did what, to which record, and when. Module-specific history can provide workflow detail, but important changes should also be represented in the central audit journal. Coordinators may see audit entries for their own activities; elevated roles may see the entries relevant to their area of responsibility.
_Avoid_: Server logs as the audit source of truth

**Document financiar**:
An accounting-relevant file or record such as an invoice, fiscal receipt, POS receipt, payment proof, or bank statement. A financial document can be linked to an activity, related to operational records such as aprovizionare, or kept as a general organization document.
_Avoid_: Attachment, file

**Stare document financiar**:
The review and handoff state of a financial document: `Încărcat`, `În verificare`, `Gata de trimis`, `Trimis`, `Necesită clarificări`, `Respins`, or `Arhivat`.
_Avoid_: File status

**Document lipsă**:
A financial transaction that requires supporting documentation but does not yet have a linked financial document.
_Avoid_: Missing file

**Contabil**:
The accountant or accounting team working through Keez who records and validates submitted accounting documents.
_Avoid_: Responsabil financiar

**Taxă de participare**:
The amount expected from a participant for a specific activity. Its collection status can be tracked manually before it is reconciled with bank transactions.
_Avoid_: Stripe payment

**Înscriere la activitate**:
The local operational registration linking an Orgo member to an activity. Participation, payment coverage and parental consent have independent states. A public exact-ID payment lookup cannot expose private registration answers. A local registration does not claim successful registration in Orgo.
_Avoid_: Treating a payment attempt or downloaded agreement as confirmed participation

**Susținere din centrul local**:
An explicitly recorded contribution by the local center toward an activity participation fee. It reduces the participant's balance and remains separate from cash, bank and card receipts.
_Avoid_: Money collected from the participant

**Restituire aprobată**:
The amount authorized for reimbursement, tracked independently of completed refunds. Planning a reimbursement does not initiate a transfer or alter an existing card receipt.
_Avoid_: Refund already paid

**Coordonator**:
The user who creates an activity and is responsible for managing that activity's participants, expected fees, expenses, supporting documents, meal planning, and kitchen procurement.
_Avoid_: Organizator

**Ramură de vârstă**:
A scouting age branch grouping beneficiaries by school/age stage: `Lupișori`, `Temerari`, `Exploratori`, or `Seniori`.
_Avoid_: Branch

**Lupișori**:
The age branch for beneficiaries in grades 1 through 4.
_Avoid_: Cubs

**Temerari**:
The age branch for beneficiaries in grades 5 through 8.
_Avoid_: Scouts

**Exploratori**:
The age branch for beneficiaries in grades 9 through 12.
_Avoid_: Explorers

**Seniori**:
The age branch for young members up to 24 years old.
_Avoid_: Seniors

**Adult**:
The general category for adult organization members. Adults can be scouteri, lideri, unit leaders, council members, or other adult volunteers.
_Avoid_: Voluntar adult as the generic umbrella

**Beneficiar**:
A youth member served by the scouting program, belonging to an age branch from Lupișori through Seniori.
_Avoid_: Child, participant as the generic person type

**Membru**:
A person known to Centrul Local Cluj, either a beneficiar or an adult. The source of truth for member identity and canonical member data is Orgo; the local platform may cache and enrich members for operational workflows.
_Avoid_: User

**Baza locală de membri**:
The local member database managed inside Scouts Cluj Utilities for operational fields such as current unit, age branch, local roles, and activity participation. Shared identity, supported profile and lifecycle changes are saved with a transactional outbox and synchronized to Orgo automatically. Orgo wins competing edits to the same shared field. Local structures, categories, unit/subunit placement, grade and responsibilities are owned by Resurse and are preserved during refresh. Unsupported shared writes remain explicitly unsynchronized.
_Avoid_: Orgo as the local source of truth

**Scouter**:
An adult who assists the organization broadly without being the trained leader responsible for direct beneficiary work.
_Avoid_: Lider

**Lider**:
An adult who has taken the leader promise, works with beneficiaries, and is attached to one or more units. A member enrolled as a Senior beneficiary can help as an adult volunteer but cannot simultaneously hold leader status.
_Avoid_: Scouter

**Unitate**:
An immutable primary category within one structure. Cluj and Florești each have exactly seven units: Lupișori, Temerari, Exploratori, Seniori, Lideri, Voluntari adulți and Scouteri. A member has one primary category; responsibilities never change that category or grant authority through it.
_Avoid_: Patrolă, branch

**Șef de unitate**:
The adult representative responsible for a unit.
_Avoid_: Unit leader

**Subunitate (subgrupă de unitate)**:
A configurable stable group within a unit, with one or more responsible adults. A Temerari cohort retains its identity and responsible adults as its school grade advances. A beneficiary has at most one current subgroup. Units can also work as one common collective.
When a unit has no active subunits, leader/helper responsibilities target the common collective without selecting a subgroup. A common-collective mandate grants access to ungrouped members of that unit, not to other subunits. Responsibility and ordinary unit-transfer choices use the edited member's current structure, including for central administrators; changing primary structure remains a separate explicit operation. A leader's group column lists the units of their active responsibilities, while their primary category remains unchanged. School grade applies only to Lupișori, Temerari and Exploratori. Adult categories and Seniori have no school-grade field. A leader/chief promise date is optional; a supplied date cannot be in the future, and verified adult age and Seniori ineligibility still apply.
_Avoid_: Treating the school grade as the group's identity

**Retras din activitate**:
A global member status ending all current involvement in the local center, with history preserved. Withdrawal/reactivation initiated in Resurse is synchronized to Orgo. Incoming reactivation restores active visibility and preserves known local placement; missing placement requires review. Current-year fee eligibility applies, and ended responsibilities and administrator privileges do not automatically resume.
_Avoid_: Leaving only one subgroup or unit

**Fișa membrului**:
The versioned reusable personal, contact, emergency and medical information maintained for operational member management and authorized activity-registration prefill. Internal leader notes have separate restricted visibility. Activity registration and the generated/signed parental-consent PDF remain distinct workflows.
_Avoid_: Treating profile confirmation as a signed parental consent

**Consiliu**:
The local leadership council of Centrul Local Cluj.
_Avoid_: Board

**Președinte**:
The person leading the council and representing the local center.
_Avoid_: President

**Centrul Local**:
The Scouts Cluj local center as a whole, across units and age branches.
_Avoid_: Organization

## Local structures and admission evidence

Cluj and Florești are explicit local structures within the same configured Orgo center. Each member has one persisted primary structure and one primary category, plus at most one primary subunit. Only subunits are configurable. Adults see the basic roster in their own structure; private profiles, medical data, contacts, notes and fees require separate grants. Only explicit central Cluj administrators or active Cluj Council mandates can see both structures. Responsibilities in another structure never bypass the server's structure gate. Council alone transfers primary affiliation.

Delegation follows central administration/Council → structure responsible → unit chief → designated subunit leader/helper. Structure responsibles appoint chiefs; chiefs appoint leaders/helpers within their own units. Leaders/helpers cannot delegate. Parent mandates and expiry are checked on each request, and ending a parent removes dependent authority. The main `/units` workspace owns all permitted management actions, including responsibility dialogs on member rows and subunit menus in the unit table. Former `/admin/members` page links redirect there.

Initial affiliation is persisted once using accent-insensitive Florești matching on Orgo names, with remaining names assigned to Cluj. Unconfirmed values can be corrected in `/units/structures`; later renames and sync never reclassify structure. Explicit Orgo categories work without subunit assignment. Missing/contradictory categories are marked De verificat, not inferred from age or responsibilities. The migration retains original rows in `member_organization_migration`; legacy root units remain as source/history records rather than editable catalog entries. Existing subgroups move to `ScoutSubunit`, and Orgo source aliases are stored separately. Duplicate chief mandates and incompatible cross-structure assignments require central reconciliation. Import excludes Orgo patrol types and descendants; selected source units become explicitly chosen subunits of fixed units. All authorized member statuses share one main table with common search, status filters and pagination. Each workspace opening requests fresh Orgo data while showing cached rows, with visible progress, last success and failure/retry. Complete refresh discovers new identities and reconciles lifecycle status without importing privileges. Pending local edits survive unchanged Orgo baselines; temporary delivery failures retry automatically with readback after uncertain writes. Annual progression remains disabled unless explicitly enabled; it uses only the four youth branches in the same structure and queues unclear destinations for review.

Manual admission allocations are a distinct ledger linked to actual bank/cash receipts and canonical Orgo identity. Receipt availability sums membership and admission allocations and subtracts refunds. All financial writes share advisory lock 9212026; transfers and classification take this lock before member lock 19102026. Historical manual admission can be recorded independently of the six-month online eligibility rule. Partial admission can be completed online; checkout snapshots the expected integral amount to prevent a later manual correction turning the remainder into an integral admission. Persisted affiliation determines new admission tariffs, including initially classified members awaiting confirmation; name-based pricing is used only when no local member record exists. Paid evidence and documented historical amounts remain stable across names and periods.
