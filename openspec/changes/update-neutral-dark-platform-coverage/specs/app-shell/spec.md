## ADDED Requirements

### Requirement: Neutral dark foundation

Dark appearance SHALL use neutral charcoal canvas, navigation, surfaces, inset controls and structural borders. System-dark appearance SHALL use the same foundation. Semantic status colors and brand actions SHALL remain distinguishable without tinting the overall workspace blue.

#### Scenario: User opens a dark workspace

- **WHEN** Dark or System-dark appearance is active
- **THEN** primary foundation colors have equal red, green and blue channels
- **AND** headings, values, labels and controls remain readable on their actual surfaces.

### Requirement: Appearance coverage across workspace states

Dashboards, calendars, contribution/admission payments, financial administration, profiles, inventory and administration pages SHALL pair their rendered text and surfaces in both appearances, including forms, dialogs, selected rows and feedback states. Printed document previews MAY retain white paper when their own text uses a readable print palette.

#### Scenario: A page contains a legacy light card

- **WHEN** dark appearance is active
- **THEN** application cards and controls use appearance-aware surfaces and text
- **AND** independent review checks actual headings, labels, values and interactive states rather than accepting token contrast alone.

#### Scenario: User opens a focused editor

- **WHEN** a modal editor opens on mobile or desktop
- **THEN** content fits the viewport and supports keyboard focus containment, Escape and focus restoration.
