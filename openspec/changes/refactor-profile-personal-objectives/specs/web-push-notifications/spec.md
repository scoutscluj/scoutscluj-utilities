## ADDED Requirements

### Requirement: Dedicated Personal Notification Settings

The web app SHALL provide an authenticated `/profile/notifications` page for
personal notification controls and link to it from the profile summary.

#### Scenario: User manages notifications from the dedicated page

- **GIVEN** an authenticated user opens `/profile/notifications`
- **WHEN** notification status loads
- **THEN** the page provides enable, test, disable-current-device, and disable-all-device actions
- **AND** retains the existing permission and subscription lifecycle behavior
- **AND** offers an `Înapoi la profil` link.

#### Scenario: Profile summary does not request permission

- **GIVEN** the browser notification permission is `default`
- **WHEN** a user opens the profile or follows the notification settings link
- **THEN** no browser permission prompt is shown
- **AND** permission is requested only after selecting the enable action.

#### Scenario: Unsupported or denied browser opens settings

- **GIVEN** Web Push is unsupported or notification permission is denied
- **WHEN** the user opens the dedicated settings page
- **THEN** it shows the existing Romanian explanation
- **AND** disables actions that cannot succeed
- **AND** avoids unsupported browser APIs.

#### Scenario: User returns after changing subscriptions

- **GIVEN** a user has changed subscription state on the settings page
- **WHEN** they return to `/profile`
- **THEN** the notification summary reloads the status
- **AND** shows the current subscription state and active-device count.
