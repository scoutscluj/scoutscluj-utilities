## ADDED Requirements

### Requirement: Uniform processor-inclusive published cotizație
The system SHALL publish the smallest multiple of 500 bani whose net after the configured active processor's percentage and fixed fee covers the base plan amount. Card and bank SHALL use the same published total. National shares SHALL remain unchanged. Existing allocations, open checkouts, review cases and national transfers SHALL preserve their obligation totals.

#### Scenario: Processor-specific price and subsequent change
- **WHEN** a 30000 bani base plan uses NETOPIA at 119 basis points plus 30 bani
- **THEN** its published total is 30500 bani for both payment methods
- **AND** Stripe at 150 basis points plus 100 bani publishes 31000 bani
- **AND** fee changes do not alter partially paid obligations or open checkout amounts
- **AND** a stale displayed checkout amount is rejected before submission

### Requirement: Delegated verified national marking
The system SHALL mark the exact national ORGO period after an authorized financial user records a fully collected national transfer. It SHALL use that financial actor's encrypted OAuth token, recheck the actor's financial role, validate the beneficiary and national amount, and verify confirmation through period history. It SHALL NOT substitute a server API token for these writes.

#### Scenario: Uncertain submission or pending national approval
- **WHEN** an ORGO write has an uncertain result or awaits approval
- **THEN** the bank transfer remains recorded and the member's ORGO state is visible
- **AND** recovery reads history without automatically submitting another payment
- **AND** a new submission after uncertainty requires staff confirmation and evidence that no ORGO record exists
- **AND** a revoked token requires reauthentication and an explicit retry under the requesting financial user's token

### Requirement: Nontechnical financial documentation
The system SHALL provide an authorized Admin → Financiar → Ghid financiar page explaining cotizații, prices, payment confirmation, bank allocations, processor reconciliation, national transfers, ORGO states and financial corrections.

#### Scenario: Financial responsible follows a national transfer
- **WHEN** an authorized user opens the guide
- **THEN** they can follow the bank-transfer and ORGO-confirmation steps and identify how to recover a failed or uncertain result

### Requirement: Guest-only footer
The site footer SHALL appear only for unauthenticated users.

#### Scenario: Authenticated member opens a public payment page
- **WHEN** an authenticated user opens Cotizație or a legal page
- **THEN** no site footer is rendered
