## ADDED Requirements

### Requirement: Explicit local structure membership

The system SHALL model Cluj and Florești as explicit local structures with stable identifiers, distinct from age branches and canonical Orgo local centers. Each member SHALL have one primary structure and each unit SHALL belong to one structure; subgroups SHALL inherit their unit's structure. A beneficiary's unit SHALL be compatible with their primary structure. Adult responsibilities MAY span both structures without changing primary membership.

#### Scenario: An adult assists in both structures

- **WHEN** the Council assigns an adult to units in Cluj and Florești
- **THEN** the adult retains one primary membership and receives the permissions of the assigned responsibilities
- **AND** no global administrator role is granted by those responsibilities

### Requirement: Scoped structure administration

The Cluj Council SHALL retain access to both structures and appoint adult structure administrators. A Florești administrator SHALL manage their structure's units and members, see relevant fee status, and SHALL NOT receive financial mutation rights or global administrator rights from that appointment. The administrative appointment SHALL NOT require a leader promise; existing leader and chief eligibility SHALL remain enforced.

#### Scenario: A local administrator attempts a financial operation

- **WHEN** a user has only the Florești administrative mandate and attempts to register a receipt or modify a Cluj member
- **THEN** the server rejects the operation outside their granted scope

### Requirement: Council-controlled cross-structure changes

Only the Cluj Council SHALL transfer primary membership between structures or assign an adult to responsibilities in the other structure. Local administrators and chiefs SHALL manage internal assignments within their existing authority. A local manager MAY end a visiting adult's local assignment; global withdrawal of an adult belonging to the other structure SHALL require the Council. Existing global withdrawal semantics for authorized withdrawal of own members SHALL remain intact.

#### Scenario: Ending a visiting adult's local assignment

- **WHEN** a Florești manager ends the local assignment of an adult belonging to Cluj
- **THEN** that local responsibility ends and the adult's other responsibilities and global status remain unchanged

### Requirement: Confirmed initial classification

Initial classification SHALL propose Florești for member names containing its normalized label and SHALL require Council preview and confirmation, allowing corrections. Existing identities and unit memberships SHALL be checked for consistency. Subsequent name changes SHALL NOT recalculate explicit membership. Inactive members SHALL remain separately displayed and Orgo patrols SHALL remain excluded.

#### Scenario: A member's Orgo name changes after classification

- **WHEN** an explicitly classified Florești member loses the label from their name
- **THEN** their primary structure remains Florești

### Requirement: Progression within the primary structure

Annual progression SHALL select destination units only within the member's primary structure. Missing destinations SHALL require manual resolution while retaining the member within that structure, without automatic cross-structure transfers or unit creation.

#### Scenario: Florești has no Explorer unit

- **WHEN** a Florești Temerari member reaches the Explorer transition and no destination exists in Florești
- **THEN** the transition is flagged for manual resolution and the member remains in Florești's records
- **AND** an Explorer unit in Cluj is not automatically selected
