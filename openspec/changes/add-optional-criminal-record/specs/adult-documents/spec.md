## ADDED Requirements
### Requirement: Optional criminal record certificate
The system SHALL accept an optional criminal record certificate alongside CIC in each adult annual dossier, using the existing private file access, review, version history and audit rules. Only the latest CIC validation SHALL determine dossier completeness. The administrator workspace SHALL show a separate criminal record status.

#### Scenario: Owner adds a criminal record
- **WHEN** an eligible adult uploads a criminal record PDF, JPEG or PNG within the existing size limit
- **THEN** the file is stored privately as a pending criminal record version independently of CIC
- **AND** only the owner and authorized central administrators can download it

#### Scenario: Criminal record does not block completeness
- **GIVEN** the current CIC version is validated
- **WHEN** the criminal record is missing, pending or rejected
- **THEN** the annual dossier remains complete

#### Scenario: Replacement preserves history
- **WHEN** a criminal record is replaced
- **THEN** its new version requires review and previous versions remain available
- **AND** CIC versions and validation remain unchanged
