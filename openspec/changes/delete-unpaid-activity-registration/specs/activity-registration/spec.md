## ADDED Requirements

### Requirement: Permanent deletion of unpaid registrations

The system SHALL let activity managers permanently delete accidental registrations
after a named confirmation. It SHALL check the registration revision and activity
scope, remove associated answers, documents and mail atomically, and retain an audit
event. It SHALL preserve the member profile and other registrations and family prices.
Any ledger entry or checkout attempt SHALL prevent deletion regardless of net balance.

#### Scenario: Remove a test registration

- **WHEN** a manager confirms deletion of an unchanged registration without financial history
- **THEN** it disappears from the table and totals, its private access ceases, and the member can register again.

#### Scenario: Preserve financial history

- **WHEN** a registration has any ledger entry or checkout attempt
- **THEN** deletion fails without removing data and the manager is directed to withdrawal.

#### Scenario: Changed registration or insufficient permissions

- **WHEN** a non-manager requests deletion or the submitted revision is stale
- **THEN** deletion is rejected without removing data.
