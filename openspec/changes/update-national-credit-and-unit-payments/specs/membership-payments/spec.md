## ADDED Requirements

### Requirement: Independent national payment credit
The system SHALL credit only the national portion when the existing Orgo history reader confirms the member, center, amount and exact corresponding period. Verification SHALL NOT create a local receipt or write a payment to Orgo. Current-period membership synchronization and opening member fee information SHALL request this verification; historical periods SHALL require an explicit request.

#### Scenario: National paid and local still unpaid
- **WHEN** Orgo confirms the national half and no local receipt exists
- **THEN** only national credit is recorded and the local half remains payable
- **AND** repeated verification creates no additional credit

#### Scenario: Overlapping financial evidence
- **WHEN** national confirmation overlaps a local collection, an unsettled national transfer or an active checkout
- **THEN** financial evidence is preserved and the obligation is marked for financial reconciliation without adding duplicate credit

#### Scenario: Unconfirmed remote evidence
- **WHEN** Orgo is unavailable, pending or does not confirm the matching period
- **THEN** the existing financial credit remains unchanged

### Requirement: Mandate-scoped manual membership receipts
The system SHALL let chiefs record membership receipts for their unit and leaders for their assigned subgroup or common collective. Active mandate ancestry, structure boundaries and current authority SHALL be checked within the financial transaction. Helpers and ordinary members SHALL NOT receive this authority through read/edit grants. Unit-scoped writes SHALL target one current collectible obligation, reject excess amounts and ongoing/review payments, and SHALL NOT grant unrestricted financial administration.

#### Scenario: Leader records a partial local receipt
- **WHEN** an authorized leader submits a bank or cash receipt within the outstanding amount for a current member in their scope
- **THEN** the receipt and allocation are confirmed immediately with amount, method, reference, date, note and actor retained
- **AND** national credit already recognized counts toward the outstanding balance

#### Scenario: Mandate revoked or target outside scope
- **WHEN** an actor lacks a current chief/leader mandate covering the target
- **THEN** receipt creation is denied before any receipt or allocation is persisted

#### Scenario: Authorized adult opens the manual receipt from a member row
- **WHEN** an authorized adult selects “Înregistrează plată manuală” in an active member's context menu
- **THEN** the selected member's current receipt form opens expanded without another navigation step
- **AND** unauthorized readers do not see this menu item
