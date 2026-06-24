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
The national Scouts management system used for single sign-on and member reference data. Orgo data can be operationally stale for local age-branch or unit assignment.
_Avoid_: Local member database

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
A planned scouting activity such as a camp, hike, festival, training, or other organized program effort. An activity can have participants, fees, expenses, documents, and a budget report.
_Avoid_: Event, eveniment, camp as the generic umbrella

**Document financiar**:
An accounting-relevant file or record such as an invoice, fiscal receipt, POS receipt, payment proof, or bank statement. A financial document can be linked to an activity or kept as a general organization document.
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
The user who creates an activity and is responsible for managing that activity's participants, expected fees, expenses, and supporting documents.
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
A person known to Centrul Local Cluj, either a beneficiar or an adult. Members can be referenced from Orgo and managed locally when local operational data differs.
_Avoid_: User

**Baza locală de membri**:
The local member database managed inside Scouts Cluj Utilities for operational fields such as current unit, age branch, local roles, and activity participation. Manual local member updates should be synchronized back to Orgo when Orgo supports the changed field.
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
