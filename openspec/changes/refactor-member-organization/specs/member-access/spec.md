## ADDED Requirements

### Requirement: Server-enforced structure isolation

The server SHALL restrict adults to members of their own primary structure unless they hold an explicit central administrator or Council mandate in Cluj. Local administrators and unit chiefs SHALL NOT gain access to both structures. Assignments in another structure SHALL NOT bypass this gate. The gate SHALL cover lists, details, searches, filter options, totals, exports and mutations.

#### Scenario: Florești adult requests Cluj data

- **WHEN** an adult affiliated to Florești without a central mandate requests a Cluj member directly or through search/export
- **THEN** access is denied and the response exposes neither that member nor counts derived from inaccessible members.

#### Scenario: Central administrator

- **WHEN** a central Cluj administrator or Council member requests both structures
- **THEN** the server allows access under the central mandate.

### Requirement: Basic roster and private details are separate

Authenticated adults SHALL see names, primary categories and subunits within their accessible structure. Complete profiles, contacts, medical data, notes and fees SHALL require their respective permissions. A category alone SHALL NOT grant management or private-data access.

#### Scenario: Adult reads the basic roster

- **WHEN** an adult without a private-data grant opens the roster
- **THEN** they receive permitted basic fields and cannot retrieve private fields by requesting the detail endpoint.

### Requirement: Bounded management and delegation

Central administrators/Council SHALL manage both structures and appoint structure responsibles. Structure responsibles SHALL manage their own structure and appoint its unit chiefs. Unit chiefs SHALL manage their own unit and designate subunit leaders/helpers within their own mandate. Designated subunit leaders SHALL manage their subunit members; helpers SHALL perform only explicitly granted operations. Leaders and helpers SHALL NOT redelegate. No actor SHALL grant rights or scope beyond their own mandate. Revocation and expiry SHALL invalidate derived rights while preserving audit history. Primary structure transfers SHALL remain centrally controlled.

#### Scenario: Excessive delegation

- **WHEN** a chief attempts to grant access outside their unit or grant a permission they do not hold
- **THEN** the server rejects the entire delegation.

#### Scenario: Withdrawn mandate

- **WHEN** a delegating mandate is revoked or expires
- **THEN** dependent management rights no longer authorize subsequent requests.

#### Scenario: Mixed bulk mutation

- **WHEN** a bulk mutation includes an element outside the actor's permitted scope
- **THEN** validation rejects the operation before writing any element.
