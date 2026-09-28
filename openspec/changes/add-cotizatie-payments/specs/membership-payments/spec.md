## ADDED Requirements

### Requirement: Public merchant and payment information

The system SHALL publish the collecting entity's identity and contact details, the nature and price of the membership fee, accepted payment methods, confirmation and cancellation policies, privacy information, and access to the ANPC alternative-dispute-resolution procedure. Checkout SHALL require acceptance of the current legal-document version and retain the version and acceptance time.

#### Scenario: Payer reviews and accepts the applicable policies

- **WHEN** a payer opens the membership-fee page
- **THEN** the payable RON total and links to all applicable policies are visible before checkout
- **AND** checkout cannot be created without explicit acceptance
- **AND** the checkout records the accepted policy version and timestamp

### Requirement: Auditable member-period ledger
The system SHALL distinguish obligations, receipts, allocations, national transfers and ORGO synchronization, using integer bani and RON only.

#### Scenario: Bank payment for several members
- **WHEN** authorized staff record one bank transfer and allocate it to several obligations
- **THEN** allocations cannot exceed the receipt, remaining money is visible, and actor/date/transfer notes are retained

### Requirement: Unverified guest payments
The system SHALL accept numeric ORGO IDs and uppercase card IDs without claiming identity validation when administrative ORGO access is absent.

#### Scenario: Guest pays by card
- **WHEN** a guest chooses a published plan and a verified processor success arrives
- **THEN** a receipt awaits staff review and does not automatically mark a member paid

### Requirement: Trusted card confirmation
The system SHALL apply the selected processor's authenticated notification protocol and verify the raw body, environment, internal reference, provider reference, amount and currency before crediting a receipt.

#### Scenario: Callback replay or browser return
- **WHEN** the same success is delivered twice or the browser returns with a success flag
- **THEN** at most one receipt exists and browser parameters never create payment credit

### Requirement: Administratively selected card processor
The system SHALL support NETOPIA Payments and Stripe through a common checkout boundary, with exactly one processor selected for new membership checkouts by authorized financial staff.

#### Scenario: Staff changes the active processor
- **WHEN** authorized staff select a fully configured processor
- **THEN** new checkouts use that processor
- **AND** existing checkouts continue to validate against the processor and environment recorded when they were created
- **AND** an unconfigured processor cannot be selected

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
