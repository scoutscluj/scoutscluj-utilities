## ADDED Requirements

### Requirement: Auditable member-period ledger
The system SHALL distinguish obligations, receipts, allocations, national transfers and ORGO synchronization, using integer bani and RON only.

#### Scenario: Bank payment for several members
- **WHEN** authorized staff record one bank transfer and allocate it to several obligations
- **THEN** allocations cannot exceed the receipt, remaining money is visible, and actor/date/transfer notes are retained

### Requirement: Unverified guest payments
The system SHALL accept numeric ORGO IDs and uppercase card IDs without claiming identity validation when administrative ORGO access is absent.

#### Scenario: Guest pays by card
- **WHEN** a guest chooses a published plan and a verified NETOPIA success arrives
- **THEN** a receipt awaits staff review and does not automatically mark a member paid

### Requirement: Trusted card confirmation
The system SHALL verify notification signature, issuer, POS audience, raw-body hash, reference, amount and currency before crediting a receipt.

#### Scenario: Callback replay or browser return
- **WHEN** the same success is delivered twice or the browser returns with a success flag
- **THEN** at most one receipt exists and browser parameters never create payment credit

### Requirement: National settlement
The system SHALL record manual national transfers separately from member collection and remote ORGO confirmation.

#### Scenario: No administrative ORGO token
- **WHEN** staff confirm a national transfer
- **THEN** the transferred amounts are recorded and ORGO remains explicitly pending until independently verified

### Requirement: Explicit access and activation
The system SHALL allow Admin, FinanceManager and SuperAdmin financial access, keep guest results opaque, and default card processing to disabled sandbox configuration.

#### Scenario: Ordinary member requests another ledger
- **WHEN** a non-financial user requests administrative payment information
- **THEN** access is denied
