## ADDED Requirements

### Requirement: Bank receipt allocation to admission

Authorized financial staff SHALL be able to record a bank receipt from a statement or select an existing receipt and allocate its funds to verified members' admission fees. The original amount, receipt date, unique reference and audit evidence SHALL be retained. A bank payment SHALL NOT require a fabricated online checkout or a duplicate receipt. A receipt MAY remain unallocated while identity is being verified.

#### Scenario: An admission fee was paid outside the application

- **WHEN** financial staff record and allocate an actual bank transfer to the member's admission
- **THEN** the member's admission status reflects the valid payment and further payment requests use that status
- **AND** the original receipt remains available for reconciliation

### Requirement: Shared receipt balance across payment purposes

A single receipt MAY fund multiple members and both admission and membership fees. Available funds SHALL be validated across all live allocations and refunds, transactionally, so no amount is consumed twice. Admission amounts SHALL NOT be counted as membership fees or national membership remittance.

#### Scenario: A parent paid for multiple children in one transfer

- **WHEN** staff divide the receipt between the children's admission and membership fees
- **THEN** the allocations retain distinct members and purposes and their combined amount does not exceed available receipt funds

### Requirement: Lifetime admission evidence and historical payments

Admission status SHALL aggregate confirmed online evidence and valid manual allocations by canonical member identity across periods. Verified historical payments SHALL retain their actual confirmed tariff, without demanding the current tariff difference. Partial allocations SHALL NOT imply full settlement. Historical bank evidence SHALL NOT be subject to the online new-account eligibility window. Corrections and conflicts SHALL be auditable and visible to financial staff.

#### Scenario: A historical confirmed tariff differs from today's tariff

- **WHEN** financial staff verify a historical admission payment as fully settled at its documented tariff
- **THEN** admission is recognized as paid without an additional request for the current tariff difference

### Requirement: Explicit structure determines unpaid admission tariff

Unpaid admission pricing SHALL follow explicit primary structure rather than future name matching or adult activity assignments. A primary structure transfer SHALL preserve confirmed payments and flag payments in progress for financial review without rewriting their confirmed transaction data.

#### Scenario: A Cluj adult helps a Florești unit

- **WHEN** the adult receives a Florești responsibility while retaining primary membership in Cluj
- **THEN** that activity assignment does not change their admission tariff

### Requirement: Simple centralized receipt workflow

Financial staff SHALL have a short workflow to record the statement receipt, select members and payment purposes, and confirm allocations. Local structure staff SHALL see the relevant admission or membership status without obtaining financial mutation permissions. The workflow SHALL not require an automatic statement parser or mandatory file upload to associate a payment.

#### Scenario: A Florești administrator checks an existing bank admission

- **WHEN** the administrator opens the authorized member's fee status after financial confirmation
- **THEN** admission is clearly shown as paid and the administrator cannot modify the receipt without separate financial authority
