## ADDED Requirements

### Requirement: Browser appearance preference

The application SHALL offer System, Light and Dark appearance choices, persist the choice in the current browser and apply it before the initial page paint when storage is available. System mode SHALL follow changes in the device color scheme.

#### Scenario: User chooses a theme

- **WHEN** the user selects an appearance in the profile menu
- **THEN** the shell, controls, menus and dialogs use the selected palette
- **AND** reloading or navigating preserves the browser preference.

#### Scenario: Browser storage is unavailable

- **WHEN** the browser cannot read or write preference storage
- **THEN** the application remains usable
- **AND** the user can still change the appearance for the current visit.

### Requirement: Task-first responsive workspaces

Activity and member/unit workspaces SHALL prioritize their primary content and routine actions on mobile, keep secondary administration discoverable, preserve keyboard access and keep page width within the viewport. Shared sync status SHALL not displace the primary content.

#### Scenario: Organizer opens registrations on a phone

- **WHEN** the registrations workspace opens at 390 by 844 pixels
- **THEN** the first participant appears within approximately the first 340 vertical pixels
- **AND** searching, filtering, agreement/cash actions and row menus remain available.

#### Scenario: Leader opens members on a phone

- **WHEN** the member workspace opens at 390 by 844 pixels
- **THEN** member identity and its actions are accessible without horizontal page scrolling
- **AND** secondary filters can be expanded with the active selection retained.

### Requirement: Independent design acceptance

The release SHALL be reviewed using new desktop/mobile and light/dark evidence by independent subagents. Reviewed surfaces SHALL score above 8.5 out of 10 without unresolved overflow, contrast, keyboard or inaccessible-action blockers.

#### Scenario: Reviewer finds a deficient mobile or dark surface

- **WHEN** a reviewed surface scores 8.5 or lower or has a blocking accessibility defect
- **THEN** the implementation is revised and the affected evidence is reviewed again before release acceptance.
