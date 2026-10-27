## ADDED Requirements

### Requirement: Registration identity and access

The system SHALL accept a logged-in member or an exact Orgo identifier and SHALL keep at most one registration per activity/member. Guests SHALL receive no existing profile data. Authenticated prefill SHALL respect existing private-profile and medical access.

#### Scenario: Guest registration

- **WHEN** a visitor enters a member identifier
- **THEN** the form remains empty and recommends authentication for prefill.

#### Scenario: Register another member

- **WHEN** an authenticated user selects another member
- **THEN** permitted information is prefilled and medical data requires sensitive access.

### Requirement: Independent participation payment and consent

The system SHALL track participation, confirmed receipts/support, and consent independently. Eligible registrations SHALL be accepted automatically unless approval or capacity requires pending/waitlisted state. Payment SHALL be unavailable before approval or admission from waiting.

#### Scenario: Physical agreement

- **WHEN** a paid participant will bring a paper agreement to the bus
- **THEN** the payment remains paid and the agreement remains awaiting receipt.

### Requirement: Organizer pricing and ledger

The coordinator SHALL configure fees, family tiers for relatives participating in the same activity, installments and deadlines. Manual bank/cash receipts, center support and recorded refunds SHALL be retained with actor and evidence. Changes SHALL NOT silently rewrite confirmed receipts. Processing-fee advice SHALL use configured fees and the next multiple of five lei, without a card-only surcharge.

#### Scenario: Partial support

- **WHEN** center support covers part of the fee
- **THEN** remaining balance is reduced while collected money and support remain separately visible.

#### Scenario: Verified card payment

- **WHEN** a valid provider event is delivered repeatedly
- **THEN** one receipt is recorded for the attempt and membership fees remain unchanged.

### Requirement: Role-based participation

Adult staff SHALL only announce participation with a validated integrity certificate covering the start of the activity. Adult beneficiaries SHALL follow beneficiary pricing without parental consent. Capacities SHALL support beneficiary/staff/branch limits and an optional total.

#### Scenario: Certificate at start

- **WHEN** the certificate covers the start but not the end of the activity
- **THEN** the staff member may announce participation.

### Requirement: Individual immutable agreements

The system SHALL generate completed PDFs from immutable activity/template publications, preserve generated and uploaded versions, allow paper receipt confirmation and request renewed consent explicitly after publication changes. Optional image consents SHALL remain separate.

#### Scenario: Updated publication

- **WHEN** the coordinator requires renewed signatures
- **THEN** affected registrations require an updated agreement and previous documents remain accessible to authorized staff.

### Requirement: Personal access and overview

The system SHALL offer a private management link and authenticated own registrations, an organizer overview with role-specific sensitive fields, and durable confirmation e-mail delivery. The public payment-by-ID route SHALL expose only minimal identity and payable data for an existing registration.

#### Scenario: Financial role

- **WHEN** financial staff open the overview
- **THEN** financial status is available without medical answers or signed agreements.
