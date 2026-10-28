## ADDED Requirements

### Requirement: Focused activity settings pages
Activity settings SHALL provide General, Team, Departments, Registrations, Agreement and Payment submenus. Only the relevant forms SHALL be visible on each page. Saving a registration configuration section SHALL preserve unrelated values and use the revision associated with the edited data.

#### Scenario: Organizer edits payment settings
- **WHEN** the organizer opens Payment and changes the fee
- **THEN** unrelated registration settings remain intact after saving and the success message remains visible after revalidation.

### Requirement: Compact participation fee
The interface SHALL expose one participation fee input. Entering a positive amount SHALL reveal compact commission advice with Hide and Apply recommended price actions. Applying the recommendation SHALL update that same input and close the advice without repeatedly raising the recommendation during that editing session.

#### Scenario: Organizer dismisses or applies advice
- **WHEN** the organizer enters 300 lei and then hides the advice
- **THEN** the entered fee remains 300 lei and the advice can be reopened.
- **WHEN** the organizer applies the recommendation
- **THEN** the same input receives the recommended amount rounded upward to a multiple of 5 lei.

### Requirement: Direct activity navigation
The Activities menu label SHALL open the complete activity list. The menu SHALL omit redundant all-activities and public-catalog links, while retaining direct activity entries. The activity list SHALL expose creation as a top-right header action.

#### Scenario: Organizer starts a new activity
- **WHEN** the organizer clicks Activities and then Activity new in the listing header
- **THEN** the guided creation flow opens without a separate creation panel occupying list width.
