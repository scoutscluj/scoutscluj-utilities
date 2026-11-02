## ADDED Requirements

### Requirement: Center-specific public applications

The login page SHALL link to a public registration form for the configured local center. The backend SHALL require separate given/family names, a valid nonfuture birth date and an explicit schooling answer of preparatory, grades I–XII or not-in-school, calculate age from birth date and reject payload attempts to select another center, active status or privileged roles. The form SHALL allow requesting an active unit within the configured center and retain its verified destination ID without granting membership before approval.

#### Scenario: Preparatory grade

- **WHEN** an applicant selects preparatory grade
- **THEN** the answer is accepted as grade 0 rather than treated as missing.

#### Scenario: Adult application

- **WHEN** an adult selects not-in-school and supplies their birth date
- **THEN** the required schooling answer is complete without an invented school grade.

#### Scenario: Missing required answers

- **WHEN** the birth date or schooling answer is missing or invalid
- **THEN** client and API reject submission and identify the required correction.

### Requirement: Authorized review and canonical provisioning

Public submissions SHALL remain local pending applications until an admin, super_admin or currently authorized leader/chief of the requested unit approves them. Administrators SHALL also be able to create and validate applications, request corrections or reject with a reason. Leaders SHALL only see applications and approve enrollment for their own units; helpers, ended or expired mandates and inactive members SHALL NOT acquire this right. Applications without a requested unit SHALL require administrator review. Approval SHALL enqueue creation or verified linking of the canonical Orgo identity and SHALL NOT be confused with remote completion or formal adhesion approval.

#### Scenario: Public submission

- **WHEN** a visitor submits a valid application
- **THEN** no Orgo account, authenticated session or elevated role is created before authorized approval.

#### Scenario: Leader confirms enrollment in own unit

- **GIVEN** a leader or chief holds a current mandate in the requested unit
- **WHEN** they approve an application for that unit
- **THEN** the application is approved and canonical provisioning is queued with the approver and destination recorded in audit.

#### Scenario: Leader attempts another unit's application

- **WHEN** a leader lists or directly requests or approves an application for another unit
- **THEN** the backend denies access and does not expose applicant or guardian details or change the application.

#### Scenario: Leader loses mandate before delivery

- **WHEN** a leader's mandate expires or ends after approval but before provisioning
- **THEN** delivery is blocked pending a currently authorized approval rather than relying on the server token's broader privileges.

#### Scenario: Requested unit changes after approval

- **WHEN** an approved application's requested unit is changed before provisioning
- **THEN** the previous destination approval is invalidated and a new authorized confirmation is required.

#### Scenario: Repeated approval

- **WHEN** an administrator and a unit leader approve the same application concurrently
- **THEN** one provisioning intention is persisted and at most one canonical identity is linked.

#### Scenario: Existing identity

- **WHEN** an application may match an existing identity
- **THEN** staff resolves verified identity evidence without merging by name or shared guardian email or moving another center's account automatically.

#### Scenario: First login after provisioning

- **WHEN** the approved member signs in through Orgo
- **THEN** login resolves the already linked local record without duplicating the member or losing history.

### Requirement: Local reusable guardian information

The system SHALL support a guardian submitting a child's application and retain guardian contact and child relationships locally for reuse in member profiles, activity registration and consent generation. A contact record SHALL NOT itself grant authenticated access or become the child's Orgo login identity. Existing parent contact fields SHALL migrate without automatic guardianship authorization.

#### Scenario: Siblings share a guardian

- **WHEN** two children share one guardian contact
- **THEN** their identities and applications remain distinct and the contact can be reused without merging the children.

#### Scenario: Authorized activity prefill

- **WHEN** a user authorized for the child requests activity prefill
- **THEN** the form can reuse the local guardian contact and preserves the registration and consent snapshot after submission.

#### Scenario: Visitor knows a child's identifier

- **WHEN** an unauthenticated visitor enters a child identifier or guardian email
- **THEN** no saved guardian or child profile information is disclosed.

#### Scenario: Guardian contact changes

- **WHEN** the current guardian phone is corrected
- **THEN** future authorized forms use the corrected contact while existing signed documents and historical registration snapshots remain unchanged.

### Requirement: Independent authentication and approval states

The application SHALL continue authenticating members through Orgo, SHALL NOT store an Orgo password in applications or delivery jobs and SHALL independently expose review and provisioning outcomes. Admission approval SHALL NOT imply national adhesion approval, fee payment or a leadership mandate.

#### Scenario: Remote provisioning is rejected

- **WHEN** an approved application cannot be created in Orgo
- **THEN** staff sees the approved review and blocked provisioning state and cannot mistake it for an active usable Orgo account.
