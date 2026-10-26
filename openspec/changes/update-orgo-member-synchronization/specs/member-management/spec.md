## ADDED Requirements

### Requirement: Fresh roster on workspace opening

The system SHALL show cached authorized member data immediately and request an
Orgo refresh on each opening of the member workspace. It SHALL expose refresh
progress, last successful completion, failure and retry. Concurrent refresh
requests MAY share an in-progress center-scoped run.

#### Scenario: Reactivated member is discovered

- **GIVEN** a member was suspended or inactive in Orgo and is now active
- **WHEN** an authorized user opens the member workspace
- **THEN** refresh discovers or updates the member by canonical Orgo ID
- **AND** the main table updates their active visibility without manual import
- **AND** ended responsibilities and elevated permissions do not resume

#### Scenario: Orgo fails or returns an incomplete roster

- **WHEN** a refresh fails or cannot establish pagination completeness
- **THEN** cached authorized data remains available with visible failure and retry
- **AND** the run does not advance the last successful refresh timestamp
- **AND** missing rows do not cause inferred withdrawal or deletion

### Requirement: One member table across lifecycle statuses

The system SHALL present authorized active, suspended, inactive and withdrawn
members through one main table with shared search, status filters, sorting,
counts, pagination and selection, without a separate inactive-history table.

#### Scenario: Search for an inactive member

- **WHEN** a user chooses all statuses or the matching inactive status and searches
- **THEN** the matching member appears in the main table with their actual status
- **AND** structure and field visibility restrictions still apply

### Requirement: Resurse ownership of local organization

The system SHALL preserve established Resurse structure, category, unit/subunit
placement and local responsibilities during Orgo reconciliation. Local-only
organization changes SHALL NOT enqueue remote structure writes.

#### Scenario: Orgo organization differs from local placement

- **WHEN** refresh observes different Orgo type, unit or role data
- **THEN** established local placement remains unchanged
- **AND** no authority is automatically granted from the remote role

### Requirement: Durable automatic delivery of shared edits

The system SHALL save shared edits and delivery intentions atomically, including
withdrawal and reactivation. It SHALL attempt delivery promptly, retry temporary
failures automatically and report confirmed remote success only after readback.

#### Scenario: Orgo is temporarily unavailable during a local edit

- **WHEN** an authorized user changes a supported shared field
- **THEN** the local change is saved with a visible pending operation
- **AND** delivery retries automatically after temporary failure or worker restart
- **AND** an incoming unchanged remote baseline does not erase the pending edit

#### Scenario: Permission or mapping prevents remote delivery

- **WHEN** the token cannot edit or the operation lacks a verified mapping
- **THEN** the local change remains visibly unsynchronized with the actionable reason
- **AND** the system does not report remote success or use the SSO token as fallback

#### Scenario: A write may have succeeded before a timeout

- **WHEN** a remote write has an uncertain response
- **THEN** the worker reads back the affected values before attempting another write
- **AND** it cannot overwrite a newer local intent while committing the response

### Requirement: Orgo wins concurrent shared-field changes

The system SHALL compare each shared field with its last confirmed baseline.
If both sides changed that field differently, it SHALL automatically accept the
current Orgo value, retire the superseded local intent and record an audit event.
Unrelated pending fields SHALL remain eligible for delivery.

#### Scenario: Concurrent edits to a phone number

- **GIVEN** local and Orgo phone values both differ from the common baseline
- **WHEN** incoming reconciliation or outgoing preflight detects the difference
- **THEN** Resurse adopts the current Orgo phone without manual conflict selection
- **AND** unrelated local changes continue to synchronize

### Requirement: Shared lifecycle with preserved history

The system SHALL distinguish suspension, inactivity and withdrawal using verified
status mapping and provenance. Withdrawal SHALL end center-wide involvement
and responsibilities, retain history and enqueue the corresponding Orgo status.
Reactivation SHALL NOT restore ended mandates or elevated permissions.

#### Scenario: Withdrawal initiated in Resurse

- **WHEN** an authorized user withdraws a member in Resurse
- **THEN** local involvement and authority end with history preserved
- **AND** the matching Orgo status change is queued and delivered when supported
- **AND** an unchanged remote baseline does not reverse the pending withdrawal

#### Scenario: Orgo status changes concurrently with pending withdrawal

- **WHEN** Orgo changed status differently from the saved baseline during a pending local withdrawal
- **THEN** the current Orgo status wins and its lifecycle effects are reconciled
- **AND** ended privileges do not resume and past financial evidence is not rewritten

#### Scenario: Unknown status code

- **WHEN** Orgo returns an unmapped status
- **THEN** the record is marked for review with its source status retained
- **AND** the system does not assume active membership or global withdrawal
