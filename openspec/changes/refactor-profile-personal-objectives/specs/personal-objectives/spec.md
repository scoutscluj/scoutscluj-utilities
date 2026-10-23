## ADDED Requirements

### Requirement: Private Persistent Personal Objectives

The system SHALL let every authenticated user create and list their own
Postgres-backed personal objectives with a title, description, and deadline.
Ownership SHALL be derived from the authenticated session.

#### Scenario: User creates an objective

- **GIVEN** an authenticated user submits a nonempty title and description and a valid deadline
- **WHEN** the create request succeeds
- **THEN** the system stores the objective for that user
- **AND** returns its identifier, title, description, deadline, and creation timestamp
- **AND** the objective remains available after a reload and on another device.

#### Scenario: Users have isolated objective lists

- **GIVEN** two authenticated users have different saved objectives
- **WHEN** either user requests their objective list
- **THEN** the response includes only that user's objectives
- **AND** a client-provided owner cannot grant access to the other user's data.

#### Scenario: Unauthenticated request is rejected

- **GIVEN** a request has no valid authenticated session
- **WHEN** it attempts to list or create personal objectives
- **THEN** the API rejects the request without exposing or creating objectives.

### Requirement: Objective Validation And Deadline Semantics

The system SHALL require a title of at most 200 characters, a description of at
most 5,000 characters, and a valid calendar-date deadline. Title and description
SHALL be trimmed and nonempty. Deadlines SHALL be date-only `YYYY-MM-DD` values.

#### Scenario: Invalid objective is rejected

- **GIVEN** an objective has a missing or whitespace-only title or description, overlong text, or a missing or invalid deadline
- **WHEN** a create request is submitted
- **THEN** the API rejects it with a validation error
- **AND** no objective is saved.

#### Scenario: Calendar date is preserved across timezones

- **GIVEN** a user saves an objective with deadline `2026-11-15`
- **WHEN** the objective is read in another timezone
- **THEN** its calendar deadline remains November 15, 2026.

#### Scenario: Past deadline is allowed

- **GIVEN** a user enters an otherwise valid objective with a deadline before today
- **WHEN** they save it
- **THEN** the system accepts the objective
- **AND** the list marks it `Termen depășit` using the browser's local calendar date.

### Requirement: Personal Objective List

The profile SHALL display each personal objective's title, description, and
localized deadline, ordered by deadline ascending and creation time descending
with a deterministic identifier tie-breaker.

#### Scenario: User has saved objectives

- **GIVEN** an authenticated user has objectives with different deadlines
- **WHEN** their profile loads
- **THEN** the nearest deadline appears first
- **AND** each objective shows its title, description, and deadline.

#### Scenario: User has no objectives

- **GIVEN** an authenticated user has no saved objectives
- **WHEN** the list loads successfully
- **THEN** the profile shows an informative Romanian empty state
- **AND** the add-objective action remains available.

#### Scenario: Objective list fails to load

- **GIVEN** the objective request fails
- **WHEN** the profile renders the objective section
- **THEN** it shows an error and a retry action
- **AND** does not present the failure as an empty list.

### Requirement: Accessible Objective Creation Dialog

The web app SHALL create personal objectives through an accessible dialog with
required `Titlu`, `Descriere`, and `Termen limită` fields and explicit save and
cancel actions.

#### Scenario: User opens and cancels the dialog

- **GIVEN** a user selects `Adaugă obiectiv`
- **WHEN** the dialog opens
- **THEN** focus moves into the dialog and stays within it during keyboard navigation
- **AND** cancel or Escape closes the idle dialog without saving
- **AND** focus returns to the add-objective button.

#### Scenario: Objective saves successfully

- **GIVEN** the user submits valid dialog fields
- **WHEN** the request is pending
- **THEN** duplicate submissions and accidental dismissal are prevented
- **AND** after success the dialog closes, its fields reset, and the refreshed list includes the objective
- **AND** the interface announces success in Romanian.

#### Scenario: Objective save fails

- **GIVEN** a user submits the dialog
- **WHEN** validation or the save request fails
- **THEN** the dialog remains open with the entered values
- **AND** shows a Romanian error and allows correction or retry.
