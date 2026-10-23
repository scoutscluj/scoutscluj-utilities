## ADDED Requirements

### Requirement: Compact Profile Overview

The web app SHALL retain identity, roles, Orgo connection details, and logout on
the authenticated profile page, display personal details and Orgo connection details in two responsive
information cards, and provide a personal-objectives section. The identity header
SHALL place notification settings and logout actions together at its right edge.

#### Scenario: Profile provides notification settings navigation

- **GIVEN** an authenticated user opens `/profile`
- **WHEN** notification status has loaded
- **THEN** an icon-only `Setări notificări` link at the right of the identity header opens `/profile/notifications`
- **AND** the icon is a crossed bell when notifications are not ready on this device
- **AND** it is a bell with a green check when the browser supports push, permission is granted, the server is configured, and the current device is subscribed
- **AND** its accessible label and tooltip describe the notification state
- **AND** the full enable, test, and unsubscribe controls appear on the settings page.

#### Scenario: Summary cannot obtain notification status

- **GIVEN** an authenticated user opens `/profile`
- **WHEN** the notification status request fails
- **THEN** the icon indicates an unknown status and its accessible label explains the error
- **AND** the notification settings link remains available.

#### Scenario: Profile details and actions share a compact layout

- **GIVEN** an authenticated user opens `/profile`
- **WHEN** the profile renders
- **THEN** the avatar, display name, and email appear at the left of the header
- **AND** the notification settings icon and logout action appear together at the right
- **AND** the left card shows personal details, card ID, and labeled role badges
- **AND** the right card shows Orgo connection status, Orgo ID, connection date, and last login
- **AND** the two cards have equal width and height on desktop with compact columns and spacing
- **AND** the last login is formatted as a readable Romanian date and time
- **AND** the header and stacked information cards fit narrow screens without horizontal overflow.

#### Scenario: Profile exposes personal objectives

- **GIVEN** an authenticated user opens `/profile`
- **WHEN** the profile renders
- **THEN** it includes an `Obiective personale` section
- **AND** an `Adaugă obiectiv` button opens the creation dialog
- **AND** the profile remains usable on narrow screens.

#### Scenario: Profile displays stored personal details

- **GIVEN** the authenticated user's Orgo connection contains profile data
- **WHEN** the profile renders
- **THEN** the personal card shows email, card ID, membership status, date of birth, date joined, and fee-validity date
- **AND** calendar dates appear in Romanian without timezone shifts
- **AND** fee validity and application roles have explicit labels alongside their colors
- **AND** missing or invalid values display `Indisponibil`.

#### Scenario: Profile photo cannot load

- **GIVEN** the user's Orgo profile photo is missing or fails to load
- **WHEN** the identity header renders
- **THEN** the avatar falls back to the user's initial without a broken image or layout shift.

#### Scenario: Current-user response limits stored profile data

- **GIVEN** the stored Orgo profile contains additional fields or credentials
- **WHEN** the current-user API serializes the profile
- **THEN** it returns only the requested personal fields and a safe avatar URL
- **AND** it does not expose raw credentials or unrelated stored profile fields.
