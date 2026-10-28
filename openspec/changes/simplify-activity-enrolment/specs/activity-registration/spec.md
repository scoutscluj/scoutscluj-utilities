## ADDED Requirements
### Requirement: Clear activity public page
Each published activity SHALL have a shareable public page with details, an optional image, enrolment by authenticated account or exact member ID, and payment for an existing enrolment. Completion SHALL offer a filled agreement download and optional payment.
#### Scenario: Parent joins from a shared link
- **WHEN** a parent opens the activity link without authentication
- **THEN** the page offers account sign-in or enrolment by member ID without exposing member data, followed by agreement download and optional payment.

### Requirement: Fixed agreement format during editor suspension
The system SHALL use the supplied participation Word format with activity-specific and participant-specific placeholders, preserving its fixed clauses and layout. Organizers SHALL edit activity-specific long text in registration settings. Previous publications and generated files SHALL remain immutable. The general template editor SHALL visibly indicate that editing is temporarily suspended.
#### Scenario: Organizer prepares an activity
- **WHEN** the organizer saves completed agreement details in registration settings
- **THEN** an immutable publication is available without creating a global template draft.

### Requirement: Eligible activities in navigation
Authenticated members SHALL see eligible published activities in the Activities submenu, linking to their public page. Organizers SHALL retain access to activity management.
#### Scenario: Eligible member opens resources
- **WHEN** a member belongs to an activity's eligible group
- **THEN** its public page is accessible from the Activities submenu.
