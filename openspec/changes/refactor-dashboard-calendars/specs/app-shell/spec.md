## ADDED Requirements

### Requirement: Custom Dashboard Calendars

The authenticated dashboard SHALL display a custom upcoming-events agenda and a headquarters calendar with vertical week and month views in place of its two Google Calendar embeds, with both widgets available on desktop and mobile.

#### Scenario: Signed-in member opens the dashboard

- **WHEN** a member with a valid local session opens the dashboard
- **THEN** the events widget displays the custom date-grouped agenda
- **AND** the headquarters widget provides week/month switching
- **AND** existing full-calendar navigation links remain available.

#### Scenario: Narrow-screen dashboard

- **WHEN** a signed-in member opens the dashboard on a narrow screen
- **THEN** both widgets remain available in a stacked layout
- **AND** headquarters navigation and every day's bookings remain usable.

#### Scenario: Member navigates calendars with a keyboard

- **WHEN** a member uses keyboard navigation for view switching, date selection, event details, or month overflow
- **THEN** controls expose accessible names and selected states with visible focus
- **AND** active-period changes are announced accessibly.

#### Scenario: Visitor opens dashboard without a valid session

- **WHEN** a visitor without a valid session opens the dashboard
- **THEN** the existing protected-route login redirect applies
- **AND** no calendar data is rendered or retrieved for that visitor.
