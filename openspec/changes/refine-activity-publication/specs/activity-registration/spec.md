## ADDED Requirements

### Requirement: Discoverable and scoped publication
Activity managers SHALL have a prominent publication control at the top of activity administration. Publication SHALL use saved settings, preserve unrelated fields, check the current revision and require unsaved form changes to be saved first. The public page, public catalog and new registrations SHALL become unavailable after the last activity day in Europe/Bucharest, or immediately when the activity is marked completed or cancelled. Legacy activities without an end date SHALL use the start date as their final day. Internal administration SHALL remain available.

#### Scenario: Activity ends
- **GIVEN** a published activity ending on 25 October 2026
- **WHEN** the date becomes 26 October in Europe/Bucharest
- **THEN** the public page and catalog entry are unavailable and new registrations are rejected
- **AND** organizers can still administer existing registrations and payments

#### Scenario: Concurrent publication
- **WHEN** a manager publishes with an outdated settings revision
- **THEN** the action is rejected without overwriting the newer configuration

### Requirement: Structure-scoped eligibility controls
Eligibility catalogs SHALL expose active fixed units, excluding legacy source units. Unit and subgroup choices SHALL follow the selected structures and parent units. Multiple structures in scope SHALL be identified in unit labels. Removing a structure or unit SHALL remove incompatible selected descendants. An empty structure selection SHALL retain the existing all-structures meaning.

#### Scenario: Two structures contain Temerari units
- **WHEN** Cluj and Florești are both in scope
- **THEN** the choices distinguish Cluj · Temerari and Florești · Temerari
- **AND** selecting only Cluj hides Florești units and subgroups

### Requirement: Romanian date input contract
Date controls SHALL display day.month.year and optional 24-hour time regardless of browser locale. They SHALL support the Romanian calendar, keyboard input, required/minimum/maximum validation and form submission using canonical ISO values. Impossible dates SHALL be rejected.

#### Scenario: English browser
- **WHEN** a user enters 13.11.2026 in a date control
- **THEN** the interface displays that Romanian date and submits 2026-11-13
- **AND** entering 31.02.2026 prevents form submission
