## ADDED Requirements
### Requirement: Guided initial setup
The interface SHALL guide activity creation through details, team/departments, enrolment, agreement, fees/payment and review. The server SHALL save the activity and its initial enrolment settings atomically. Invalid input SHALL preserve the entered form values and SHALL NOT leave a partially created activity.
#### Scenario: Initial settings fail validation
- **WHEN** registration settings supplied with a new activity are invalid
- **THEN** neither the activity nor its dependent settings are committed and the wizard keeps the supplied values for correction.

### Requirement: Scoped activity administration
Activities SHALL record their original creator separately from their current organizer. An organizer and assigned activity administrators SHALL manage the activity and its operational areas without receiving global roles. Only authorized managers SHALL modify the team.
#### Scenario: Delegated administrator manages one activity
- **WHEN** a registered user is assigned as an activity administrator
- **THEN** that user can manage its configuration and operational areas but gains no management access to unrelated activities.

### Requirement: Central settings and departmental navigation
Enrolments SHALL appear under Administrative and participation payments SHALL appear under Finance. Their configuration and the agreement configuration SHALL be located in activity settings. Operational pages SHALL provide an accessible settings-icon link to the relevant settings section.
#### Scenario: Organizer configures participation payments
- **WHEN** the organizer selects the settings icon on the participation payments page
- **THEN** activity settings opens at the payment configuration section.
