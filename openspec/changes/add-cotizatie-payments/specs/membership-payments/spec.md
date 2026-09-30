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

### Requirement: Automatic annual membership period
The system SHALL derive the active cotizație period in the Europe/Bucharest time zone, with each period starting on 1 September and ending on 31 August of the following year.

#### Scenario: Period rolls over on 1 September
- **WHEN** the local date becomes 1 September
- **THEN** the period named for the new September-to-August year becomes active
- **AND** if that period does not exist, the system creates it with the latest configured plan prices, or the baseline prices when no earlier period exists
- **AND** earlier obligations, receipts, allocations, and payment evidence remain assigned to their original period

### Requirement: Locally verified guest payments
The system SHALL accept numeric ORGO IDs and uppercase card IDs only when they match a verified obligation in the active local-center membership register. Public lookup SHALL disclose only a minimized identity preview, local-center affiliation, payable amount, and paid status.

#### Scenario: Guest pays by card
- **WHEN** a guest enters an ID matching an eligible member, confirms the minimized preview, and a verified processor success arrives
- **THEN** the receipt is allocated to that member's verified obligation
- **AND** unknown, ineligible, and already-paid IDs cannot start another checkout

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

### Requirement: Administratively managed provider credentials
The system SHALL allow authorized financial staff to create and rotate NETOPIA and Stripe configurations from Admin > Financiar > Procesator plăți without exposing stored secrets or requiring a deployment-secret change.

#### Scenario: Staff saves or rotates credentials
- **WHEN** authorized staff submit a complete environment-specific provider configuration
- **THEN** the API encrypts the configuration with the application KMS key before persisting it
- **AND** responses and audit records contain no credential value
- **AND** the previous encrypted revision remains available only for validating checkouts already bound to it
- **AND** new checkouts bind to the active revision

### Requirement: National settlement
The system SHALL record manual national transfers separately from member collection and remote ORGO confirmation.

#### Scenario: No administrative ORGO token
- **WHEN** staff confirm a national transfer
- **THEN** the transferred amounts are recorded and ORGO remains explicitly pending until independently verified

### Requirement: Reviewed ORGO roster initialization and reconciliation
The system SHALL require an authorized staff preview and confirmation before the first ORGO roster import for each period. After initialization it SHALL reconcile the roster in the background at most once per 15 minutes when staff open the cotizație dashboard, and SHALL offer an immediate manual synchronization.

#### Scenario: First initialization
- **WHEN** authorized staff request initialization for a period that has not been initialized
- **THEN** the system displays eligible members, assigned plans, amounts and rejected rows before creating obligations
- **AND** obligations are created only after explicit confirmation

#### Scenario: Later member or plan change
- **WHEN** a valid ORGO response contains a new eligible Cluj member
- **THEN** the system adds the obligation and reports the addition to staff
- **AND** an unpaid obligation may be updated from ORGO
- **AND** a paid or partially paid obligation with a changed plan is preserved and marked for review
- **AND** a missing, inactive or unpriced member is preserved and marked for review

#### Scenario: ORGO cannot be trusted
- **WHEN** authentication, permission, transport, or response-shape validation fails
- **THEN** no obligation is created, updated, or removed
- **AND** the failed run is visible and audited without credentials or unnecessary personal data

### Requirement: Explicit access and activation
The system SHALL allow Admin, FinanceManager and SuperAdmin financial access, keep guest results opaque, and default card processing to disabled sandbox configuration.

#### Scenario: Ordinary member requests another ledger
- **WHEN** a non-financial user requests administrative payment information
- **THEN** access is denied
