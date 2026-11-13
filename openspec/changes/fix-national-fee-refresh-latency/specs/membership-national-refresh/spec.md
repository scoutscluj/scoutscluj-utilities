## ADDED Requirements

### Requirement: Verify national evidence before online membership payment
The system SHALL verify current-period national evidence using server read credentials before calculating the outstanding amount in membership ID lookup, the authenticated payment view and checkout. This verification SHALL NOT create an Orgo payment or local receipt. Existing overlap and transaction checks SHALL apply.

#### Scenario: National paid before lookup
- **WHEN** Orgo confirms the national contribution before a beneficiary ID is looked up
- **THEN** the quoted amount excludes the confirmed national credit
- **AND** repeated lookup credits the evidence only once

#### Scenario: Partial national evidence
- **WHEN** Orgo confirms a partial national amount and paid plus unpaid matches the expected national total in RON
- **THEN** only the confirmed amount is credited
- **AND** no new Orgo payment is submitted

#### Scenario: Amount changes after display
- **WHEN** checkout verifies national credit that changes the previously displayed amount
- **THEN** the payment processor is not started until the new amount is confirmed

#### Scenario: Unavailable or pending verification
- **WHEN** Orgo verification fails or indicates a payment pending approval
- **THEN** online membership checkout does not start another payment
- **AND** the caller receives an actionable retry or reconciliation message

### Requirement: Nonblocking member fee refresh
The system SHALL display saved member details, fee dialogs and registry rows without waiting for Orgo. Each unit registry load SHALL request current national verification for fee-visible members, enforce current permissions and update only fee data as results arrive. Remote requests SHALL be bounded and concurrent identical reads SHALL be deduplicated.

#### Scenario: Slow Orgo while editing
- **WHEN** a member's page opens while Orgo is slow
- **THEN** local details and forms are usable before national verification finishes
- **AND** receiving the verification result does not reset unsaved form fields

#### Scenario: Registry opened again
- **WHEN** the Unități și membri registry is loaded again
- **THEN** national verification is requested again for authorized member fees
- **AND** refreshed amounts update rows and fee filters without a full page reload

#### Scenario: Fee access outside scope
- **WHEN** a caller requests fee verification or fee data outside current scope
- **THEN** the server rejects access without contacting Orgo for that unauthorized batch

#### Scenario: Orgo unavailable during browsing
- **WHEN** national verification is unavailable
- **THEN** saved details and fee data remain visible with an explicit failure and retry action
