## ADDED Requirements

### Requirement: One-time admission payment
The system SHALL offer a separate, fixed 55 RON admission payment for verified members, using existing checkout and authenticated provider notifications.

#### Scenario: New member pays admission
- **WHEN** a payer follows “Ești membru nou? Plătește adeziunea aici” and verifies the beneficiary
- **THEN** checkout charges exactly 5500 bani after terms acceptance
- **AND** a verified confirmation creates one receipt without any dues allocation

#### Scenario: Admission was paid in a previous period
- **WHEN** the same ORGO member attempts admission payment in a later period
- **THEN** the system rejects collection of a second admission fee

#### Scenario: Admission outcome is uncertain
- **WHEN** an admission checkout is pending or requires review
- **THEN** another admission checkout for that member is blocked across periods

### Requirement: Admission payment marker
The registry SHALL show a small admission marker for confirmed admission receipts in the selected period.

#### Scenario: Confirmed admission payment
- **WHEN** the selected member-period has a confirmed admission receipt for 5500 bani without refunds or review flags
- **THEN** the registry displays “Adeziune achitată”
- **AND** annual dues and national settlement totals are unchanged

#### Scenario: Refund or dispute
- **WHEN** the admission receipt is refunded or flagged for review
- **THEN** the paid admission marker is absent

### Requirement: ORGO account age eligibility
The system SHALL offer admission collection only for ORGO accounts created within the last 90 days, including the boundary, with no existing confirmed admission payment. The original account creation date SHALL come from ORGO dateCreated and SHALL NOT be inferred from local account creation or first import time.

#### Scenario: Old or unknown account creation date
- **WHEN** dateCreated is missing, invalid, in the future or older than 90 days
- **THEN** admission collection is rejected with a clear explanation
- **AND** annual dues payment remains available

#### Scenario: ORGO synchronization
- **WHEN** the member register is synchronized successfully
- **THEN** the original ORGO dateCreated is cached on the member-period obligation
