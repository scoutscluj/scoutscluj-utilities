## ADDED Requirements

### Requirement: Private family detection from guardian contacts

Minor applications SHALL require guardian name, phone and email in both self
and other-person registration. Family detection SHALL normalize the submitted
guardian email and consider existing member emails and guardian contacts in
the local center. It SHALL NOT merge identities or grant access based on an
email match. Suggested family and pricing SHALL be visible only during
authorized review; ambiguous matches SHALL require internal resolution.

#### Scenario: Parent is an existing member

- **WHEN** the guardian email matches an existing active fee-paying member
- **THEN** review suggests the family including that parent without exposing the match in the public form.

#### Scenario: Siblings have a non-member parent

- **WHEN** the guardian email matches another child's stored guardian contact
- **THEN** review suggests the same family even if the parent has no member account.

### Requirement: Stable and idempotent family cotisation allocation

The family SHALL count active members subject to contributions, including
parents and members whose contributions are paid. Existing order, tariff types,
payments and historical obligations SHALL be preserved. A newly approved member
SHALL receive the next position, mapping first to fam1, second to fam2 and third
or later to fam3. Existing correlated identities SHALL NOT count twice.
Concurrent approvals and provisioning retries SHALL NOT allocate conflicting
positions or repeat financial mutations. Pending approved provisioning SHALL
reserve its assigned position. Applying the remote tariff SHALL use the
verified dedicated Orgo contract and require readback.

#### Scenario: Active parent has already paid

- **WHEN** the first child joins a family containing one active fee-paying parent whose contribution is paid
- **THEN** the child receives fam2 and the parent's tariff and paid evidence stay intact.

#### Scenario: Third and later members

- **WHEN** a family already contains two or more eligible members
- **THEN** the new member receives fam3 without reordering the existing members.

#### Scenario: Concurrent approvals and retries

- **WHEN** two members of the same family are approved concurrently or the same provisioning job is retried
- **THEN** positions are allocated consistently and each application has only one financial allocation.

### Requirement: Family and guardian data never use Bio as fallback

Guardian contacts and family associations SHALL NOT be exported in Bio. Contact
export SHALL require a verified dedicated field with appropriate access. When
no equivalent field exists, data SHALL stay local. The integration SHALL NOT
create Orgo family-access relations or reuse unrelated fields. The tariff may
use only the existing dedicated fee field.

#### Scenario: No dedicated guardian fields

- **WHEN** the Orgo tenant has no equivalent guardian contact fields
- **THEN** contacts remain in Resurse and neither the creation payload nor Bio contains those values.

### Requirement: Circular profile upload and concise help

The photo selector SHALL start as a red circle with initials derived from the
member's name, show the chosen image in that circle and allow choosing,
replacement and removal by keyboard or pointer. A short explanation SHALL
state its recognition purpose. Longer photo and account-email guidance SHALL
be available from accessible info controls that also work on touch devices.
The public tutorial SHALL be updated separately after this production rollout, as subsequently requested.

#### Scenario: Name and photograph change

- **WHEN** an applicant enters a name and chooses or removes a photo
- **THEN** the circle updates from initials to image and back while preserving image validation.
