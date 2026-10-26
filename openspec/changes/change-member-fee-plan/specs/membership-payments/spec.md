## ADDED Requirements

### Requirement: Change current member cotisation type
Financial staff SHALL select a catalog-backed cotisation type, preview its
current-period tariff and preserved paid balance, and confirm an audited change
with a reason and concurrency token. Confirmation SHALL save the local type and
Orgo delivery intent atomically and SHALL NOT rewrite earlier periods.

#### Scenario: Unpaid member changes from Normală to Fam 2
- **WHEN** staff confirms a valid current-period preview
- **THEN** the new tariff and remaining balance apply and the Orgo price change is queued
- **AND** existing receipts and allocations are preserved

#### Scenario: Financial correction required
- **WHEN** the new tariff creates a surplus, a payment is open or a national transfer is incompatible
- **THEN** confirmation is blocked with a clear explanation and no partial change

#### Scenario: Orgo temporarily unavailable after confirmation
- **WHEN** the type has been saved but remote delivery is pending
- **THEN** the pending type remains visible and an unchanged Orgo roster cannot revert it
- **AND** genuine concurrent Orgo edits win using the member synchronization contract

#### Scenario: Unauthorized or stale request
- **WHEN** a non-financial actor submits a change or financial/catalog data differs from the preview
- **THEN** confirmation is rejected without modifying the member or financial records
