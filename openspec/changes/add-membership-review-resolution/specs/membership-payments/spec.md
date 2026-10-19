## ADDED Requirements

### Requirement: Resolve member reviews using verified ORGO data
The system SHALL let financial staff preview and explicitly accept valid current ORGO data for a reviewed obligation, preserving existing payments and deriving payment status from the period tariff and allocated balance.

#### Scenario: Paid member changes to Fam 1
- **WHEN** ORGO reports Fam 1, the allocated balance equals that plan's period tariff, and staff confirms the preview with an explanation
- **THEN** the obligation adopts Fam 1 and its tariff, clears the roster review, preserves receipts and allocations, and becomes paid

#### Scenario: Partial payment can continue
- **WHEN** the allocated balance is below the accepted tariff and no national transfer exists
- **THEN** the review clears and the member may pay the remaining balance

#### Scenario: Review cannot be bypassed
- **WHEN** ORGO data is missing or invalid, a payment is open or requires review, a surplus exists, or a national transfer is incompatible or currently syncing
- **THEN** confirmation is rejected and the dialog explains the relevant correction workflow

#### Scenario: Compatible national transfer was held for financial review
- **WHEN** the accepted plan has the same national amount as the existing transfer, the cotization is fully paid, and all financial checks pass
- **THEN** confirmation preserves the transfer and resumes any held ORGO verification in read-only mode without creating another payment

#### Scenario: Data changes after preview
- **WHEN** ORGO data, the tariff, the obligation, or relevant financial state changes before confirmation
- **THEN** the system requires a refreshed preview before applying changes

#### Scenario: Authorized and traceable resolution
- **WHEN** a financial staff member confirms an eligible review
- **THEN** the system records the actor, explanation, previous values, accepted values, and preserved balance in the audit journal
- **AND** unauthorized users cannot preview or confirm reviews
