## ADDED Requirements

### Requirement: Activity-Scoped Parental Consent Workspace

The system SHALL expose parental consent configuration inside an existing `Activitate` administrative workspace rather than create a separate event entity.

#### Scenario: Coordinator opens parental consent administration

- **GIVEN** the `Administrativ` department is enabled for an activity
- **AND** the authenticated user coordinates that activity
- **WHEN** the user opens `Acord parental`
- **THEN** the app shows the parental consent configuration and publication workspace for that activity
- **AND** reuses the activity's coordinator, dates, location, visibility, and audit context.

#### Scenario: Feature is not enabled for the activity

- **GIVEN** the `Administrativ` department is not enabled for the activity
- **WHEN** the activity workspace renders
- **THEN** parental consent administration is not shown as an available section.

### Requirement: Single Scouts Cluj Organization Identity

The system SHALL maintain one configurable Scouts Cluj organization identity and snapshot it into each publication.

#### Scenario: Super admin updates organization identity

- **GIVEN** a `super_admin` opens parental consent administration
- **WHEN** they update the organization name, legal representative, identifier, address, or contact data
- **THEN** the system stores the updated identity
- **AND** records a safe audit entry.

#### Scenario: Organization identity changes after publication

- **GIVEN** an agreement publication already exists
- **WHEN** organization settings are changed later
- **THEN** the existing publication retains its original organization snapshot
- **AND** only later publications use the new identity.

### Requirement: Versioned Template Lifecycle

The system SHALL maintain versioned parental consent templates with exactly one active version and no legal-approval workflow.

#### Scenario: Active template is edited

- **GIVEN** a template version is active or has been used by a publication
- **WHEN** an administrator chooses to modify it
- **THEN** the system creates an editable copy as a new version
- **AND** does not mutate the historical version.

#### Scenario: Super admin activates a template

- **GIVEN** a valid draft template version exists
- **WHEN** a `super_admin` activates it
- **THEN** it becomes the only active version
- **AND** the previously active version remains available in history.

#### Scenario: Admin attempts template activation

- **GIVEN** an authenticated user has `admin` but not `super_admin`
- **WHEN** they attempt to activate a template version
- **THEN** the API denies the operation
- **AND** still permits them to edit valid inactive versions.

#### Scenario: Historical template is reactivated

- **GIVEN** a historical template version remains valid
- **WHEN** a `super_admin` reactivates it
- **THEN** it becomes the active version without changing any publication that previously referenced it.

### Requirement: Structured Template Editor

The system SHALL provide a block-based WYSIWYG editor backed by an allowlisted structured document schema.

#### Scenario: Administrator authors supported content

- **GIVEN** an administrator edits an inactive template version
- **WHEN** they add headings, paragraphs, callouts, formatting, lists, links, tables, separators, page breaks, approved assets, variables, modules, or form fields
- **THEN** the system stores the content as validated structured data
- **AND** restores the same supported structure when the editor is reopened.

#### Scenario: Template contains arbitrary HTML or script

- **GIVEN** a template update contains unsupported HTML, JavaScript, inline event handlers, arbitrary CSS, or remote embedded content
- **WHEN** the API validates the update
- **THEN** the API rejects it
- **AND** does not persist or render the unsafe content.

#### Scenario: Template references an unknown variable

- **GIVEN** a template contains a variable outside the allowlisted variable registry
- **WHEN** the template is saved or activated
- **THEN** validation identifies the unknown variable by its document location
- **AND** activation is blocked.

#### Scenario: Administrator undoes and redoes editor changes

- **GIVEN** an administrator has made supported content or form-field changes in the template editor
- **WHEN** they use undo and redo
- **THEN** the editor reverses and reapplies those changes in order
- **AND** preserves a valid structured document.

#### Scenario: Administrator previews a template draft

- **GIVEN** an administrator is editing a valid inactive template version
- **WHEN** they request template preview
- **THEN** the system renders the template with a fixed representative sample payload
- **AND** does not create or modify an activity draft, publication, or generated-document record.

### Requirement: Approved Template Asset Library

The system SHALL render only versioned local assets from a `super_admin`-managed approved asset library.

#### Scenario: Super admin uploads a valid asset

- **GIVEN** a `super_admin` selects a supported PNG or JPEG within configured size and dimension limits
- **WHEN** the asset is uploaded
- **THEN** the system stores its bytes, metadata, and SHA-256 checksum
- **AND** makes it available to template draft editors.

#### Scenario: Admin inserts an existing asset

- **GIVEN** an `admin` edits an inactive template version
- **AND** an approved asset already exists
- **WHEN** the admin inserts that asset
- **THEN** the template stores a reference to the approved asset
- **AND** the admin does not gain asset-upload or asset-deletion permission.

#### Scenario: Template references a remote or unsupported asset

- **GIVEN** a template update references a remote URL, unsupported file type, or unknown asset identifier
- **WHEN** the template is validated
- **THEN** the API rejects the reference
- **AND** does not fetch or embed the resource.

#### Scenario: Historical template references an asset

- **GIVEN** an asset is referenced by an active or historical template version
- **WHEN** a `super_admin` attempts to delete it
- **THEN** the system prevents destructive deletion
- **AND** preserves historical rendering inputs.

### Requirement: Configurable Handwritten And Future Digital Fields

The system SHALL represent parent-completed fields as first-class template nodes shared by handwritten rendering and future digital completion. Supported field types SHALL include short text, long text, date, number, phone, email, yes/no, single choice, multiple choice, select/dropdown, acknowledgement or consent checkbox, repeating group, signature, signature date, and read-only information.

#### Scenario: Administrator configures a form field

- **GIVEN** an administrator inserts a form field
- **WHEN** they configure its stable code, type, label, help text, required state, options, and handwritten response size
- **THEN** the template stores that field configuration
- **AND** the PDF renderer uses it to create the appropriate empty response control.

#### Scenario: Repeating group is rendered for handwriting

- **GIVEN** a template contains a repeating medication or authorized-person group
- **WHEN** a handwritten PDF is generated
- **THEN** the document includes the configured number of blank repeated rows or blocks
- **AND** labels every configured child field clearly.

#### Scenario: Administrator chooses a supported field type

- **GIVEN** an administrator opens the form-field insertion palette
- **WHEN** they choose any supported field type
- **THEN** the editor exposes the properties applicable to that type
- **AND** stores a valid typed field node that the handwritten renderer can represent.

#### Scenario: Digital completion is unavailable in the MVP

- **GIVEN** a template contains fields suitable for digital completion
- **WHEN** a parent downloads the current MVP agreement
- **THEN** the system provides a handwritten PDF
- **AND** does not expose a digital response, account, or signing workflow.

### Requirement: Predefined Conditional Module Registry

The system SHALL use predefined and testable conditional modules instead of an administrator-authored expression language.

#### Scenario: Administrator edits module presentation

- **GIVEN** a predefined module exists in an inactive template version
- **WHEN** an administrator changes its text, field blocks, display order, or enabled state
- **THEN** the changes are stored in that template version
- **AND** the module's semantic activation rule remains application controlled.

#### Scenario: Administrator attempts arbitrary condition code

- **GIVEN** a template update contains an arbitrary condition expression or executable rule
- **WHEN** the template is validated
- **THEN** the API rejects the unsupported condition
- **AND** requires selection from the predefined module registry.

### Requirement: Organizer Draft Wizard

The system SHALL provide one mutable, activity-scoped organizer draft with conditional wizard steps and typed validation.

#### Scenario: Coordinator saves an incomplete draft

- **GIVEN** a coordinator has completed only part of the wizard
- **WHEN** they save the draft
- **THEN** the system persists all valid entered data
- **AND** returns incomplete field paths without requiring publication completeness.

#### Scenario: Coordinator configures the event

- **GIVEN** a coordinator manages the activity
- **WHEN** they complete parental consent configuration
- **THEN** the wizard covers general data, location, branches, transport, accommodation, activities, water, tools, fire and blacksmithing, hiking and overnight shelter, first aid, food and allergies, equipment, conduct, and Safe from Harm.

#### Scenario: Unauthorized user attempts draft access

- **GIVEN** an authenticated user neither coordinates the activity nor has elevated management access
- **WHEN** they request or update the organizer draft
- **THEN** the API denies access
- **AND** does not disclose draft configuration.

#### Scenario: Coordinator attempts to change a common clause

- **GIVEN** a coordinator configures one activity
- **WHEN** they attempt to override a common template clause for that activity
- **THEN** the API rejects the override
- **AND** directs shared text changes to global template administration.

### Requirement: Branch-Specific Configuration

The system SHALL support lupișori, temerari, and exploratori as independently configurable branches within one activity.

#### Scenario: Branches have different return transport

- **GIVEN** lupișori return by coach
- **AND** temerari and exploratori return in parent vehicles
- **WHEN** the coordinator previews the agreements
- **THEN** each branch document shows only its own return transport
- **AND** does not present the other branches' alternatives.

#### Scenario: Branches have different dates and activities

- **GIVEN** configured branches have different date ranges or activity selections
- **WHEN** documents are rendered
- **THEN** each branch document uses only the applicable dates, activities, risks, and equipment.

#### Scenario: Unconfigured branch is omitted

- **GIVEN** an activity configures only lupișori and temerari
- **WHEN** preview or publication runs
- **THEN** exactly two documents are generated
- **AND** no exploratori document or empty exploratori section is produced.

### Requirement: Activity And Risk Conditional Behavior

The system SHALL render risk information from typed organizer answers and predefined module rules.

#### Scenario: Construction-only raft is configured

- **GIVEN** raft construction is selected
- **AND** the raft will not carry participants
- **WHEN** the agreement is rendered
- **THEN** it states that the raft is construction-only
- **AND** retains construction and tool risks
- **AND** omits raft transport swimming and life-jacket requirements.

#### Scenario: Waterslide is configured

- **GIVEN** waterslide is selected
- **WHEN** publication validation runs
- **THEN** the water module requires surface, slope, water, supervision, rules, weather criteria, evacuation, and equipment information
- **AND** the rendered agreement includes the applicable water-safety content.

#### Scenario: Lupișori document is generated

- **GIVEN** the current branch is lupișori
- **WHEN** tools and activity sections are rendered
- **THEN** personal pocket knives, axes, machetes, and blacksmithing are omitted
- **AND** no empty prohibited section remains.

#### Scenario: Overnight shelter is configured

- **GIVEN** an overnight shelter activity is selected
- **WHEN** publication validation runs
- **THEN** location, materials, adult ratio, alternative plan, communication, and evacuation information are required
- **AND** the rendered branch document includes those details.

### Requirement: Publication Validation

The system SHALL distinguish incomplete working drafts from publishable configurations and SHALL block publication when required applicable data is missing.

#### Scenario: Required event data is missing

- **GIVEN** the organizer draft lacks an emergency contact, branch transport, location, or another required field
- **WHEN** the coordinator attempts publication
- **THEN** publication is blocked
- **AND** the response lists stable field paths and Romanian correction messages.

#### Scenario: Activated module lacks safeguards

- **GIVEN** a risk module is activated by organizer answers
- **AND** its required safety information is incomplete
- **WHEN** publication validation runs
- **THEN** publication is blocked
- **AND** validation links the error to the relevant wizard step.

#### Scenario: Non-blocking warning exists

- **GIVEN** the configuration contains an unverified medical travel time or another review warning
- **WHEN** preview or publication validation runs
- **THEN** the warning is shown separately from blocking errors
- **AND** the coordinator can continue after reviewing it.

### Requirement: Branch-Specific PDF Preview

The system SHALL let authorized users preview handwritten PDFs for every configured branch without creating a publication.

#### Scenario: Coordinator previews a complete draft

- **GIVEN** an activity draft and active template are valid for preview
- **WHEN** the coordinator requests preview
- **THEN** the system renders one temporary PDF per configured branch
- **AND** does not create publication or generated-document records.

#### Scenario: Ordinary user requests preview

- **GIVEN** an authenticated user can view the activity but cannot manage it
- **WHEN** they request a draft preview
- **THEN** the API denies access
- **AND** does not disclose unpublished content.

### Requirement: Deterministic Printable PDF Rendering

The system SHALL generate printable PDFs from safe semantic HTML and CSS with stable Romanian typography and the supplied Scouts header identity.

#### Scenario: Romanian content is rendered

- **GIVEN** template and event content contains Romanian diacritics
- **WHEN** a PDF is generated
- **THEN** every supported character renders correctly
- **AND** the configured fonts are embedded or reliably available in the rendering runtime.

#### Scenario: Multi-page agreement is rendered

- **GIVEN** a branch agreement spans multiple pages
- **WHEN** the PDF is generated
- **THEN** every page repeats the configured header and footer identity
- **AND** the footer shows the current page, total page count, publication context, and immutable document identifier.

#### Scenario: Consent block reaches a page boundary

- **GIVEN** a checkbox group, signature block, or response field approaches the bottom of a page
- **WHEN** print layout is calculated
- **THEN** the renderer keeps the critical block together where possible
- **AND** does not clip controls or separate labels from their response areas.

#### Scenario: Template has an explicit page break

- **GIVEN** the structured template includes a page-break node
- **WHEN** the PDF is rendered
- **THEN** the next block starts on a new page consistently.

#### Scenario: Source template uses unsafe edge margins

- **GIVEN** the historical DOCX source contains a zero or otherwise unsafe print margin
- **WHEN** the structured template is seeded or a PDF is rendered
- **THEN** the system applies validated printer-safe margins
- **AND** preserves the recognizable header identity without clipping footer or body content.

#### Scenario: Renderer attempts external access

- **GIVEN** PDF generation is running
- **WHEN** rendered content references a remote URL or external resource
- **THEN** the renderer blocks the network request
- **AND** uses only versioned local assets.

### Requirement: Immutable Transactional Publication

The system SHALL generate and store immutable branch PDFs and their exact input snapshots as one all-or-nothing publication.

#### Scenario: First publication succeeds

- **GIVEN** the organizer draft, active template, organization settings, and referenced assets are valid
- **WHEN** the coordinator publishes
- **THEN** the system stores a configuration snapshot, organization snapshot, template version reference, one PDF per branch, file metadata, and SHA-256 checksums
- **AND** marks the publication active.

#### Scenario: One branch fails to render

- **GIVEN** three branch documents are required
- **AND** one branch fails during rendering or storage
- **WHEN** publication is attempted
- **THEN** no partial publication becomes active
- **AND** the previous active publication remains unchanged.

#### Scenario: Published document is requested repeatedly

- **GIVEN** a branch PDF is part of the active publication
- **WHEN** permitted users download it multiple times
- **THEN** the system returns the exact stored bytes each time
- **AND** does not regenerate the file during download.

### Requirement: Explicit Republication And History

The system SHALL keep draft changes separate from the current publication until the coordinator explicitly republishes.

#### Scenario: Activity draft changes after publication

- **GIVEN** an active publication exists
- **WHEN** the coordinator changes transport, dates, activities, risks, equipment, or other draft data
- **THEN** the current published PDFs remain unchanged and downloadable
- **AND** the workspace shows that unpublished changes exist.

#### Scenario: Coordinator reviews unpublished differences

- **GIVEN** an active publication exists
- **AND** the working draft differs from its configuration snapshot
- **WHEN** the coordinator opens the republication review
- **THEN** the app shows the changed field paths grouped by wizard section
- **AND** does not require the coordinator to compare raw JSON or regenerated files manually.

#### Scenario: Coordinator republishes

- **GIVEN** unpublished changes are valid
- **WHEN** the coordinator confirms republication
- **THEN** a new immutable publication and new branch documents are created
- **AND** the prior publication becomes archived
- **AND** remains available in authorized history.

#### Scenario: Historical template changes

- **GIVEN** a template version used by an archived publication is later inactive or reactivated
- **WHEN** publication history is inspected
- **THEN** the archived publication still references the exact template version that generated it.

### Requirement: Published Agreement Downloads

The system SHALL let authenticated users download the current branch-specific parental consent PDFs for activities they can view.

#### Scenario: Ordinary user downloads current agreement

- **GIVEN** an authenticated user can view an activity
- **AND** the activity has an active parental consent publication
- **WHEN** the user selects a configured branch
- **THEN** the API returns that branch's current PDF with a safe filename, PDF content type, file size, and checksum metadata.

#### Scenario: Ordinary user requests a draft or archived file

- **GIVEN** an authenticated user lacks activity-management or elevated access
- **WHEN** they request a preview, draft file, or archived publication by identifier
- **THEN** the API denies access
- **AND** does not disclose the file or snapshot.

#### Scenario: Activity has no active publication

- **GIVEN** an authenticated user can view an activity
- **AND** no parental consent publication is active
- **WHEN** the user opens the download area
- **THEN** the app shows that no agreement has been published
- **AND** does not expose draft content.

### Requirement: Parental Consent Audit Events

The system SHALL emit central audit entries for important template, configuration, publication, and download actions without storing document bytes or sensitive response content.

#### Scenario: Template version is activated

- **GIVEN** a `super_admin` activates a template version
- **WHEN** activation succeeds
- **THEN** the audit journal records the actor, action, template version, timestamp, and safe lifecycle metadata.

#### Scenario: Coordinator publishes agreements

- **GIVEN** a coordinator publishes branch agreements
- **WHEN** publication succeeds
- **THEN** the audit journal records the actor, activity, publication, template version, branches, checksums, and timestamp
- **AND** does not store PDF bytes or the complete rendered document.

#### Scenario: Published agreement is downloaded

- **GIVEN** a permitted user downloads a published branch PDF
- **WHEN** the download is served
- **THEN** the system may record the user, activity, publication, branch, filename, checksum, and timestamp
- **AND** does not record file bytes or future parent responses.

### Requirement: Initial Template And Example Fixture

The system SHALL provide an idempotent initial template seed and a `Cântul Vâlvelor` example fixture for verification.

#### Scenario: Initial seed runs

- **GIVEN** parental consent seed data is absent
- **WHEN** the seed command runs
- **THEN** it creates organization settings, the three approved header assets, predefined modules, and one structured template version
- **AND** uses only editable starting text derived from the supplied functional specification
- **AND** does not treat the old DOCX legal wording as authoritative
- **AND** reads versioned repository seed resources rather than files from a user's Downloads directory.

#### Scenario: Initial seed runs again

- **GIVEN** the seed data already exists
- **WHEN** the seed command runs again
- **THEN** it does not create duplicate settings, assets, modules, or template versions.

#### Scenario: Example fixture is rendered

- **GIVEN** the `Cântul Vâlvelor` fixture contains the agreed branch dates, transports, activities, and safeguards
- **WHEN** fixture documents are generated
- **THEN** lupișori, temerari, and exploratori receive distinct PDFs
- **AND** the output demonstrates the required branch and risk rules.
