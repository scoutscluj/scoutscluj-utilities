## ADDED Requirements

### Requirement: Separate structure and branch selection

The registration form SHALL require a choice of Cluj or Florești, show only that structure's available branches with branch-only labels and reset the branch when structure changes. The API SHALL reject mismatched structure/unit combinations and preserve affiliation when no unit is selected. Existing applications without explicit structure SHALL remain readable.

#### Scenario: Guidance in Florești

- **WHEN** an applicant chooses Florești and requests branch guidance
- **THEN** their application and subsequent approved profile retain Florești affiliation.

### Requirement: Member email cannot identify another account

The form SHALL recommend a child's own email if available and explain that it must not reuse a parent's or another member's address. The API SHALL normalize the member email and reject reuse by local accounts, member profiles, active applications or Orgo accounts. Empty child emails and reusable guardian contacts SHALL remain permitted. Verification failures SHALL prevent acceptance and SHALL NOT be treated as proof of availability. Creation workers SHALL recheck before their first creation attempt; a duplicate SHALL NOT trigger a remote create.

#### Scenario: Duplicate email

- **WHEN** a submitted member email is already used
- **THEN** the form explains the problem, retains entered values and does not create an application.

#### Scenario: Parent contact for siblings

- **WHEN** siblings have no own email and share a guardian contact
- **THEN** the guardian address remains separate and may be reused.

### Requirement: Applicant-facing next steps

After successful submission the page SHALL explain review, approval, Orgo profile preparation and eventual Orgo sign-in. Wording SHALL distinguish parents from self applicants and SHALL explain that a child without email does not automatically grant a parent account or access. It SHALL avoid promising immediate access or unconditional notification delivery and provide a contact action.

#### Scenario: Parent submits without child email

- **WHEN** a parent submits a child application without a member email
- **THEN** the confirmation instructs them to arrange access with the local center after approval, rather than promising credentials at the guardian email.
