## ADDED Requirements

### Requirement: Reusable member profile and self-service

The system SHALL store versioned contact, emergency, medical and typed reusable
registration fields on the member file. The member's account SHALL be allowed
to update its own permitted profile fields. A parent MAY use the child's account;
audit SHALL record the authenticated account without claiming to identify which
human used it. Self-service SHALL NOT permit internal notes, roles, school-grade
or unit assignment changes.

#### Scenario: Parent updates the child's medical information

- **WHEN** the child's authenticated account submits a valid medical update
- **THEN** the reusable profile is versioned and updated
- **AND** the account is recorded as the actor
- **AND** no separate parent invitation or account is required

### Requirement: Current-unit profile and note visibility

The system SHALL allow all leaders of the member's current unit to read medical
data and internal notes, with mutations restricted to established member scopes.
Internal notes SHALL remain local and SHALL NOT be exposed to member self-service,
public lookup, Orgo sync payloads or participant registration forms. Former-unit
leaders SHALL lose access to the current file when their responsibility ends.

#### Scenario: Member transfers units

- **WHEN** the member moves from Temerari to Exploratori
- **THEN** the reusable profile and member notes are available to authorized Exploratori leaders
- **AND** former Temerari leaders without another current authorization cannot access the live file
- **AND** historical activity records retain their separate access rules

#### Scenario: Leader adds an internal note

- **WHEN** an authorized leader saves a note for a member they manage
- **THEN** its author and history are recorded and current-unit leaders can read it
- **AND** the note is absent from the member's own view and remote sync jobs

### Requirement: Reconfirmed registration data contract

The reusable profile SHALL expose a narrow authenticated contract for future
activity-registration prefill. Submitting a registration SHALL require explicit
reconfirmation of medical data and emergency contacts, retain the confirmed
answers as an activity snapshot, and update permitted reusable corrections with
concurrency checks. This contract SHALL NOT require delivery of a complete
activity-registration builder in this member-management change.

#### Scenario: Member corrects information during registration

- **WHEN** a future registration integration submits confirmed corrected medical or emergency data
- **THEN** the registration retains the confirmed snapshot
- **AND** the current reusable profile is updated if its revision still matches
- **AND** previous registrations retain their own snapshots

#### Scenario: Prefilled form is stale

- **GIVEN** a profile changed after a registration form was prefilled
- **WHEN** stale answers would overwrite the changed fields
- **THEN** the integration requires conflict resolution before changing the live profile
- **AND** it does not silently replace newer health information

### Requirement: Separate signed parental-consent PDF workflow

The system SHALL keep parental-consent PDF generation and signing separate from
activity registration and reusable profile editing. Registration confirmation
SHALL NOT substitute for a signed parental consent, and profile changes SHALL
NOT mutate historical PDFs or introduce a digital signing workflow.

#### Scenario: Registration answers are confirmed

- **WHEN** a parent confirms prefilled activity-registration answers
- **THEN** only the registration/profile data workflow is completed
- **AND** the required parental PDF generation and signing workflow remains separate
- **AND** existing PDF publications and historical documents are unchanged

### Requirement: Safe health and note handling

The system SHALL enforce sensitive-field access on backend queries, mutations
and serialization. Health information and note bodies SHALL NOT be included in
generic logs, audit descriptions, notifications or public member lookups.
Medical synchronization to Orgo SHALL remain disabled unless equivalent fields
and appropriate access can be verified.

#### Scenario: Orgo has no appropriate medical-field mapping

- **WHEN** medical data is updated locally
- **THEN** it remains available to the authorized local audience
- **AND** the system does not place it into a broadly visible Orgo field
- **AND** any sync limitation is represented honestly
