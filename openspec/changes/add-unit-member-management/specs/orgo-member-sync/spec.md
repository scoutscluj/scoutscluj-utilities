## ADDED Requirements

### Requirement: Server-token-first member synchronization

The system SHALL use the local platform as the primary operational management
surface, preserve Orgo canonical identity, and prefer server-to-server
`Api-Token` for supported member, unit, assignment and status operations. It
SHALL validate actual ONCR mappings and token capabilities per operation and
scope access to the configured local center. It SHALL NOT infer remote authority
from a local role, a successful login or the existence of public API documentation.

#### Scenario: Server token permits an assignment update

- **WHEN** an authorized local change maps to a verified Orgo operation
- **THEN** the worker uses the server token and validates the target center and relations
- **AND** the operation is marked synchronized only after the remote result is verified

### Requirement: Durable pending operations and explicit delegation

The system SHALL persist local mutations, safe audit context and synchronization
intent atomically. Denied or unsupported remote operations SHALL retain the
local result and an actionable Romanian synchronization status. It SHALL NOT
automatically substitute an authenticated user's token. Supported delegated
execution SHALL require an explicit actor-bound choice and fresh authority
checks; existing national fee-marking credential policy SHALL remain unchanged.

#### Scenario: Server token cannot change withdrawn status

- **WHEN** Orgo denies a queued withdrawal operation
- **THEN** local withdrawal and privilege revocation remain effective
- **AND** administrators see the pending operation and permission reason
- **AND** no user token is silently selected

#### Scenario: Explicit delegated attempt is selected

- **GIVEN** the operation supports delegated authorization and an authorized actor explicitly chooses it
- **WHEN** the job executes
- **THEN** actor, credential mode and current permissions are checked and recorded
- **AND** a token that cannot perform the operation leaves an actionable pending result

### Requirement: Conflict-aware and idempotent reconciliation

The system SHALL reconcile field-level local revisions against a known remote
baseline and fresh remote data. Conflicting changes SHALL require authorized
resolution rather than silently overwrite either side. Retries SHALL use durable
claims and dependency ordering, with readback before retrying uncertain writes
and no blind duplicate member or assignment creation. Failed or incomplete
reads SHALL NOT cause withdrawal or remove local pending changes.

#### Scenario: Both systems change a member's assignment

- **WHEN** fresh Orgo data differs from the baseline and an unconfirmed local change
- **THEN** a conflict is presented with sufficient authorized context
- **AND** the local pending assignment is not silently overwritten by roster refresh

#### Scenario: Member-creation response is lost

- **WHEN** Orgo may have accepted creation but the response is uncertain
- **THEN** the worker verifies the remote result before resubmission
- **AND** an ambiguous identity match is reviewed instead of automatically merged
- **AND** dependent assignment jobs wait for verified identity linkage

#### Scenario: Local data changes while a response is pending

- **WHEN** an old sync response arrives after a manual correction
- **THEN** the worker does not mark the newer revision as synchronized or overwrite it
