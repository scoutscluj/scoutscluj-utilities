# Change: Add Financial Document Workflow And BT Reconciliation

## Why

Centrul Local Cluj needs a finance-first workflow in the new app before deeper activity, member, or payment features are migrated. Normal users need a simple way to upload receipts, invoices, and payment proofs. The `Responsabil financiar` needs review queues, notifications, Keez handoff tracking, BT transaction import, manual reconciliation, and reliable statistics.

The legacy app already explored BT imports and statistics, but old duplicate handling and category inference made the results hard to trust. The new implementation should use the legacy findings as discovery input while building a typed, audited Postgres-backed finance model.

Keez is the external accounting partner, but the public Keez API currently documents invoice/items operations rather than a general accounting document upload endpoint. The app should therefore own the local workflow and integrate through a Keez adapter with a manual fallback until Keez confirms more API capacity.

## What Changes

- Add a finance role/capability for `Responsabil financiar`.
- Add local `Documente financiare` upload, review, audit, visibility, and status management.
- Add global and per-activity document handoff settings for review-first versus direct-to-Keez behavior.
- Add a Keez integration adapter with secure server-side credentials, confirmed public invoice API support, direct-document capability detection/configuration, and Gmail email handoff fallback.
- Add PWA/Web Push notification infrastructure needed for finance upload and clarification workflows.
- Add BT transaction import, import previews, deterministic duplicate protection, classification metadata, review status, and statistics.
- Add manual links between `Document financiar` and `Tranzacție BT`, including `Document lipsă` tracking.
- Add a minimal `Activitate` reference hook so documents and transactions can be linked to an activity without implementing full activity management.
- Document Keez open questions for the team.

## Out Of Scope

- Full member management and Orgo member writeback.
- Deep event/activity management and participant workflows.
- Meal planner.
- Stripe implementation.
- Automatic OCR or document metadata extraction.
- Automatic document-to-transaction matching.
- Direct Keez generic document upload unless Keez confirms an API. Confirmed email ingestion through `cui@keez.ro` is in scope.
- Full legacy data migration.

## Impact

- Affected specs: `financial-management` (new)
- Affected app areas: API finance module, web finance routes, auth role model, notification infrastructure, environment configuration, storage, BT import parser/classifier, Keez integration adapter.
- Affected data: finance documents, document files, document status audit, Keez/Gmail handoff attempts, finance settings, BT transactions, transaction imports, document-transaction links, minimal activities.
- Security impact: finance records and documents are sensitive; access must be restricted, uploads scanned/validated, and external credentials kept server-side only.
