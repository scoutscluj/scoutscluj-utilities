## ADDED Requirements

### Requirement: Central Audit Journal

The system SHALL record important user and system actions in a central app audit journal.

#### Scenario: User action is audited

- **GIVEN** an authenticated user performs an important write operation
- **WHEN** the operation succeeds
- **THEN** the system records actor, action, entity type, entity id, timestamp, and safe metadata.

#### Scenario: System action is audited

- **GIVEN** a background or system process performs an important operation
- **WHEN** the operation succeeds
- **THEN** the system records the action with no actor or with a system actor marker
- **AND** includes safe metadata explaining the operation.

### Requirement: Audit Metadata Safety

The system SHALL prevent audit entries from storing secrets, tokens, large file payloads, or unnecessary sensitive content.

#### Scenario: Financial document is uploaded

- **GIVEN** a user uploads a financial document
- **WHEN** the audit entry is created
- **THEN** the audit metadata may include file name, content type, size, and related record identifiers
- **AND** it does not include file bytes, base64 content, session tokens, or external credentials.

### Requirement: Activity-Scoped Audit Visibility

The system SHALL let coordinators view audit entries for their own activities and related records.

#### Scenario: Coordinator views activity audit

- **GIVEN** a user coordinates an activity
- **WHEN** they open the activity audit view
- **THEN** they see audit entries linked to that activity and related records.

#### Scenario: Non-coordinator views activity audit

- **GIVEN** a user does not coordinate an activity and lacks elevated access
- **WHEN** they request audit entries for that activity
- **THEN** the API denies access.

### Requirement: Elevated Audit Visibility

The system SHALL provide elevated audit views according to existing roles and responsibilities.

#### Scenario: Super admin opens global audit

- **GIVEN** a user has `super_admin`
- **WHEN** they open the global audit journal
- **THEN** they can see audit entries across the app.

#### Scenario: Finance user opens finance audit

- **GIVEN** a user has `Responsabil financiar` access
- **WHEN** they open finance-relevant audit views
- **THEN** they can see audit entries for finance records and related procurement documents.

### Requirement: Module-Specific History Compatibility

The system SHALL allow specialized module histories to coexist with the central audit journal.

#### Scenario: Finance document status changes

- **GIVEN** a finance document status changes
- **WHEN** the change succeeds
- **THEN** the finance document status history remains available for workflow detail
- **AND** a central audit entry is also recorded for cross-app visibility.
