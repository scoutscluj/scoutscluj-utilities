## ADDED Requirements

### Requirement: Financial Role

The system SHALL distinguish `Responsabil financiar` access from generic admin access.

#### Scenario: Finance user opens finance dashboard

- **GIVEN** an authenticated user has `Responsabil financiar` access
- **WHEN** they open the finance dashboard
- **THEN** they can see financial documents, BT transactions, reconciliation, settings, and statistics

#### Scenario: Non-finance user opens finance dashboard

- **GIVEN** an authenticated user does not have finance access
- **WHEN** they open finance-only routes
- **THEN** the API denies access

### Requirement: Simple Financial Document Upload

The system SHALL let authenticated users upload a `Document financiar` with only a file, optional activity link, and optional notes.

#### Scenario: User uploads document

- **GIVEN** an authenticated user selects a valid file
- **WHEN** they upload it with optional notes and optional `Activitate`
- **THEN** the system stores the file privately
- **AND** records uploader, timestamp, original filename, content type, checksum, notes, and activity link
- **AND** sets status to `Încărcat`

#### Scenario: Invalid file upload

- **GIVEN** a user uploads a file that violates type or size rules
- **WHEN** the upload is submitted
- **THEN** the system rejects the upload with Romanian user-facing guidance
- **AND** does not create an active financial document

### Requirement: Document Visibility

The system SHALL restrict document visibility by relationship and role.

#### Scenario: Uploader sees own documents

- **GIVEN** a user uploaded financial documents
- **WHEN** they view their document list
- **THEN** they see their own uploads and current statuses
- **AND** they do not see unrelated users' documents

#### Scenario: Finance user sees all documents

- **GIVEN** a `Responsabil financiar` opens the document inbox
- **WHEN** documents exist from multiple uploaders
- **THEN** all documents are visible with uploader, status, notes, activity link, and audit summary

#### Scenario: Coordinator sees activity documents

- **GIVEN** a `Coordonator` owns an activity
- **WHEN** a financial document is linked to that activity
- **THEN** the coordinator can see that activity-linked document

### Requirement: Document Preview

The system SHALL show inline previews for financial documents in both the general register and activity finance view.

#### Scenario: Preview a PDF or image document

- **GIVEN** a visible financial document is a PDF or browser-previewable image
- **WHEN** a user opens the general financial register or an activity finance page
- **THEN** the document row shows a small preview
- **AND** clicking the preview opens a larger protected preview without downloading the file

### Requirement: Document Review Lifecycle

The system SHALL support the approved financial document statuses and audited transitions.

#### Scenario: Finance changes document status

- **GIVEN** a `Responsabil financiar` reviews a document
- **WHEN** they change its status
- **THEN** the system records previous status, new status, actor, timestamp, and optional comment

#### Scenario: Clarification is requested

- **GIVEN** a document needs more context
- **WHEN** finance marks it `Necesită clarificări`
- **THEN** the uploader can see the request and comment
- **AND** the document remains visible in finance follow-up queues

### Requirement: Finance Notifications

The system SHALL send PWA/Web Push notifications for finance workflow events when users have enabled notifications.

#### Scenario: New upload notifies finance

- **GIVEN** one or more `Responsabil financiar` users have active notification subscriptions
- **WHEN** a user uploads a financial document
- **THEN** those finance users receive a generic notification linking to the protected inbox

#### Scenario: Status change notifies uploader

- **GIVEN** an uploader has active notifications
- **WHEN** their document status changes or clarification is requested
- **THEN** the uploader receives a notification linking to their document detail page

### Requirement: Keez Handoff Settings

The system SHALL support a global document handoff mode and per-activity override.

#### Scenario: Activity inherits global mode

- **GIVEN** an activity has no handoff override
- **WHEN** a document is uploaded for that activity
- **THEN** the document follows the global finance handoff mode

#### Scenario: Activity forces review

- **GIVEN** an activity is configured to require review
- **WHEN** a document is uploaded while global direct mode is enabled
- **THEN** the document stays in the review workflow and is not sent directly

### Requirement: Keez Integration Adapter

The system SHALL integrate with Keez through a server-side adapter that records attempts and supports manual fallback when direct document upload is unavailable.

#### Scenario: Keez supports operation

- **GIVEN** Keez supports the configured handoff operation
- **WHEN** the system submits a document or invoice-related payload
- **THEN** the adapter authenticates server-side
- **AND** records request outcome, external identifier, response summary, and timestamp

#### Scenario: Keez document upload unsupported

- **GIVEN** Keez has no configured generic document upload endpoint
- **WHEN** a document is ready for Keez
- **THEN** the system marks the handoff mode as manual/export
- **AND** keeps local document status and audit trail available to finance users

### Requirement: BT Statement Import

The system SHALL import BT CSV, MT940, and ZIP statement exports through a preview-first pipeline.

#### Scenario: Import preview

- **GIVEN** a finance user uploads statement files
- **WHEN** parsing completes
- **THEN** the preview shows discovered files, parsed transactions, duplicates, warnings, and notices
- **AND** no transactions are written until the user confirms

#### Scenario: Re-import same statement

- **GIVEN** a statement was already imported
- **WHEN** the same source is imported again
- **THEN** the preview identifies existing transactions
- **AND** confirming the import does not create duplicates

#### Scenario: Same-day equal-amount transactions

- **GIVEN** multiple real transactions share the same date, direction, and amount
- **WHEN** bank references or normalized details differ
- **THEN** the importer treats them as distinct transactions

### Requirement: Transaction Classification And Review

The system SHALL store channel, purpose, category, category source, and review status separately on BT transactions.

#### Scenario: Manual category protected

- **GIVEN** a transaction has a manually reviewed category
- **WHEN** category rules are changed or applied
- **THEN** the manual category is not overwritten

#### Scenario: Unclear transaction

- **GIVEN** a transaction cannot be classified confidently
- **WHEN** it appears in statistics
- **THEN** it contributes to review-risk totals and remains filterable as needing review

### Requirement: Manual Document-Transaction Linking

The system SHALL let finance users manually link financial documents and BT transactions.

#### Scenario: Link document to transaction

- **GIVEN** a finance user opens a BT transaction
- **WHEN** they link one or more financial documents
- **THEN** the transaction shows linked document coverage
- **AND** the link action is audited

#### Scenario: Mark missing document

- **GIVEN** a BT transaction requires support
- **WHEN** finance marks it as `Document lipsă`
- **THEN** the transaction appears in missing-document filters and statistics

#### Scenario: Clear missing document

- **GIVEN** a transaction is marked `Document lipsă`
- **WHEN** finance links sufficient supporting documents
- **THEN** the transaction is no longer counted as missing documentation

### Requirement: Finance Statistics

The system SHALL provide finance statistics based on normalized BT transactions and document coverage.

#### Scenario: Operational overview

- **GIVEN** BT transactions are imported
- **WHEN** a finance user opens statistics
- **THEN** the dashboard shows operational income, operational expenses, net flow, needs-review total, and missing-document total
- **AND** internal transfers are separated from operational totals

#### Scenario: Purpose and channel summaries

- **GIVEN** transactions have purpose and channel metadata
- **WHEN** statistics are rendered
- **THEN** the dashboard groups amounts by purpose, channel, and month

### Requirement: Minimal Activity Finance Link

The system SHALL allow financial documents and BT transactions to be linked to an activity without implementing full activity management.

#### Scenario: Activity-linked document

- **GIVEN** an activity reference exists
- **WHEN** a document is uploaded or reviewed
- **THEN** the document can be linked to that activity

#### Scenario: Activity-linked transaction

- **GIVEN** a BT transaction relates to an activity
- **WHEN** finance edits the transaction
- **THEN** the transaction can be linked to that activity for future budget reports
