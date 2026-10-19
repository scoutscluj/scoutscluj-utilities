## ADDED Requirements

### Requirement: Unit-scoped fee status projection

The system SHALL provide current member-period fee summaries to unit leaders,
chiefs and explicitly authorized helpers according to current unit/group access.
This dedicated projection SHALL NOT grant payment-administration access or expose
bank reconciliation, processor credentials or unrestricted financial endpoints.

#### Scenario: Leader checks unit cotizatii

- **WHEN** a leader requests fee status for their unit's current members
- **THEN** the authorized period and payment summaries are returned
- **AND** changing receipts, allocations or national transfers still requires existing financial authority
- **AND** arbitrary member identifiers cannot bypass the unit scope

### Requirement: Withdrawal-aware collection and current-year return

The system SHALL stop arrears tracking and future fee collection eligibility
for a withdrawn member while preserving obligations, receipts, allocations and
settlement history. On return, only the current period SHALL be payable, using
existing current-period credits and the unique member-period obligation. Prior
years SHALL NOT become collectible arrears through reactivation.

#### Scenario: Member with unpaid history withdraws and later returns

- **WHEN** the member is reactivated in a later period
- **THEN** the member owes only the current period's applicable fee
- **AND** prior unpaid periods are not restored as collection targets
- **AND** historical financial evidence has not been deleted or rewritten

#### Scenario: Returning member already paid part of the current period

- **WHEN** the member returns within the same financial period
- **THEN** existing allocations count toward the current amount
- **AND** no duplicate obligation or duplicate charge is generated
- **AND** a fully paid current period is not charged again
