## ADDED Requirements

### Requirement: Seniori beneficiary as Seniori unit chief
The system SHALL allow a Seniori beneficiary with a verified age of at least 18 to be assigned chief of a Seniori unit within their structure by an authorized administrator. It SHALL preserve their primary category, placement and other active responsibilities, including a Temerari helper responsibility. The promise date SHALL remain optional and SHALL NOT be in the future. Existing authorization, structure, whole-unit scope and single-chief rules SHALL still apply. Seniori beneficiaries SHALL remain ineligible for leader responsibilities and chief responsibilities for other branches.

#### Scenario: Seniori chief also assists Temerari
- **GIVEN** an adult Seniori beneficiary with an active helper responsibility at Temerari
- **WHEN** an authorized administrator assigns them chief of a Seniori unit in their structure
- **THEN** the assignment succeeds without requiring a promise date
- **AND** both responsibilities remain active and their category and placement remain unchanged
- **AND** assigning the Temerari helper responsibility after the chief responsibility also preserves both roles

#### Scenario: Seniori beneficiary is assigned an ineligible responsibility
- **WHEN** an administrator assigns a Seniori beneficiary as a leader or as chief of another branch
- **THEN** the request is rejected

#### Scenario: Seniori chief assignment violates existing safeguards
- **WHEN** a chief assignment has an unverified or minor age, a future promise date, a subgroup scope or a target in another structure
- **THEN** the request is rejected without creating a responsibility
