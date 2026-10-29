## ADDED Requirements
### Requirement: Authenticated registration drafts
Authenticated users SHALL save incomplete registration forms privately in their account, resume them later, and discard them explicitly. Drafts SHALL NOT reserve capacity, create charges, issue documents, or appear in organizer enrollment tables.
#### Scenario: Save and resume
- **WHEN** an authenticated user saves an incomplete form and returns later
- **THEN** the saved participant information is available to resume from the same account
#### Scenario: Ownership and concurrent edits
- **WHEN** another account requests a draft or a stale revision is saved
- **THEN** access is denied or the stale update is rejected without overwriting saved data
#### Scenario: Submit final registration
- **WHEN** strict final registration validation succeeds
- **THEN** the participant is registered and the corresponding draft is removed in the same transaction
#### Scenario: Failed final validation
- **WHEN** final registration validation fails
- **THEN** the draft remains available and no capacity or payment is created
