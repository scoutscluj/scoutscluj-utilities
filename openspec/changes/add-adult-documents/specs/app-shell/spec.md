## ADDED Requirements

### Requirement: Local Membership Fee Banner

The profile fee banner SHALL derive payment state only from the locally stored
current membership-period obligation and recorded payments for the signed-in
member. Orgo profile fee dates SHALL NOT cause or override a debt warning.

#### Scenario: Local payment is complete but Orgo date is old

- **GIVEN** the local current-period obligation has no outstanding balance
- **AND** the Orgo profile fee-validity date is in the past
- **WHEN** the member opens the profile
- **THEN** no fee payment warning is displayed.

#### Scenario: Local obligation has an outstanding balance

- **GIVEN** the current local obligation total exceeds its recorded paid amount
- **WHEN** the member opens the profile
- **THEN** a fee payment banner links to `/cotizatie`
- **AND** the Orgo fee-validity date does not affect that state.

#### Scenario: Local membership state is unavailable

- **GIVEN** the local obligation cannot be loaded or identified
- **WHEN** the member opens the profile
- **THEN** a neutral unavailable-state message links to `/cotizatie`
- **AND** the message does not claim that a payment is due.
