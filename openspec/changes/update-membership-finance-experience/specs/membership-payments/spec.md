## ADDED Requirements

### Requirement: Clear membership collection progress
The member register SHALL display paid-member and monetary collection progress for the selected period independently of search and payment-status filters. Payment history SHALL open from an accessible icon tooltip, and statuses SHALL use labels as well as colors.

#### Scenario: Filter the register
- **WHEN** staff search for a member or filter unpaid members
- **THEN** progress continues to represent the whole selected period
- **AND** switching periods recalculates the progress

### Requirement: Manual bank and cash collection
Authorized financial staff SHALL record bank or cash receipts with positive integer bani, date, unique method-specific document reference, and explanatory note. An optional target obligation SHALL be allocated in the same transaction, after verifying the period and outstanding balance.

#### Scenario: Record a payment from a member row
- **WHEN** staff submit a valid manual payment from the member modal
- **THEN** the receipt and allocation are saved together and appear in the ledger and payment tooltip with the correct method
- **AND** failed validation saves neither record

#### Scenario: Reject duplicate or excessive payments
- **WHEN** the reference is already registered for the method, the period differs, or the allocation exceeds the member's remaining balance
- **THEN** the request is rejected without creating another receipt or allocation
