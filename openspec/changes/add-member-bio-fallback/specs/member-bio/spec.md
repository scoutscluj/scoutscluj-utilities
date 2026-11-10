## ADDED Requirements

### Requirement: Readable Bio fallback for unmapped member details

The system SHALL synchronize grade to its configured dedicated Orgo field when available, otherwise to a readable Romanian section in Bio. It SHALL synchronize local structure affiliation to that section independently of Orgo organization-role operations. The section SHALL have the heading "Date de membru Scouts Cluj" and readable labels and values, without technical identifiers. It SHALL preserve surrounding prose from the latest remote biography, avoid duplicate generated sections, respect edit authorization and confirm writes by readback. Other local fields and private notes SHALL NOT be included automatically.

#### Scenario: Grade without mapping

- **WHEN** an authorized editor changes a member's grade to 8 without a dedicated Orgo grade-field mapping
- **THEN** Bio includes "Clasa: a VIII-a" and the current structure, while retaining existing prose.

#### Scenario: Affiliation update

- **WHEN** a member is moved to Florești or their affiliation is confirmed
- **THEN** a separate Bio operation records "Structura: Florești" without falsely confirming Orgo roles or assignments.

#### Scenario: Subsequent update

- **WHEN** a member's grade changes again or is cleared
- **THEN** the generated section is updated without duplication, and cleared grade information is removed.

#### Scenario: Dedicated grade mapping

- **WHEN** a dedicated grade mapping is configured
- **THEN** grade updates use that field and structure Bio updates omit the grade.
