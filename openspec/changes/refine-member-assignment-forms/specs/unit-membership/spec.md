## ADDED Requirements

### Requirement: Relevant responsibility and placement fields
The system SHALL offer only units in the edited member's current structure for ordinary placement and responsibility assignments, including for central administrators. Structure changes SHALL remain explicit separate operations. When the selected unit has no active subunits, leader/helper assignment SHALL accept the common collective and SHALL hide the subgroup selector. A promise date for leader/chief assignment SHALL be optional; supplied dates SHALL NOT be in the future. Verified adult age and Seniori leader ineligibility SHALL remain enforced.

#### Scenario: Assign an adult to a unit without subgroups
- **GIVEN** an eligible adult and a unit in their structure without active subgroups
- **WHEN** an organizer assigns a leader responsibility without a promise date
- **THEN** the assignment is saved without a subgroup or invented promise date
- **AND** its member permissions apply only to that unit's ungrouped collective

#### Scenario: Move a member within their structure
- **WHEN** an administrator opens ordinary unit transfer for a Cluj member
- **THEN** only Cluj units are offered once
- **AND** a request to a Florești destination without an explicit structure change is rejected

### Requirement: Adult placement display and grade applicability
The system SHALL display adult group placement using the distinct active responsibility units in their current structure. It SHALL keep the primary category unchanged. School grade SHALL apply only to Lupișori, Temerari and Exploratori; adult categories and Seniori SHALL have no grade field or grade-edit action, and stale imported grades SHALL NOT be exposed as their school grade.

#### Scenario: Leader with an imported stale grade
- **GIVEN** a Lideri member with a Temerari responsibility and an old imported school grade
- **WHEN** the member roster or profile is opened
- **THEN** the group column displays Temerari, the grade is absent, and no school-grade editing action is offered
