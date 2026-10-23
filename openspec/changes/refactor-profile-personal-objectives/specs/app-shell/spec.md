## ADDED Requirements

### Requirement: Compact Profile Overview

The web app SHALL retain identity, roles, Orgo connection details, and logout on
the authenticated profile page while providing a compact notification summary
and a personal-objectives section.

#### Scenario: Profile provides notification settings navigation

- **GIVEN** an authenticated user opens `/profile`
- **WHEN** notification status has loaded
- **THEN** one notification card shows the current-device state and active-device count
- **AND** a `Setări notificări` button styled link opens `/profile/notifications`
- **AND** the full enable, test, and unsubscribe controls appear on the settings page.

#### Scenario: Summary cannot obtain notification status

- **GIVEN** an authenticated user opens `/profile`
- **WHEN** the notification status request fails
- **THEN** the card shows a readable error rather than a misleading inactive state
- **AND** the notification settings link remains available.

#### Scenario: Profile exposes personal objectives

- **GIVEN** an authenticated user opens `/profile`
- **WHEN** the profile renders
- **THEN** it includes an `Obiective personale` section
- **AND** an `Adaugă obiectiv` button opens the creation dialog
- **AND** the profile remains usable on narrow screens.
