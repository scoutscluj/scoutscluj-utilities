# PRD: Financial Documents, Keez Handoff, BT Reconciliation

## Problem Statement

Centrul Local Cluj needs a reliable finance workflow inside Scouts Cluj Utilities. Today, receipts, invoices, and payment proofs appear during normal activities and must reach the `Responsabil financiar` and eventually the `Contabil` in Keez, but the app has no local inbox, review workflow, missing-document tracking, or trustworthy reconciliation against BT transactions.

The legacy finance work imported BT exports and attempted statistics, but it relied on weak duplicate detection and mixed bank data, manual categories, and inferred categories in ways that made the results feel unreliable. The new implementation must preserve uploaded documents, support finance review, integrate with Keez where the API allows it, reconcile manually against BT transactions, and produce statistics that separate confirmed data from inferred or missing data.

## Solution

Build a finance-first module with:

- `Documente financiare`: simple user uploads with optional `Activitate` link and notes.
- A review inbox for `Responsabil financiar`, with statuses: `Încărcat`, `În verificare`, `Gata de trimis`, `Trimis`, `Necesită clarificări`, `Respins`, `Arhivat`.
- PWA/Web Push notifications for new document uploads, clarification requests, and status changes.
- A Keez adapter that supports confirmed public API capabilities now and can switch to direct document submission if Keez exposes a suitable endpoint.
- A global direct-to-Keez setting plus per-`Activitate` override.
- BT statement import and normalized transaction statistics using the safer model discovered in the legacy app: deterministic transaction identity, import audit records, purpose/channel metadata, review state, and explicit separation of manual and inferred classifications.
- Manual linking between `Document financiar` and `Tranzacție BT`, including `Document lipsă` tracking.

The first version should not depend on Stripe, full member management, deep activity management, or meal planning. It should leave clean extension points for those later.

## User Stories

1. As a normal authenticated user, I want to upload a financial document with minimal required information, so that I can quickly send receipts or invoices without knowing accounting metadata.
2. As a normal authenticated user, I want to optionally link my upload to an `Activitate`, so that the expense is visible in that activity's financial context.
3. As a normal authenticated user, I want to add optional notes to an upload, so that I can explain what the document is for.
4. As a normal authenticated user, I want to see the status of documents I uploaded, so that I know whether finance accepted, rejected, sent, or needs clarification.
5. As a normal authenticated user, I want to receive clarification requests, so that I can fix missing context or upload a better document.
6. As a `Coordonator`, I want to see documents linked to my `Activitate`, so that I can follow the activity's expense documentation.
7. As a `Coordonator`, I want activity-linked expenses to remain visible even before deep activity management exists, so that the finance module already supports camp and activity budgets.
8. As a `Responsabil financiar`, I want a single inbox for new financial documents, so that uploaded receipts and invoices do not get lost.
9. As a `Responsabil financiar`, I want to filter documents by status, uploader, upload date, activity, and review state, so that I can process documents efficiently.
10. As a `Responsabil financiar`, I want to change a document's status, so that the workflow reflects what still needs review or action.
11. As a `Responsabil financiar`, I want to request clarification from the uploader, so that incomplete uploads can be corrected without private side channels.
12. As a `Responsabil financiar`, I want to mark a document as rejected, so that invalid or duplicate uploads do not pollute finance reports.
13. As a `Responsabil financiar`, I want to archive documents, so that old records stay searchable without cluttering active queues.
14. As a `Responsabil financiar`, I want uploaded files stored with audit metadata, so that every document has a traceable uploader and timestamp.
15. As a `Responsabil financiar`, I want to receive notifications for new uploads, so that documents are reviewed promptly.
16. As a `Responsabil financiar`, I want notifications only when enabled on my device/account, so that the app respects notification preferences.
17. As an uploader, I want notifications for status changes and clarification requests, so that I know when I need to act.
18. As a `Coordonator`, I want to be notified when someone else uploads a document to my activity, so that I can keep the activity budget complete.
19. As a `Responsabil financiar`, I want a global setting for review-first or direct-to-Keez behavior, so that the local center can choose its finance operating mode.
20. As a `Responsabil financiar`, I want each `Activitate` to override the global Keez handoff behavior, so that large or sensitive activities can require review even if routine documents are sent directly.
21. As a `Responsabil financiar`, I want the app to track Keez submission attempts, so that I can see which documents were sent, failed, or need manual handoff.
22. As a `Responsabil financiar`, I want the app to support manual Keez handoff mode, so that the workflow still works if Keez does not expose document-upload APIs.
23. As a `Responsabil financiar`, I want Keez API credentials stored only in server-side configuration, so that secrets are never exposed to the browser or committed.
24. As a developer, I want Keez integration behind an adapter interface, so that confirmed API capabilities and future private endpoints can be swapped without changing local workflow data.
25. As a `Responsabil financiar`, I want to import BT statement exports, so that bank and card transactions are available for reconciliation.
26. As a `Responsabil financiar`, I want BT imports to be idempotent, so that re-uploading the same statement does not create duplicate transactions.
27. As a `Responsabil financiar`, I want repeated same-day equal-amount payments to remain distinct when bank references/details differ, so that membership and activity payments are not lost.
28. As a `Responsabil financiar`, I want import previews before writes, so that I can inspect parsed files, duplicates, warnings, and notices before committing.
29. As a `Responsabil financiar`, I want import audit records, so that every transaction batch has provenance.
30. As a `Responsabil financiar`, I want transactions classified by channel and purpose, so that statistics are not limited to one fragile category field.
31. As a `Responsabil financiar`, I want manual classifications to be protected, so that rule updates do not overwrite reviewed finance work.
32. As a `Responsabil financiar`, I want transactions to show review status, so that unclear rows are not presented as final truth.
33. As a `Responsabil financiar`, I want to manually link one or more financial documents to a BT transaction, so that supporting documentation can be checked.
34. As a `Responsabil financiar`, I want to mark transactions as `Document lipsă`, so that missing receipts or invoices can be collected.
35. As a `Responsabil financiar`, I want to filter transactions by missing-document state, so that document follow-up becomes a daily workflow.
36. As a `Responsabil financiar`, I want financial statistics to separate operational income/expenses from internal transfers and non-posted notices, so that reports match reality.
37. As a `Responsabil financiar`, I want statistics to show totals that need review, so that the dashboard does not imply uncertain data is final.
38. As a `Responsabil financiar`, I want activity-linked document and transaction views, so that a basic budget report can be produced for an activity.
39. As a `Responsabil financiar`, I want exports for manual accountant handoff, so that the Keez workflow is still useful before direct upload support is confirmed.
40. As a `super_admin`, I want to assign `Responsabil financiar` access separately from generic admin access, so that finance data is restricted appropriately.

## Implementation Decisions

- Add a finance-specific permission/role for `Responsabil financiar`, separate from generic admin roles.
- Keep user-facing app content in Romanian with proper Romanian special characters.
- Store financial documents locally first, with minimal upload requirements: file, optional activity link, optional notes, uploader, upload timestamp.
- Keep extracted/reviewed metadata separate from uploader-provided notes so finance corrections do not rewrite user context.
- Store document status transitions with audit entries.
- Expose document visibility by role: uploader sees own uploads, `Coordonator` sees documents linked to their activity, `Responsabil financiar` sees all finance records.
- Add a global finance setting for document handoff mode and a per-activity override.
- Treat Keez as an integration sink, not the local workflow owner.
- Confirmed Keez public API capabilities include OAuth client credentials, articles/items, invoice create/read/update/delete/validate/cancel/email/e-Factura submit/PDF download. The public docs do not show arbitrary receipt/invoice file upload into an accountant inbox.
- Build the Keez adapter to support current invoice API operations and a manual/export fallback for generic documents until Keez confirms document-ingestion APIs.
- Never write Keez secrets into source control. Use environment variables for app id, client id, staging secret, production secret, client EID, environment, and base URLs.
- Add PWA/Web Push infrastructure as a platform dependency for finance notifications, adapted to the new SvelteKit/NestJS/Postgres stack rather than copying the legacy Firebase implementation directly.
- Import BT statements with deterministic fingerprints and import audit records.
- Preserve manual transaction classifications and distinguish `manual`, `rule`, `legacy`, and `none` category sources.
- Track transaction purpose/channel separately from accounting category.
- Include manual document-to-transaction linking in v1. Automatic matching is deferred.
- Keep `Activitate` support minimal in this PRD: documents and transactions can be linked to an activity, but full event management, participant management, payments, and meal planning are separate later PRDs.
- Leave Stripe out of implementation while keeping the financial model compatible with future Stripe payment and payout reconciliation.

## Testing Decisions

- Backend service tests should cover document creation, status transitions, visibility rules, audit entries, and clarification requests.
- Backend integration/controller tests should cover finance role enforcement and uploader/coordinator/responsabil financiar access boundaries.
- Keez adapter tests should use mocked HTTP responses for token retrieval, invoice API calls, error mapping, retryable failures, and unsupported direct-document mode.
- Notification tests should cover subscription storage, targeting rules, and event triggers without requiring real push delivery.
- BT parser/import tests should reuse legacy observations: MT940 tag boundaries, CSV parsing, repeated same-day same-amount payments, zero-value notices, and duplicate import detection.
- Transaction/document linking tests should assert one transaction can link multiple documents, one document can support multiple transactions when needed, and `Document lipsă` is cleared when coverage is sufficient.
- Frontend checks should cover Romanian labels, protected routes, document upload, reviewer inbox states, and finance dashboard filters.
- Avoid testing implementation details; test externally visible behavior at API/service and route-level seams.

## Out of Scope

- Full member database and user management.
- Orgo member writeback or age-branch synchronization.
- Deep `Activitate` management beyond linking finance records to an activity.
- Meal planner.
- Stripe implementation.
- Automatic document OCR/extraction.
- Automatic document-to-transaction matching.
- Creating real accounting entries in Keez unless Keez confirms a suitable API.
- Replacing Keez as the accounting system.
- Importing all legacy Firestore finance data into Postgres in this PRD, except for analysis and migration planning.

## Further Notes

Keez public API references used during discovery:

- https://app.keez.ro/help/api/
- https://app.keez.ro/help/api/auth.html
- https://app.keez.ro/help/api/api_usage_info.html
- https://app.keez.ro/help/api/invoice.html
- https://app.keez.ro/help/api/invoice_create.html
- https://app.keez.ro/help/api/invoice_submit_efactura.html
- https://app.keez.ro/help/api/invoice_download_pdf.html

Questions for the Keez team:

1. Is there an API endpoint for uploading arbitrary accounting documents such as supplier invoices, fiscal receipts, POS receipts, or payment proofs into the company document inbox?
2. If yes, what endpoint, authentication scope, request format, file size limits, MIME types, and metadata fields are supported?
3. Can uploaded documents be linked to bank transactions or reconciliation records in Keez through the API?
4. Can we query document processing status after upload, including duplicates, accepted/rejected state, and accountant comments?
5. Is there a sandbox endpoint for document upload, and can our staging credentials access it?
6. Are there webhooks for document status changes, e-Factura status, or accountant review comments?
7. Does Keez expose APIs for purchase invoices/expense documents separately from customer invoice creation?
8. Are `clientEid`, `externalId`, and idempotency rules available for uploaded documents the same way they are for invoices/items?
9. What retention/privacy rules apply to files uploaded via API?
10. Can Keez ingest documents by email to a company-specific address if no API upload exists, and can that be automated safely?
