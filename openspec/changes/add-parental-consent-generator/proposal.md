# Change: Add Activity-Scoped Parental Consent Generator

## Why

Scouts Cluj currently prepares parental consent documents from two Word templates: one used by leaders to describe an event and one completed by parents. That process duplicates event data, makes branch-specific differences difficult to represent, and cannot guarantee which text and event details were used for a published form.

The application already has local `Activitate` records, activity coordinators, role-aware activity workspaces, an app audit journal, and immutable file storage patterns. The parental consent generator should build on those foundations instead of introducing a second event model.

The first delivery is an internal, handwritten-form MVP. It must let leaders configure the event once, generate one branch-specific parental consent PDF per applicable branch, publish immutable files, and let authenticated users download the published forms. It must also establish a reusable structured template and form-field model so later digital completion can use the same template without redesigning it.

## What Changes

- Add `Acord parental` as an administrative area inside an existing activity workspace.
- Add a single-organization Scouts Cluj identity configuration whose values are snapshotted at publication time.
- Add a versioned parental-consent template with one active version at a time.
- Add a block-based WYSIWYG template editor with headings, paragraphs, callouts, inline formatting, lists, links, tables, separators, explicit page breaks, approved asset insertion, variable placeholders, configurable form fields, undo/redo, and template preview.
- Add a shared form-field schema for handwritten and future digital rendering, including text, dates, numbers, contact fields, selections, confirmations, repeating groups, and signature fields.
- Add predefined, testable conditional modules rather than an arbitrary rule-expression builder.
- Add an activity-scoped organizer wizard for general details, location, branches, transport, accommodation, activities, water, tools, fire and blacksmithing, hiking and overnight shelter, first aid, food and allergies, equipment, conduct, and Safe from Harm.
- Generate a separate handwritten PDF for each configured branch so dates, transport, activities, risks, and equipment cannot become ambiguous.
- Add draft preview and explicit publication. Published PDFs are stored once with their template version, configuration snapshot, organization snapshot, file checksum, and publication metadata.
- Keep published files immutable. Later activity edits remain draft changes until the coordinator explicitly republishes, creating a new publication and archiving the previous one.
- Allow any authenticated user who can view an activity to download its current published parental consent PDFs while restricting configuration and preview access.
- Reuse the existing app audit journal for template version, configuration, preview, publication, republication, and download events where traceability is useful.
- Seed a first structured template and the three existing header assets from the supplied leader and parent DOCX files, while treating the old legal wording as historical material rather than authoritative content.
- Add API documentation, migrations, backend tests, a real web test stack, renderer tests, visual PDF regression checks, and critical end-to-end coverage.

## Out Of Scope

- Digital parent accounts or parent-facing completion flows.
- Storing participant, guardian, medical, medication, or signature responses.
- OTP, electronic signatures, signature-provider integrations, or uploaded handwritten signed copies.
- Resigning workflows or determining whether a change legally requires a new signature.
- Multi-organization or multi-local-center tenancy.
- Legal-review departments, approval queues, legal-review metadata, or legal watermarks.
- An arbitrary visual layout designer or arbitrary conditional-expression editor.
- Event-specific edits to common template clauses by coordinators.
- Automated legal or medical decisions, including deciding which medicines are permitted.
- Medication-class or treatment-protocol administration beyond editable template text and field blocks.
- Email invitations and parent notifications.
- Multilingual templates, multiple concurrent template families, and multiple visual themes.

## Impact

- Affected specs: `parental-consent-generator` (new).
- Affected app areas: API parental-consent module, activity department enum, activity workspace navigation, admin template routes, activity parental-consent routes, audit vocabulary, PDF file endpoints, seed tooling, and deployment configuration for the PDF renderer.
- Affected data: organization settings, template assets, template versions, activity consent drafts, publications, branch-specific generated documents, and audit entries.
- Security impact: template content must be sanitized, arbitrary HTML and arbitrary file embedding must be rejected, download authorization must follow activity visibility, and audit metadata must not contain generated file bytes or future sensitive response data.
- Migration impact: add parental-consent tables and rename the initial `parental_consent` activity department value to `administrative`, preserving existing activity activation while correcting the department/feature model.
- Deployment impact: the API runtime must include a deterministic Chromium-compatible HTML-to-PDF renderer and Romanian fonts.
