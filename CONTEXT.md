# Scouts Cluj Utilities

Scouts Cluj Utilities is the internal utilities platform for Centrul Local Cluj. User-facing app content is Romanian with Romanian special characters.

## Language

**Responsabil financiar**:
An internal trusted person who reviews financial activity, reconciles payments, follows missing documents, and prepares finance-facing reports.
_Avoid_: Financial representative, Keez

**Keez**:
The external finance partner system that receives fiscal documents and accounting handoff metadata.
_Avoid_: Responsabil financiar

**Orgo**:
The national Scouts management system used for single sign-on, member source of truth, and canonical API-owned objects such as events, users, units, local centers, roles, and event registrations. Scouts Cluj Utilities should prefer Orgo as the base record and attach local operational layers such as finance details, meal planning, and local workflow state. Current SSO success-token login is identity-only for this app; future Orgo API integrations must use either a tenant-scoped `Api-Token`/JWT for documented API endpoints or a confirmed OAuth authorization-code token if Orgo supports the target endpoint. Do not treat the SSO `successToken` as an Orgo API bearer token.
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

**Plan de bucătărie**:
A local operational plan attached to an activitate for organizing meals, recipes, ingredients, attendance assumptions, procurement, and kitchen-facing exports. A plan de bucătărie can support any activitate with meal logistics, while camp activities are the primary initial use case. Each activitate has one primary plan de bucătărie.
_Avoid_: Camp Kitchen Planner as the domain term, standalone camp kitchen detached from an activitate, separate scenario plans as the default

**Ingredient**:
A reusable food or kitchen supply item known to Centrul Local and used when building recipes, meal plans, ingredient totals, and procurement lists. Ingredients are shared across activities; plan-specific quantities, prices, and procurement state belong to the plan de bucătărie that uses them.
_Avoid_: Plan-owned ingredient as the default, grocery item when referring to the reusable catalog entry

**Catalog inițial de bucătărie**:
The reusable ingredients, recipes, and recipe ingredients imported from prior kitchen-planning exports to bootstrap the shared kitchen catalog.
_Avoid_: Treating prior exports as a complete activity meal plan

**Rețetă**:
A reusable preparation definition made from one or more ingredients and a normal serving count. Recipes are shared across activities; assigning a recipe to a meal creates plan-specific serving assumptions and ingredient calculations.
_Avoid_: Meal, procurement item

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
The expected unit price used for kitchen planning before purchases are finalized. The shared ingredient catalog can provide a default estimate, while a plan de bucătărie may use plan-specific estimates for that activity.
_Avoid_: Actual purchase price

**Ajustare manuală de cantitate**:
A deliberate kitchen-planning override to the normal necesar de ingrediente, usually with a note explaining practical judgment such as buffer, waste, appetite, or packaging constraints.
_Avoid_: Editing the reusable recipe when only one activity needs a quantity change

**Familie de unități**:
A measurement group used for kitchen quantities, such as mass, volume, or count. Quantities can be normalized within the same family, such as grams to kilograms or milliliters to liters, but not across families unless an explicit ingredient-specific conversion exists.
_Avoid_: Guessing package, mass, and volume conversions

**Aprovizionare**:
The operational planning and tracking of ingredient purchasing for a plan de bucătărie, including suppliers, shopping quantities, status, and kitchen-facing notes. A procurement record may have related financial documents such as invoices or receipts, but the financial document remains the accounting-relevant record and follows the finance workflow.
_Avoid_: Document financiar as the procurement record itself

**Preț real de achiziție**:
The actual unit or total price recorded from a completed aprovizionare or related financial document.
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
The local member database managed inside Scouts Cluj Utilities for operational fields such as current unit, age branch, local roles, and activity participation. Manual local member updates should be synchronized back to Orgo when Orgo supports the changed field; otherwise they should be treated as local overrides or pending sync records, not a replacement source of truth.
_Avoid_: Orgo as the local source of truth

**Scouter**:
An adult who assists the organization broadly without being the trained leader responsible for direct beneficiary work.
_Avoid_: Lider

**Lider**:
A trained adult who works with beneficiaries and is attached to one or more units.
_Avoid_: Scouter

**Unitate**:
A local scouting group belonging to a ramură de vârstă, with its own lideri and adult helpers. Centrul Local Cluj currently has one unit per age branch.
_Avoid_: Patrolă, branch

**Șef de unitate**:
The adult representative responsible for a unit.
_Avoid_: Unit leader

**Consiliu**:
The local leadership council of Centrul Local Cluj.
_Avoid_: Board

**Președinte**:
The person leading the council and representing the local center.
_Avoid_: President

**Centrul Local**:
The Scouts Cluj local center as a whole, across units and age branches.
_Avoid_: Organization
