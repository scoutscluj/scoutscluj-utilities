## ADDED Requirements

### Requirement: Verify missing identities and apparent center mismatches

Before rejecting an exact Orgo ID or card identifier because it is absent locally or appears outside the configured center, the system SHALL perform a targeted Orgo identity and affiliation check through a shared resolver. A confirmed in-center identity SHALL be reconciled by canonical ID and the original operation SHALL be reevaluated once under its current authorization and eligibility rules. The system SHALL NOT create a new Orgo identity, merge by name/email or grant access solely because the identity was discovered.

#### Scenario: Newly registered member is absent locally

- **WHEN** an exact identifier is absent locally and Orgo confirms the member belongs to the configured center
- **THEN** the local identity is upserted without duplication and the original request is reevaluated with its existing eligibility checks.

#### Scenario: Local affiliation is stale

- **WHEN** local data suggests another center but Orgo confirms current membership in the configured center
- **THEN** the application reconciles the affiliation before deciding the original request.

#### Scenario: Person belongs to another center

- **WHEN** Orgo confirms membership in another center
- **THEN** the identity is not silently imported as a local-center member or granted local access and explicit guest eligibility rules remain applicable.

#### Scenario: Remote verification is unavailable

- **WHEN** Orgo times out or returns 401, 403, 429 or a server error
- **THEN** the result is verification-unavailable rather than not-found or wrong-center and the interface offers retry without continuing actions that require confirmed affiliation.

#### Scenario: Public lookup and concurrent requests

- **WHEN** public requests concurrently look up the same exact identifier
- **THEN** they share the in-flight targeted check within server limits, do not start a global roster import and receive only the data permitted by that public flow.

### Requirement: Background inbound synchronization on application bootstrap

Every authenticated application bootstrap SHALL request an inbound Orgo synchronization without blocking initial rendering of authorized cached data. Concurrent bootstraps SHALL share a durable per-center run across users, tabs and processes. SPA navigation and polling SHALL NOT each start a new full import. A later bootstrap after completion SHALL request another run rather than being suppressed by a daily freshness gate. Ordinary users SHALL be able to request the job without gaining global roster read permissions.

#### Scenario: Two users open the application simultaneously

- **WHEN** authenticated application bootstraps overlap for the same center
- **THEN** only one inbound run is active and each user can observe only authorized refresh feedback and data.

#### Scenario: Reload after completion

- **WHEN** an authenticated user reloads after the previous run completed
- **THEN** a new background synchronization is requested and any remote retry backoff is preserved.

#### Scenario: Refresh completes while editing

- **WHEN** background reconciliation completes while a form contains unsaved edits
- **THEN** the application refreshes permitted data without overwriting the unsaved form or resetting its filters and does not trigger a refresh loop.

#### Scenario: Incomplete remote roster

- **WHEN** a paginated inbound run fails before completion
- **THEN** cached records and the last successful timestamp are retained, missing pages do not imply withdrawals and the failed run is visible.

### Requirement: Complete operation coverage

The system SHALL inventory every application mutation and background mutation and automatically enqueue each operation with a verified semantic Orgo equivalent. Each remaining local operation SHALL retain an explicit ownership or missing-contract reason. Equivalent operations SHALL include members, roles, structures, lifecycle, progression, events and participation where supported by the tenant.

#### Scenario: Same edit through different surfaces

- **WHEN** a supported edit is made in an individual editor, bulk action or background job
- **THEN** the same canonical intention is committed atomically with the local change and delivered after commit.

#### Scenario: Equivalent operation lacks tenant permission

- **WHEN** Orgo rejects a supported operation
- **THEN** the operation remains visibly blocked with a reason and authorized retry instead of being reported as synchronized.

### Requirement: Verified and recoverable delivery

The system SHALL verify target identity, center, current authorization and baseline before writing, preserve unrelated remote data and confirm intended values through readback. It SHALL retain the existing field-level Orgo-wins conflict policy and recover uncertain creations without blindly duplicating objects.

#### Scenario: Connection fails after remote creation

- **WHEN** creation times out after the request may have reached Orgo
- **THEN** the worker attempts correlation/readback and does not issue another create unless absence is established.

#### Scenario: Another party changes an unrelated role

- **WHEN** a local leader assignment is delivered
- **THEN** the unrelated role and its history remain unchanged.

### Requirement: Lifecycle and role equivalence

The system SHALL synchronize verified withdrawal/reactivation codes, role additions and endings, replacement of chiefs and expirations at their correct structural scope. It SHALL NOT treat reactivation as restoration of historical mandates or technical administrator privileges.

#### Scenario: Member withdrawal

- **WHEN** an authorized user withdraws a member
- **THEN** the verified Orgo lifecycle change and required role endings are queued and the interface distinguishes local withdrawal from confirmed remote completion.

#### Scenario: Expired responsibility

- **WHEN** a responsibility expires through a background job
- **THEN** its mapped Orgo responsibility is ended without altering other responsibilities.

### Requirement: Events participation and financial boundaries

The system SHALL synchronize shared event data and equivalent registration/attendance changes with stable canonical IDs. Financial adapters SHALL preserve the existing ledger, explicit national confirmation and actor credential rules and SHALL NOT cause a second charge, refund or bank transfer as a side effect of synchronization.

#### Scenario: Pending registration

- **WHEN** an activity registration awaits approval or capacity
- **THEN** synchronization does not turn it into confirmed Orgo attendance.

#### Scenario: Previously confirmed national payment

- **WHEN** a legacy operation is reconsidered
- **THEN** confirmed or uncertain national payments are verified before any further write and are not blindly resubmitted.

### Requirement: Historical reconciliation and visible status

The system SHALL preview historical intentions against current local and remote state before replay and SHALL show per-operation pending, blocked, uncertain, local-only and readback-confirmed outcomes. Successfully applied manual operations SHALL NOT be duplicated.

#### Scenario: Already confirmed leader assignments

- **WHEN** the backlog is prepared
- **THEN** the three leader assignments confirmed on 2026-11-02 remain synchronized without another role creation.
