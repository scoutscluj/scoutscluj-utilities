## MODIFIED Requirements

### Requirement: Administratively selected card processor

The system SHALL support NETOPIA Payments and Stripe through a common checkout boundary, with exactly one configured provider/environment pair selected for new membership checkouts by authorized financial staff. NETOPIA Sandbox, NETOPIA Production, Stripe Test, and Stripe Production SHALL appear as distinct operational choices.

#### Scenario: Staff changes the active payment target

- **WHEN** authorized staff select a fully configured provider/environment pair
- **THEN** new checkouts use that exact provider and environment
- **AND** the active-processor panel clearly identifies both values
- **AND** existing checkouts continue to validate against the configuration revision and environment recorded when they were created
- **AND** an unconfigured provider/environment pair cannot be selected

### Requirement: Administratively managed provider credentials

The system SHALL allow authorized financial staff to create and rotate NETOPIA and Stripe configurations independently for each supported environment from Admin > Financiar > Procesator plăți without exposing stored secrets or requiring a deployment-secret change.

#### Scenario: Staff saves credentials for another environment

- **WHEN** authorized staff save a complete environment-specific provider configuration
- **THEN** the API encrypts the configuration with the application KMS key before persisting it
- **AND** responses and audit records contain no credential value
- **AND** the current configuration for the provider's other environment remains available and selectable
- **AND** only the older current revision for the same provider/environment pair becomes historical
- **AND** new checkouts bind to the revision belonging to the selected pair

#### Scenario: Existing configurations are migrated

- **WHEN** the environment-aware configuration migration runs
- **THEN** the latest stored revision for every provider/environment pair is made available as that pair's current configuration
- **AND** no encrypted credential is exposed or rewritten

