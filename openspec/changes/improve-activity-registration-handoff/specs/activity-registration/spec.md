## ADDED Requirements
### Requirement: Adaptive agreement editor
The system SHALL show general activities and optional activities for eligible units, a live document preview and equipment list input, preserving prior document snapshots.
#### Scenario: Multiple eligible units
- **WHEN** a participant from one eligible unit generates an agreement
- **THEN** the PDF includes general activities and only that unit's specific activities
#### Scenario: One eligible unit
- **WHEN** the activity targets one unit or one age branch
- **THEN** the interface omits unnecessary unit controls and locks a single eligible branch
### Requirement: Cash at handoff
The system SHALL keep cash-only tranches in the outstanding balance and exclude them from card checkout.
#### Scenario: Fast receipt confirmation
- **WHEN** an authorized organizer confirms the displayed cash amount and physical agreement
- **THEN** both changes are committed atomically with revision checks and financial audit entries, preventing duplicate collection
#### Scenario: Existing participants
- **WHEN** the organizer explicitly applies a saved installment plan
- **THEN** fees and receipts are preserved and in-progress card checkouts block the operation
### Requirement: Clear registration feedback
The system SHALL distinguish account and guest registration, hide irrelevant medication details, and present actionable validation errors.
#### Scenario: No personal medication
- **WHEN** the participant declares no personal medication
- **THEN** medication administration details are hidden and excluded from newly generated documents
