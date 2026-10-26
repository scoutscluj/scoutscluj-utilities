## ADDED Requirements

### Requirement: Actor-bound credential fallback
The system SHALL prefer enabled server writes and use the original modifying
actor's encrypted OAuth access token when server writes are disabled or explicitly
rejected with 401/403. It SHALL revalidate current local authority, validate the
remote center/identity, verify writes by readback and audit credential mode.

#### Scenario: Server write rejected
- **WHEN** the server rejects a supported member write with HTTP 403
- **THEN** the same authorized actor's OAuth token may deliver the intent and read back the result
- **AND** another signed-in user's token is never selected implicitly

#### Scenario: Ambiguous network response
- **WHEN** a write times out or returns a temporary server failure
- **THEN** execution remains uncertain and verifies remote state before retrying
- **AND** credentials are not switched to perform a second immediate write

#### Scenario: Missing token or lost authority
- **WHEN** the actor has no usable OAuth token or no longer has local edit rights
- **THEN** delivery remains blocked with an actionable message and no delegated write

#### Scenario: Explicit administrative retry
- **WHEN** an authorized administrator explicitly retries a blocked operation
- **THEN** the retry may use that administrator as its actor after current authorization
- **AND** the previous and replacement actor are recorded in audit
