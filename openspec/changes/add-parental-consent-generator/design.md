# Design: Activity-Scoped Parental Consent Generator

## Context

Scouts Cluj Utilities is a SvelteKit, NestJS, and Postgres application. Current foundations include:

- Orgo SSO and local authenticated sessions.
- Existing roles: `moderator`, `admin`, `finance_manager`, and `super_admin`.
- Local `Activitate` records with a coordinator, departments, dates, location, description, and optional Orgo event references.
- Activity-scoped workspaces for overview, finance, kitchen, settings, and audit.
- A central audit journal with activity-scoped visibility.
- PostgreSQL `bytea` file storage and SHA-256 checksums for financial documents.
- SvelteKit server routes that call NestJS APIs with the authenticated session.

Two current DOCX files provide source material:

- `Template ACORD PARENTAL (Lideri).docx` describes event information collected from leaders.
- `Template ACORD PARENTAL (Parinți).docx` contains the handwritten parent form.

They use the same US Letter page geometry and the same three floating header assets: the Scouts Romania wordmark, the Safe from Harm mark, and the Scouts Cluj mark. The generated parent PDF should preserve that recognizable header system. The source document's zero bottom margin is not a fidelity requirement; generated output must use printer-safe configurable margins. The leader document becomes product and field-structure input for the administrative wizard rather than a separate generated output.

The old parent document contains wording that the new product specification explicitly supersedes, including broad authorization and a `clinically healthy` declaration. Its wording is not imported as authoritative legal content.

## Goals

- Configure parental consent inside the existing activity administration area.
- Keep one clear source of truth for the working event configuration.
- Generate unambiguous branch-specific handwritten forms.
- Let administrators make rare global template changes without a deployment.
- Preserve every published file and the exact inputs that produced it.
- Use one structured content and field schema for handwritten output now and digital completion later.
- Keep conditional behavior predefined, typed, and testable.
- Match the supplied visual identity while producing stable, printable PDFs with Romanian diacritics.

## Non-Goals

- Build the digital completion or signing product in this change.
- Model canonical participants, guardians, medical profiles, or medication handovers.
- Build a general-purpose document design application.
- Support multiple organizations.
- Implement legal-review workflow concepts.
- Permit coordinators to override shared clauses for a single activity.
- Import the old DOCX body as final legal text.

## Product Placement And Navigation

Add `ParentalConsent` to `ActivityDepartment` and expose the feature under the activity workspace when that department is enabled.

Coordinator and elevated routes:

- `/activities/:activityId/parental-consent`
- `/activities/:activityId/parental-consent/configure`
- `/activities/:activityId/parental-consent/preview`
- `/activities/:activityId/parental-consent/history`

Global administration routes:

- `/admin/parental-consent`
- `/admin/parental-consent/templates`
- `/admin/parental-consent/templates/:versionId`
- `/admin/parental-consent/organization`
- `/admin/parental-consent/assets`

Regular users do not enter the configuration workspace. A published-download section is shown on the activity overview or parental-consent landing page for every activity they can view.

## Authorization

API authorization is authoritative.

- `super_admin` can create, edit, activate, reactivate, and inspect template versions; manage organization identity and assets; and manage parental-consent configuration for any activity.
- `admin` can create and edit inactive template versions and insert assets already present in the approved library, but cannot manage the asset library or activate a template version.
- The activity coordinator can edit that activity's consent draft, preview it, publish it, republish it, inspect publication history, and download its files.
- Other authenticated users can list and download only the current published documents for activities they can read through the existing activity API. The current application exposes activity details to authenticated users, so this preserves the agreed ordinary-user download access without introducing a new participant relationship.
- Drafts, previews, snapshots, and publication history are not exposed to ordinary users.

Organization identity and approved asset library management are restricted to `super_admin`.

Template activation and event publication are separate actions. A coordinator always publishes with the one active template version.

## Template Lifecycle

There is exactly one active template version.

- A new installation seeds an inactive initial template version and the three supplied visual assets.
- Editing never mutates an active or previously used version. The system clones it into a new editable version.
- An `admin` or `super_admin` may edit an inactive version.
- Only `super_admin` can activate a version.
- Activating a version deactivates the previous active version transactionally.
- A historical version can be cloned or reactivated without changing past publications.
- There is no legal approval state or legal-review metadata.

Lifecycle state is represented only as operational state: `draft`, `active`, or `archived`.

## Structured Template Document

Use a ProseMirror/Tiptap-compatible JSON document rather than arbitrary HTML. The editor and renderer share an allowlisted schema from a small workspace package because this is a real cross-app contract.

Supported content nodes:

- heading levels 1-3,
- paragraph,
- block quote or callout,
- ordered and unordered lists,
- horizontal separator,
- table with header and body cells,
- explicit page break,
- approved asset,
- variable placeholder,
- form field,
- predefined conditional module boundary.

Supported inline marks:

- bold,
- italic,
- underline,
- link.

Arbitrary HTML, scripts, inline event handlers, arbitrary CSS, embedded remote resources, arbitrary font changes, and arbitrary image uploads inside the document body are rejected.

The template version also stores constrained layout settings such as page size, margins, base font, heading scale, header/footer selection, checkbox treatment, field line height, and keep-together preferences. These settings are validated against safe ranges.

The editor provides local undo/redo for all supported content and field changes. It also provides a template-level preview rendered with a fixed representative sample payload. Template preview is distinct from activity preview: it helps administrators check layout while editing and does not create or modify an activity draft or publication.

## Form Field Schema

Form fields are first-class template nodes. Each field has a stable code and common properties:

- label,
- help text,
- type,
- required flag,
- handwritten display height or line count,
- options where applicable,
- placeholder where applicable,
- future digital validation metadata,
- sensitivity classification for future use.

Supported types:

- short text,
- long text,
- date,
- number,
- phone,
- email,
- yes/no,
- single choice,
- multiple choice,
- select/dropdown,
- acknowledgement or consent checkbox,
- repeating group,
- signature,
- signature date,
- read-only information.

In this MVP, the handwritten renderer produces labels, empty lines, empty boxes, option lists, and sufficient response space. It never stores responses. The same schema is deliberately suitable for a later digital form renderer.

## Variables

Variable placeholders use stable semantic codes rather than arbitrary template evaluation. Examples include:

- `organization.legalName`
- `organization.legalRepresentativeName`
- `activity.title`
- `activity.startDate`
- `activity.endDate`
- `branch.name`
- `branch.startDate`
- `branch.returnTransport`
- `consent.location.name`
- `consent.emergencyContact.name`

The API resolves variables from an allowlist. Unknown variables are validation errors. User-provided values are inserted as text and escaped; they cannot introduce markup.

## Predefined Conditional Modules

The system does not expose an arbitrary rule language. Module codes and their activation logic are implemented and tested as a typed registry. Administrators can edit module presentation, common text, field blocks, order, and enabled state in a template version.

Initial module codes:

- `GENERAL_EVENT`
- `LOCATION`
- `BRANCH_DETAILS`
- `TRANSPORT`
- `ACCOMMODATION`
- `ACTIVITIES`
- `WATER_ACTIVITY`
- `TOOLS_AND_SHARP_OBJECTS`
- `FIRE_COOKING_BLACKSMITHING`
- `HIKING`
- `OVERNIGHT_SHELTER`
- `FIRST_AID_AND_MEDICAL_FACILITIES`
- `FOOD_AND_ALLERGIES`
- `EQUIPMENT`
- `CONDUCT`
- `SAFE_FROM_HARM`
- `PHOTOGRAPHY`
- `PARENT_AND_PARTICIPANT_FIELDS`
- `SIGNATURES`

Examples of fixed conditional behavior:

- A branch document includes only that branch's dates, transport, activities, risks, and equipment.
- Personal pocket knives, axes, machetes, and blacksmithing are not rendered for lupișori unless a future product change explicitly changes the typed rule.
- A raft configured as construction-only says that it does not carry participants and does not ask swimming or life-jacket questions for raft transport.
- Waterslide activates the water-safety content and required organizer inputs.
- Overnight shelter requires location, materials, adult ratio, alternative plan, communication, and evacuation details.

## Activity Consent Draft

Each activity has at most one mutable working draft. The source of truth is a versioned, typed JSONB payload because the wizard is a cohesive aggregate with many conditional fields that evolve together and is not queried across activities for operational reporting in this MVP.

The draft payload contains:

- general event and contact data,
- location,
- branch configurations,
- accommodation,
- transport,
- activity catalog selections and event-specific descriptions,
- water configuration,
- tools configuration,
- fire, cooking, and blacksmithing configuration,
- hiking and overnight shelter configuration,
- first-aid contacts and medical facilities,
- food and allergy handling,
- equipment lists,
- conduct and Safe from Harm details.

The API validates the JSONB payload against the shared schema before persistence and again before preview/publication. Schema version is stored so future migrations can be explicit.

Changes after publication update only the working draft. The current publication remains active until explicit republication.

## Branches

The MVP supports:

- `lupisori`
- `temerari`
- `exploratori`

Each configured branch can override:

- date range,
- age range,
- outbound transport,
- return transport,
- applicable activities,
- applicable tools and risks,
- hiking plan,
- equipment.

Publication generates exactly one PDF per configured branch. A mixed activity therefore exposes distinct download actions rather than one document containing conditional alternatives.

## Data Model

Use integer primary keys, snake_case database columns, MikroORM `defineEntity`, and explicit indexes to match repository conventions.

### Organization Settings

`parental_consent_organization_settings`:

- `id`
- `legal_name`
- `short_name`
- `legal_identifier`
- `address`
- `email`
- `phone`
- `legal_representative_name`
- `legal_representative_role`
- `safe_from_harm_reference`
- `updated_by_id`
- `created_at`
- `updated_at`

Only one row is used in this single-organization application.

### Assets

`parental_consent_assets`:

- `id`
- `name`
- `original_filename`
- `content_type`
- `file_size`
- `checksum_sha256`
- `file_data` bytea
- `created_by_id`
- `created_at`

Allowed MIME types and dimensions are constrained. Templates refer to asset IDs; active and historical assets cannot be deleted while referenced.

### Template Versions

`parental_consent_template_versions`:

- `id`
- `version`
- `name`
- `state`: `draft`, `active`, or `archived`
- `document_schema_version`
- `document` JSONB
- `layout` JSONB
- `source_version_id` nullable
- `created_by_id`
- `activated_by_id` nullable
- `activated_at` nullable
- `created_at`
- `updated_at`

Database constraints and service transactions ensure that at most one row is active.

### Activity Drafts

`parental_consent_activity_drafts`:

- `id`
- `activity_id` unique
- `schema_version`
- `configuration` JSONB
- `revision`
- `updated_by_id`
- `created_at`
- `updated_at`

### Publications

`parental_consent_publications`:

- `id`
- `activity_id`
- `publication_number`
- `template_version_id`
- `state`: `active` or `archived`
- `configuration_snapshot` JSONB
- `organization_snapshot` JSONB
- `published_by_id`
- `published_at`
- `archived_at` nullable

Only one publication per activity is active.

### Generated Documents

`parental_consent_documents`:

- `id`
- `publication_id`
- `branch`
- `original_filename`
- `content_type`
- `file_size`
- `checksum_sha256`
- `file_data` bytea
- `created_at`

There is one document per branch per publication. File bytes, checksum, and publication relationships are immutable after insert.

## Validation

Draft save validates shape and local field constraints but allows incomplete content.

Preview and publication run stricter validation. Publication is blocked when applicable information is missing, including:

- organization identity and legal representative,
- active template version,
- event coordinator and emergency contact,
- event period and location,
- at least one branch,
- branch transport,
- activity descriptions,
- first-aid responsible person or an explicit explanation,
- at least one medical facility reference,
- equipment information,
- conduct and Safe from Harm information,
- required safety details for every activated risk module.

Validation errors use stable field paths and Romanian user-facing messages so the wizard can link users to the relevant step.

Warnings do not block publication but require visibility, including low adult ratios, unverified travel times, activity-specific safeguards that deserve review, and missing optional alternatives.

## Preview And Publication

Preview:

- uses the current draft and active template,
- renders every configured branch,
- returns ephemeral PDF bytes or short-lived preview resources,
- does not create a publication or generated-document row,
- is available only to the coordinator and elevated users.

Publication:

1. Load and validate the activity, working draft, active template, organization settings, and referenced assets.
2. Produce a canonical configuration snapshot and organization snapshot.
3. Render every branch before changing publication state.
4. Compute SHA-256 and file metadata for every PDF.
5. In one database transaction, create the publication and document rows, archive the previous active publication, and write the audit entry.
6. Return the new publication and branch download metadata.

If any branch fails to render or store, no partial publication becomes active.

## PDF Rendering

Use server-side HTML/CSS rendered through Playwright-compatible Chromium.

- The template document is converted to safe semantic HTML from the allowlisted JSON schema.
- Print CSS defines US Letter geometry derived from the supplied templates, printer-safe validated margins, header assets, footer metadata, Romanian fonts, checkbox styling, and branch-specific sections. It must not copy the source document's zero bottom margin literally.
- Sections, tables, form fields, and checkbox groups use print rules that avoid splitting critical blocks where possible.
- Explicit page-break nodes are honored.
- Header assets are versioned application assets, not remote URLs.
- The repeated page footer includes activity identifier, publication number, template version, branch, current page number, total page count, and an immutable document/publication identifier.
- The SHA-256 checksum is computed only after the final PDF bytes exist and is stored and returned as metadata. The PDF does not attempt to embed its own final checksum because that would create a self-referential hash.
- The renderer performs no external network requests.

Add a deployment smoke test that renders a Romanian fixture in the production-like API environment. The Railway/API build must install the matching Chromium runtime and required fonts. Failure to provide the browser is a deployment failure, not a runtime fallback to a different layout engine.

## Downloads

Current-publication endpoints expose metadata and branch-specific PDF downloads.

- The API checks that the requester is authenticated and can view the activity.
- The response uses `application/pdf`, a safe branch-specific filename, `Content-Length`, and checksum metadata.
- Draft or archived document IDs cannot be fetched through the ordinary current-download endpoint.
- Coordinators and elevated users can fetch archived publications from the history API.
- Download audit stores IDs and safe metadata only, never document bytes.

## Audit Behavior

Emit central audit entries for:

- organization settings updates,
- asset creation and permitted deletion,
- template draft creation and update,
- template activation or reactivation,
- activity draft creation and update,
- preview generation,
- publication and republication,
- archived publication download by elevated users,
- current publication download when useful for traceability.

Audit metadata may contain entity IDs, activity ID, template version, branch, filename, checksum, validation summary, and changed field paths. It must not contain asset bytes, PDF bytes, complete document JSON, or future parent/medical responses.

## Seed And Template Source

Add an idempotent seed that:

- creates the Scouts Cluj organization-settings row,
- copies the three header PNG assets extracted from the supplied DOCX files into versioned repository seed resources and imports them from there,
- creates an initial structured template version with the agreed block and form-field schema,
- creates predefined module definitions and branch placeholders,
- uses only editable starting text derived from the supplied functional specification,
- does not copy the old broad legal clauses as authoritative content and does not invent additional legal claims.

The seed content is a configurable implementation starting point. Runtime and CI execution must not depend on the original files remaining in a user's Downloads directory. It does not introduce a legal-approval workflow.

## API Shape

Representative endpoints:

- `GET /api/parental-consent/organization`
- `PUT /api/parental-consent/organization`
- `GET /api/parental-consent/assets`
- `POST /api/parental-consent/assets`
- `GET /api/parental-consent/templates`
- `POST /api/parental-consent/templates`
- `GET /api/parental-consent/templates/:versionId`
- `PUT /api/parental-consent/templates/:versionId`
- `POST /api/parental-consent/templates/:versionId/preview`
- `POST /api/parental-consent/templates/:versionId/activate`
- `POST /api/parental-consent/templates/:versionId/clone`
- `GET /api/activities/:activityId/parental-consent/draft`
- `PUT /api/activities/:activityId/parental-consent/draft`
- `POST /api/activities/:activityId/parental-consent/validate`
- `POST /api/activities/:activityId/parental-consent/preview`
- `POST /api/activities/:activityId/parental-consent/publish`
- `GET /api/activities/:activityId/parental-consent/publications`
- `GET /api/activities/:activityId/parental-consent/current`
- `GET /api/activities/:activityId/parental-consent/current/:branch/pdf`
- `GET /api/activities/:activityId/parental-consent/publications/:publicationId/:branch/pdf`

Swagger DTOs document all request, response, validation, and enum shapes.

## Rollout

Recommended vertical slices:

1. Shared schema package, database schema, organization settings, and permission helpers.
2. Template asset and version APIs with initial seed.
3. Template editor and admin UI.
4. Activity draft schema, APIs, and wizard shell.
5. Wizard modules and conditional validation.
6. Safe document-to-HTML renderer and branch-specific PDF generation.
7. Preview UI, transactional publication, immutable storage, and downloads.
8. History, diffs, audit vocabulary, documentation, and end-to-end verification.

## Validation Strategy

Backend coverage includes:

- role and activity authorization,
- active-template uniqueness,
- template cloning and immutability,
- structured document and field-node validation,
- placeholder escaping and unknown-variable rejection,
- module activation rules,
- branch isolation,
- draft versus publication validation,
- all-or-nothing publication,
- checksum and immutable download behavior,
- audit metadata safety.

Renderer fixtures cover:

- Romanian diacritics,
- all supported content and field nodes,
- long text and multi-page tables,
- checkbox groups,
- page breaks,
- no empty conditional sections,
- branch-specific transport and activities,
- construction-only raft wording,
- no prohibited lupișori tool sections,
- keep-together behavior for fields and consent blocks.

The web app currently has no real test runner. This change adds Vitest and Svelte Testing Library for focused editor, form-field, wizard, and route-behavior tests, replacing the placeholder web test script. Playwright Test covers the critical end-to-end path from configuration through template preview, activity preview, publication, and ordinary-user download.

PDF verification includes structural assertions plus rasterized visual regression checks for representative fixtures. Generated fixture PDFs are rendered to page images in CI or a production-like verification job so clipping, overlap, missing glyphs, broken tables, unsafe margins, and separated labels/controls are detectable rather than inferred from text extraction alone.
