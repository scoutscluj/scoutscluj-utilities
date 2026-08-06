# Tasks

Implementation MUST proceed as vertical slices. Each completed slice must leave the repository buildable and must include proportionate tests before the next slice starts.

## 1. Shared Contracts And Persistence

- [x] Add a workspace package for the parental-consent document, form-field, organizer-draft, branch, module, and validation contracts shared by the API and web app.
- [x] Add `Administrative = 'administrative'` to `ActivityDepartment` and expose `Acord parental` as a feature inside it.
- [x] Add organization-settings, asset, template-version, activity-draft, publication, and generated-document entities.
- [x] Add enums and database constraints for template lifecycle, publication lifecycle, supported branches, and uniqueness of active versions/publications.
- [x] Add a MikroORM migration for all new tables, indexes, foreign keys, enum values, and uniqueness constraints.
- [x] Add entity and migration tests where repository conventions support them.

## 2. Organization Identity, Assets, And Initial Seed

- [x] Add API read/update operations for the single Scouts Cluj organization identity.
- [x] Add `super_admin`-only constrained PNG/JPEG asset upload, metadata, checksum, retrieval, reference checks, and safe deletion behavior; allow template-draft editors to select existing approved assets.
- [x] Extract the three supplied DOCX header assets, copy them into versioned repository seed resources, and record their source hashes so seed and CI execution never depend on a user's Downloads directory.
- [x] Add an idempotent seed for organization settings, assets, predefined modules, and the initial structured template using editable starting text derived from the supplied functional specification.
- [x] Ensure the seed does not import superseded broad legal wording as authoritative content.
- [x] Add tests for seed idempotency, asset validation, checksums, and referenced-asset protection.

## 3. Template Version API

- [x] Add template list, read, create, clone, update, activate, reactivate, and history APIs.
- [x] Enforce editable-draft-only mutation and immutability of active or previously used versions.
- [x] Enforce one active template transactionally.
- [x] Implement `admin` draft-edit access and `super_admin` activation access.
- [x] Validate the allowlisted structured document, layout settings, variables, form fields, module boundaries, and asset references.
- [x] Emit safe central audit entries for template and asset operations.
- [x] Add service and controller tests for permissions, lifecycle, concurrency, validation, and audit behavior.

## 4. Template Editor And Administration UI

- [x] Add the parental-consent administration navigation and route guards.
- [x] Add a block-based WYSIWYG editor with H1-H3, paragraphs, callouts, lists, inline marks, links, tables, separators, and explicit page breaks.
- [x] Add custom nodes and insertion controls for approved assets, allowlisted variables, predefined modules, and form fields.
- [x] Add form-field property panels for type, code, label, help text, required state, options, handwritten size, and future digital validation metadata.
- [x] Add undo/redo for supported document, module, asset, variable, and form-field edits.
- [x] Add template-level preview using a fixed representative sample payload without creating an activity draft or publication.
- [x] Add constrained layout controls and reject arbitrary HTML, CSS, remote resources, and unsupported document nodes.
- [x] Add template clone, save-draft, activate, history, and validation feedback UI.
- [x] Add `super_admin`-only organization identity and approved-asset administration UI while allowing draft editors to browse and insert existing assets.
- [x] Add loading, empty, dirty-state, save-error, conflict, and destructive-confirmation states.
- [x] Replace the placeholder web test script with Vitest and Svelte Testing Library, then add focused editor serialization, undo/redo, preview, sanitization, field-node, and route authorization tests.

## 5. Activity Draft API And Authorization

- [x] Add one mutable parental-consent draft per activity with schema version and revision.
- [x] Add create/read/update and validation APIs for the activity draft.
- [x] Enforce coordinator or `super_admin` management while retaining ordinary authenticated download access for activities readable through the existing activity API.
- [x] Reject event-specific changes to common template clauses.
- [x] Return stable field-path errors and Romanian user-facing validation messages.
- [x] Compare the working draft with the latest publication snapshot and expose changed field paths for republication review.
- [x] Emit safe activity-scoped audit entries without storing full draft payloads.
- [x] Add service/controller tests for authorization, optimistic concurrency, partial draft saving, validation, and audit redaction.

## 6. Organizer Wizard

- [x] Add the `Acord parental` section to enabled activity workspaces.
- [x] Add wizard steps for general event data, location, and emergency contacts.
- [x] Add branch configuration for lupișori, temerari, and exploratori, including branch-specific dates and age ranges.
- [x] Add transport and pickup configuration with branch-specific outbound and return transport.
- [x] Add accommodation and overnight configuration.
- [x] Add activity selection and event-specific activity descriptions.
- [x] Add water and waterslide configuration, including construction-only raft behavior.
- [x] Add tools and sharp-object configuration with branch restrictions.
- [x] Add fire, cooking, and blacksmithing configuration.
- [x] Add hiking and overnight-shelter configuration.
- [x] Add first-aid responsible persons and medical-facility references.
- [x] Add food, allergy-handling, and equipment configuration.
- [x] Add conduct, regulation, and Safe from Harm configuration.
- [x] Add per-step completeness, blocking errors, warnings, progress, autosave/manual-save, and unsaved-change behavior.
- [x] Add responsive desktop/mobile states and keyboard-accessible controls.
- [x] Add focused tests for conditional steps, branch isolation, and validation navigation.

## 7. Safe HTML And PDF Renderer

- [x] Add a deterministic structured-document-to-HTML renderer that escapes all inserted values and never evaluates arbitrary template code.
- [x] Add allowlisted variable resolution and unknown-variable errors.
- [x] Add predefined conditional module rendering from typed organizer data.
- [x] Add handwritten rendering for every supported form-field type.
- [x] Add branch-specific document assembly with no irrelevant or empty sections.
- [x] Add print CSS matching the supplied repeated header identity and US Letter geometry while enforcing printer-safe margins, Romanian typography, checkboxes, response spaces, tables, keep-together rules, explicit page breaks, and a repeated footer with page numbering and immutable identifiers.
- [x] Add Playwright-compatible Chromium PDF generation with external networking disabled.
- [x] Add representative fixture PDFs for every supported block/field and the `Cântul Vâlvelor` example.
- [x] Add renderer tests for diacritics, pagination, branch differences, water/raft rules, tools restrictions, and deterministic output structure.
- [x] Rasterize representative fixture PDFs and add visual regression checks for clipping, overlap, missing glyphs, table breaks, unsafe margins, and separated labels/controls.
- [x] Add a production-like renderer smoke test and configure Railway/API deployment with the required Chromium runtime and fonts.

## 8. Preview, Publication, Storage, And Downloads

- [x] Add coordinator/admin preview generation for all configured branches without persistence as a publication.
- [x] Add strict publication validation against the active template, organization settings, assets, and organizer draft.
- [x] Render every branch before publication state changes.
- [x] Create publication snapshots and immutable branch document rows with SHA-256 checksums in one transaction.
- [x] Archive the prior active publication only when the new publication succeeds completely.
- [x] Add current-publication metadata and branch download endpoints for authenticated users who can view the activity.
- [x] Add archived-publication history and downloads for coordinators and elevated users.
- [x] Use safe filenames, PDF content headers, length, checksum, and cache controls.
- [x] Emit safe publication, republication, preview, and download audit entries.
- [x] Add tests for all-or-nothing publication, immutability, branch uniqueness, ordinary-user access, archived access denial, and exact-byte repeat downloads.

## 9. Preview, History, And Download UI

- [x] Add embedded or linked multi-branch PDF preview with clear branch selection.
- [x] Add blocking-error and warning summaries linked back to wizard steps.
- [x] Add explicit publish and republish confirmation flows.
- [x] Show differences between the working draft and current publication before republication.
- [x] Add publication history with template version, publisher, timestamp, branch files, and checksum metadata for authorized users.
- [x] Add published-document download cards for ordinary authenticated users on activities readable through the existing activity API.
- [x] Ensure ordinary users cannot reach drafts, previews, or history through UI or direct API calls.
- [x] Add loading, empty, render-failure, partial-network-failure, and stale-revision states.

## 10. Documentation And Verification

- [x] Document template structure, supported nodes, fields, variables, modules, and lifecycle.
- [x] Document organizer validation rules, publication snapshots, immutability, and audit conventions.
- [x] Document seed usage and how the two source DOCX files informed the wizard and parent output.
- [x] Document API endpoints through Swagger decorators and representative payloads.
- [x] Document Chromium/font deployment, health checks, rollback, and troubleshooting.
- [x] Add Playwright Test and critical end-to-end coverage from template editing and template preview through activity configuration, branch preview, publication, and ordinary-user branch download.
- [x] Verify the `Cântul Vâlvelor` seed/fixture produces distinct lupișori, temerari, and exploratori documents.
- [x] Run focused API, schema-package, renderer, and web tests after each vertical slice.
- [x] Run `pnpm verify` and the production-like PDF smoke test before calling the change complete.
- [x] Validate the OpenSpec change with `openspec validate add-parental-consent-generator --strict`.
