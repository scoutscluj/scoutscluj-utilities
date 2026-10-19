## ADDED Requirements

### Requirement: Operational member and unit registry

The system SHALL manage members independently of application accounts, link
verified identities to Orgo, and support age-branch units operating as a common
collective or with configurable subgroups. Each beneficiary SHALL have one
current unit and at most one current subgroup. Adults MAY have concurrent
responsibilities in several groups or units. Historical assignments SHALL be
preserved rather than destructively overwritten.

#### Scenario: Lupisori start without subgroups

- **GIVEN** the Lupisori unit operates with all beneficiaries together
- **WHEN** a chief later configures subgroups
- **THEN** members and responsible adults can be assigned to those subgroups
- **AND** each child's school grade remains recorded individually

#### Scenario: Stable Temerari cohort advances

- **GIVEN** a grade-5 group has beneficiaries and responsible adults
- **WHEN** its next school-year transition is applied
- **THEN** its class becomes grade 6 while its group ID and continuing assignments remain unchanged
- **AND** the group is not recreated merely because its class label changed

### Requirement: Scoped member administration

The system SHALL let leaders read current members, fee summaries, health data and
internal notes throughout their assigned unit while limiting mutations to their
own groups or assigned common collective. Unit chiefs SHALL manage all members
in their own unit. Council administrators SHALL manage members center-wide.
Contact, grade and health updates SHALL follow those scopes; name and birth-date
changes SHALL require the unit chief or council. Helpers SHALL receive only
basic assigned-group member visibility by default, with explicit chief-issued
grants for editing, fee viewing or sensitive data access.

#### Scenario: Leader reads another group in the same unit

- **WHEN** a leader opens a current member of another group in the same unit
- **THEN** the permitted unit-wide profile, health, notes and fee summary are readable
- **AND** member mutations are denied unless the actor independently holds a write grant for that member

#### Scenario: Chief edits another group's member

- **WHEN** a chief updates a member in any group of their unit
- **THEN** the update is permitted and audited
- **AND** being chief of one unit does not grant access to another unit

#### Scenario: Helper has no elevated grant

- **WHEN** a helper views their assigned group's roster
- **THEN** basic member data is shown
- **AND** health, internal notes, fees and editing are unavailable without the corresponding explicit grants

### Requirement: Structure and adult responsibility management

The system SHALL reserve unit creation, archival and chief appointment to council
administrators. Chiefs SHALL manage subgroups, adult assignments and helper
grants within their own unit. Chiefs and council SHALL be able to record leader
promises and grant scoped leader status only to eligible adults. Senior
beneficiaries MAY also be adult helpers but SHALL NOT hold leader status while
enrolled as seniors. Scouter status SHALL be assigned explicitly.

#### Scenario: Senior helps at another unit

- **GIVEN** a senior beneficiary helps at Temerari
- **WHEN** an authorized chief records the helper assignment
- **THEN** both involvements are retained independently
- **AND** neither the helper assignment nor recording a promise bypasses senior leader ineligibility

#### Scenario: Chief grants leader status

- **GIVEN** an eligible adult has a recorded leader promise
- **WHEN** the chief grants leader status within their unit
- **THEN** the assignment is recorded with actor and history
- **AND** the operation does not grant council or global administrative access

### Requirement: Member creation and manual transfer

The system SHALL allow leaders, chiefs and council to create and reactivate
members in their respective scopes, detect suspected duplicates, and show
unconfirmed Orgo creation explicitly. Manual transfers between units SHALL
require the source unit chief or council and notify the destination chief for
subgroup assignment. Manual updates SHALL remain available throughout the year.

#### Scenario: New member has not yet been created in Orgo

- **WHEN** an authorized leader adds a new member to their group
- **THEN** a local provisional identity is created with a visible sync state
- **AND** no verified Orgo ID or successful remote creation is fabricated
- **AND** suspected duplicates are presented for resolution

#### Scenario: Chief transfers a member to another unit

- **WHEN** the source chief selects a destination unit
- **THEN** the old beneficiary assignment is ended and the destination assignment is recorded
- **AND** the destination chief is notified to allocate a subgroup if applicable
- **AND** old-unit leaders lose live-profile access immediately unless another current responsibility authorizes it

### Requirement: Automatic September progression

The system SHALL apply school-year progression on 1 September in
Europe/Bucharest to prepare the scouting year beginning in October, without
requiring approval or a staff page visit. It SHALL advance individual grades,
apply branch transitions after grades 4, 8 and 12, keep continuing stable groups
with their responsible adults, and support explicit exceptions and subsequent
manual corrections. Runs SHALL be idempotent per target year and safe against
concurrent edits, with visible per-member outcomes and missing-data review.

#### Scenario: Temerari finish grade 8

- **WHEN** the September transition processes a graduating Temerari cohort
- **THEN** beneficiaries enter the common Exploratori collective
- **AND** the old group is archived with its history
- **AND** adult assignments to that group end without inventing new adult destinations

#### Scenario: Missing grade or conflicting cohort data

- **WHEN** progression cannot be determined from verified grade and exception data
- **THEN** the affected case is visible for review
- **AND** the system does not infer a school grade solely from age
- **AND** valid independent cases may complete without duplicating previous work

#### Scenario: Scheduled work is retried after downtime

- **WHEN** the annual worker catches up or retries an already claimed year
- **THEN** completed transitions are not applied twice
- **AND** saved manual corrections are not overwritten by stale progression inputs

### Requirement: Senior age-limit transition

The system SHALL convert a senior who has already reached 24 at the September
transition into an adult volunteer with no unit association. It SHALL end senior
and unit-helper assignments, preserve history and avoid automatically granting
scouter or leader status.

#### Scenario: Senior aged 24 also helps at a unit

- **WHEN** their September transition runs
- **THEN** they become an adult volunteer without a unit
- **AND** both the senior beneficiary assignment and existing unit-helper assignments end
- **AND** new unit responsibilities can subsequently be assigned manually

### Requirement: Global withdrawal and explicit return

The system SHALL let a leader withdraw a member in their management scope
immediately without chief approval. Withdrawal SHALL set the person's status to
`Retras din activitate`, end all current involvements and derived privileges,
preserve history, and enqueue Orgo synchronization. Reactivation SHALL require
an explicit current destination and SHALL NOT restore old adult responsibilities,
council mandates or access grants automatically.

#### Scenario: Senior helper withdraws

- **WHEN** an authorized leader marks the person withdrawn
- **THEN** both senior participation and helper responsibilities end immediately
- **AND** the system does not interpret withdrawal as leaving only one unit
- **AND** chief approval is not requested

#### Scenario: Member returns

- **WHEN** an authorized actor reactivates the member into a selected unit and optional subgroup
- **THEN** the current beneficiary assignment is recorded
- **AND** prior administrative privileges and adult roles remain ended
