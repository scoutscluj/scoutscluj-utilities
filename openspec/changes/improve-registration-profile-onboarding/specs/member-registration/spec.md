## ADDED Requirements

### Requirement: Applicant relationship selected first

The registration form SHALL first require an explicit choice between self
registration and registration for a child or another person. Labels SHALL refer
to the member being registered. Minor status SHALL derive from birth date and
require guardian contacts in both modes. Registration for another adult SHALL
collect the submitter's name and email separately without describing them as a
guardian or granting them account access.

#### Scenario: Minor registers for self

- **WHEN** a self applicant enters a birth date younger than eighteen
- **THEN** guardian contact fields are required before accepting the application.

#### Scenario: Register another adult

- **WHEN** an applicant registers another adult
- **THEN** the form distinguishes member data from submitter name and email and does not request a guardian relationship.

### Requirement: Complete profile prepared before remote provisioning

New applications SHALL require gender and allow an optional profile photo with
preview, replacement and removal. The server SHALL validate supported images
and size independently of the browser. Authorized reviewers SHALL see these
data. Approval SHALL provision gender using the verified Orgo creation contract
and schedule photo delivery independently after identity correlation. A photo
failure SHALL remain visible and SHALL NOT create another account. Existing
applications lacking the new fields SHALL remain readable and correctable.

#### Scenario: New application without photograph

- **WHEN** an otherwise valid application contains gender and no photo
- **THEN** the application is accepted and no photo upload is scheduled.

#### Scenario: Remote photograph upload fails

- **WHEN** the account exists but the remote photo upload fails
- **THEN** its existing identity is retained, the failed operation is visible and retry does not repeat account creation.

### Requirement: Member email required and explained by applicant mode

New applications SHALL require one email unique to the member account and check
its availability on submission in local data and Orgo. Self mode SHALL omit the
parent-oriented email explanation. Other-person mode SHALL recommend the
member's own address and permit a parent's address unused by another account.
Guardian and submitter contact addresses SHALL remain separate from account
identity; their reuse SHALL NOT merge accounts or confer login access.

#### Scenario: Parent uses unused own address

- **WHEN** a parent submits their unused email as the child's account email
- **THEN** it is accepted and instructions identify it as the child's login address.

#### Scenario: Account email belongs to another member

- **WHEN** the chosen account email already belongs to another identity
- **THEN** submission fails with an explanatory error and retains entered fields.

### Requirement: Shareable onboarding instructions

The form and success page SHALL offer a top-right copy action for the same
complete plain-text guide. It SHALL contain the registration URL, required
information, unique email rule, approval process, explanation of the national
Orgo / membri.scout.ro platform and sign-in through Resurse. Authentication
instructions SHALL describe direct sign-in to Resurse after account activation
using Connect with Orgo and the code sent to the account email, without prior
profile or password configuration in membri.scout.ro. Google MAY be described
as an alternative for the same account email; email-code login is the verified
first-access path. The guide SHALL include a working video URL once the
tutorial is published after deployment. Copy success and failure SHALL be
visible and accessible.

#### Scenario: Leader shares the registration guide

- **WHEN** a leader copies instructions before entering member information
- **THEN** the copied text is complete, contains absolute links and contains no applicant personal data or nonexistent tutorial link.

#### Scenario: Parent finishes registration

- **WHEN** a parent submits successfully
- **THEN** the success page explains approval and the child's national account and offers the same shareable guide.

### Requirement: Scoped new application indicator

Members and Units SHALL display a red button labelled with the number of
pending applications whenever the current actor can review at least one.
Counting SHALL use the same authorization scope and pending-state definition
as the destination list, independent of pagination. The button SHALL link to
the applications page and SHALL be absent when its count is zero.

#### Scenario: Leader with pending applications in their unit

- **WHEN** a leader can review two pending applications and other units have more
- **THEN** the button displays two and reveals no count from the other units.

#### Scenario: No pending applications

- **WHEN** the actor has no pending applications in their authorized scope
- **THEN** the red new-applications button is absent.
