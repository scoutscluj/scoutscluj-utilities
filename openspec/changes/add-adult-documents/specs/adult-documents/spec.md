## ADDED Requirements

### Requirement: Annual Adult Dossiers

The system SHALL require only a behavioural integrity certificate (CIC) for
every member aged at least 18, including beneficiaries,
for each scouting year from September 1 through August 31. Age SHALL be computed
using the member date of birth and the current Europe/Bucharest calendar date.
Unknown birth dates SHALL NOT imply a complete dossier. The selected scouting
year SHALL define internal coverage without calculating certificate expiry.

#### Scenario: Adult opens profile

- **GIVEN** a member has reached their eighteenth birthday
- **WHEN** the member opens their profile
- **THEN** the profile shows the current scouting-year dossier summary
- **AND** opens the CIC dossier in an accessible dialog on request.

#### Scenario: Missing dossier does not block participation

- **GIVEN** an adult has missing, pending or rejected documents
- **WHEN** the member uses another permitted application function
- **THEN** dossier completeness does not impose an additional access restriction.

### Requirement: Separate Document Validation And Version History

The system SHALL retain uploaded document versions by member, scouting year and
document kind. Each new version SHALL start pending validation. Only an explicit
central administrator SHALL validate or reject a version; rejection SHALL
require a reason visible to the member. Completeness SHALL require the current
CIC version to be validated.

#### Scenario: Rejected document is replaced

- **GIVEN** a document was rejected with a reason
- **WHEN** its owner uploads a replacement for the same scouting year
- **THEN** the new version awaits validation
- **AND** the previous version and its review history remain accessible
- **AND** no criminal record certificate is required or accepted.

#### Scenario: Administrator uploads on behalf of a member

- **GIVEN** an explicit central administrator opens an adult's dossier
- **WHEN** the administrator uploads a document and validates it
- **THEN** upload and validation record that administrator as actor
- **AND** the member sees the validated document in the selected year.

### Requirement: Private Authorized Document Access

Every dossier and file endpoint SHALL authorize the requesting user as either
the document owner or an explicit central administrator. Council, finance,
structure or unit authority alone SHALL NOT grant file access. Downloads SHALL
be authenticated and private with cache prevention; storage keys SHALL NOT be
public URLs. Administrator reads and all important mutations SHALL be audited
without document contents or sensitive free text in the central journal.

#### Scenario: Another adult requests a file

- **GIVEN** a user is neither owner nor explicit central administrator
- **WHEN** the user requests a dossier or guesses a file-version identifier
- **THEN** the server refuses access without returning document contents.

#### Scenario: Administrator downloads an archived version

- **GIVEN** an explicit central administrator is authenticated
- **WHEN** the administrator downloads a historical document
- **THEN** the server records the access in the audit journal
- **AND** returns the original file with private no-store caching directives.

### Requirement: Validated File Uploads

The server SHALL accept only PDF, JPEG and PNG documents of at most 10 MiB,
checking decoded size and file signature rather than trusting extensions or
client MIME types. Original PDFs SHALL be preserved without conversion.

#### Scenario: Unsupported or oversized upload

- **WHEN** an owner or administrator uploads unsupported content or a file
  exceeding the limit
- **THEN** the server rejects it without creating a new current version.

### Requirement: Central Adult Document Workspace

The system SHALL expose a `Documente adulți` page only to explicit central
administrators, listing eligible members with scouting-year selection, name
search and missing/pending/validated/rejected filters. Administrators SHALL
review and upload through the shared dossier dialog.

#### Scenario: Administrator follows pending reviews

- **WHEN** an administrator selects a scouting year and the pending filter
- **THEN** the table shows dossiers containing current pending documents
- **AND** opening a member permits individual validation or reasoned rejection.

### Requirement: Certificate Guidance And In-App Feedback

The dossier dialog SHALL include plain Romanian instructions with official HUB
MAI and Ghișeul.ro links for obtaining the CIC, the user-provided paid alternatives
roghiseul.ro and caziere.ro, and the in-person option at Secția de Poliție nr. 1,
Str. Decebal nr. 26, Cluj-Napoca, regardless of residence county. The interface
SHALL distinguish annual internal coverage from issuer validity. Status and
rejection feedback SHALL appear in the profile/dialog without automatic email
or push notifications.

#### Scenario: Member needs to obtain a certificate

- **WHEN** the member opens the document guidance
- **THEN** the CIC has concise obtainment steps and an official link
- **AND** the instructions explain uploading the downloaded PDF or a readable
  scan/photo of a paper certificate.
