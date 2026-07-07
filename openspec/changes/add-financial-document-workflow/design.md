# Design: Financial Document Workflow And BT Reconciliation

## Context

The new app is a SvelteKit/NestJS/Postgres rewrite with Orgo SSO already established. The current menu has a disabled finance section. The legacy app stores finance records in Firestore and contains exploratory work for MT940/CSV parsing, category rules, purpose/channel classification, and web push notifications.

Orgo should remain the base system where it owns the concept. Members are sourced from Orgo, with local enrichment only for operational workflows. Orgo exposes event APIs, user list/admin update APIs, unit APIs, tenant-scoped `Api-Token`/JWT authentication for regular API endpoints, OAuth identity endpoints, and webhooks for user and event-attendance changes. The current Scouts Cluj Utilities auth flow is SSO success-token verification and does not provide an Orgo API bearer token, so local `Activitate` records should reference or create Orgo events only after the Orgo API auth mode is confirmed. Finance details, reports, and future meal-planning data remain local extensions.

Export discovery from the legacy app:

- 2,049 Firestore documents total.
- 1,754 `financialTransactions` rows.
- 7 `transactionCategories`.
- Rows cover 2024-01-01 through 2026-05-13.
- 1,324 credits and 430 debits.
- Legacy categories include `Activitati/Campuri`, `Cotizatie`, `Scout Shop`, `Uncategorized`, `Pachet IZI`, `Sponsorizari`, `Sediu`, and `Formare`.
- Category sources are mostly rule/legacy/none, with only one manual category marker.
- 357 rows still need review.
- Old analysis found that `date + amount + type` duplicate detection collapses real repeated payments, so v1 must not use that identity model.

Keez public API discovery:

- API base URL is environment-specific: staging and production public-api endpoints.
- Authentication uses OAuth 2.0 client credentials.
- Public docs cover items/articles and customer invoice operations.
- Invoice operations include create, read, update, delete, validate, e-Factura submit, cancel, email delivery, and PDF download.
- Public docs do not show a generic endpoint for uploading arbitrary accounting documents such as supplier invoices, fiscal receipts, POS receipts, or payment proofs.

## Goals

- Make finance document upload effortless for normal users.
- Give `Responsabil financiar` a complete review and follow-up workflow.
- Support Keez handoff without assuming undocumented API capabilities.
- Notify finance users and uploaders through PWA/Web Push events.
- Import BT transactions safely and make statistics trustworthy.
- Track missing documents by linking documents to BT transactions.
- Keep this feature finance-first while leaving hooks for activity, Stripe, and member-management extensions.

## Non-Goals

- Rebuild all event management.
- Build a member database, event management, or Orgo writeback.
- Implement Stripe.
- Build OCR.
- Build automatic reconciliation.
- Replace Keez accounting workflows.

## Roles And Access

Add `Responsabil financiar` as a distinct finance capability/role. It is not equivalent to generic `admin`.

Access rules:

- Uploader can create documents and view their own documents/status/comments.
- `Coordonator` can view documents linked to their `Activitate`.
- `Responsabil financiar` can view and manage all finance documents, transactions, settings, Keez attempts, reports, and statistics.
- `super_admin` can assign finance access.
- API authorization remains authoritative; web route guards only improve UX.

## Document Workflow

Normal upload requires only:

- file,
- optional `Activitate`,
- optional notes.

The system records:

- uploader,
- uploaded timestamp,
- original filename,
- content type,
- storage location,
- checksum,
- audit metadata.

Document statuses:

- `Încărcat`
- `În verificare`
- `Gata de trimis`
- `Trimis`
- `Necesită clarificări`
- `Respins`
- `Arhivat`

Every status transition creates an audit entry with actor, timestamp, previous status, new status, and optional comment.

## Keez Handoff

The app owns local workflow state. Keez submission state is tracked separately as attempts.

Handoff modes:

- Global default: review-first or direct-to-Keez.
- Per-activity override: inherit, force review-first, or direct-to-Keez.

In review-first mode:

1. User uploads document.
2. `Responsabil financiar` reviews and enriches metadata if needed.
3. Document becomes `Gata de trimis`.
4. Finance user triggers Keez/manual handoff.

In direct mode:

1. User uploads document.
2. System attempts supported Keez handoff immediately.
3. Success marks document `Trimis`.
4. Failure marks attempt failed and leaves document visible to finance review.

Adapter behavior:

- Use server-side Keez credentials only.
- Store external IDs and raw safe response metadata.
- Map Keez errors into retryable, unauthorized, validation, unsupported, and unknown categories.
- If generic document upload is unsupported, use Gmail email handoff where configured and track status locally.
- Send from `cluj.napoca@scout.ro` to `cui@keez.ro`.
- Send one email per `Document financiar`.
- Use regular-user copy that says `contabilitate`; expose Keez/Gmail technical details only to finance users and audit records.
- Use the official organization name in the email body: `ASOCIAŢIA ORGANIZAŢIA NAŢIONALĂ CERCETAŞII ROMÂNIEI FILIALA CLUJ`.
- Use short subjects: `Document financiar Resurse Scouts Cluj - #000123`.
- Rename attachments to `document-financiar-000123.ext` while preserving the original filename locally.
- Treat `Trimis` as Gmail accepting the message, not Keez processing the document.
- Add a distinct `send_failed` state for failed outbound handoff.
- Allow explicit audited retry/resend.
- Detect exact duplicate files by checksum and avoid automatic duplicate sending in direct mode.
- Keep inbound Keez/Gmail reply or bounce processing out of v1.

## Keez Questions

Ask Keez:

1. Whether arbitrary document upload exists for supplier invoices, fiscal receipts, POS receipts, payment proofs, and bank documents.
2. What endpoint, file format, metadata, size limits, and MIME types are supported.
3. Whether uploaded documents can be linked to Keez bank transactions/reconciliation.
4. Whether document processing status and accountant comments are queryable.
5. Whether webhooks exist for document processing and review events.
6. Whether document upload works in staging with current credentials.
7. Whether purchase invoices/expense documents have separate APIs from customer invoice APIs.
8. Whether uploaded documents support caller-supplied external IDs/idempotency keys.
9. Whether an email-ingestion fallback exists and can be automated. Keez confirmed documents sent to `cui@keez.ro` from the Keez account email are loaded automatically under Contabilitate -> Documente.

## Notifications

The new app should implement Web Push/VAPID in the SvelteKit/NestJS/Postgres stack.

Notification events:

- New document upload: notify active `Responsabil financiar` users.
- New upload linked to an activity by someone other than the `Coordonator`: optionally notify the `Coordonator`.
- Clarification request: notify uploader.
- Status change: notify uploader.
- Keez handoff failure: notify `Responsabil financiar`.
- Missing document follow-up: notify responsible finance users, later activity coordinators if applicable.

Notification payloads must avoid sensitive financial content. The body should be generic and link to the protected route.

## BT Transaction Import

Use a server-side import pipeline:

1. Upload direct MT940, CSV, or ZIP archives.
2. Discover statement files by content where possible.
3. Parse statements into normalized transaction candidates and notices.
4. Show preview with file counts, parsed transactions, duplicates, warnings, and notices.
5. Commit only after confirmation.
6. Store import audit records.

Transaction identity must use deterministic fingerprints from account, date, direction, amount, bank reference, statement metadata, and normalized raw details. It must not rely only on date, amount, and type.

Transaction metadata:

- account,
- dates,
- amount,
- direction,
- currency,
- bank reference,
- source import,
- raw source fields,
- channel,
- purpose tags,
- category,
- category source,
- review status,
- notes.

Manual category decisions are protected from rule reclassification.

## Reconciliation

V1 includes manual linking:

- one document can support one or more BT transactions,
- one BT transaction can have one or more documents,
- finance users can mark a transaction as `Document lipsă`,
- linking sufficient documentation clears missing-document state,
- all changes are audited.

Automatic matching can be introduced later using amount/date/supplier/reference heuristics after manual workflow stabilizes.

## Statistics

Statistics use normalized transaction metadata and clearly separate confidence levels.

V1 dashboard should show:

- operational income,
- operational expenses,
- net flow,
- internal transfers separated,
- bank fees separated,
- needs-review totals,
- missing-document totals,
- income/expense by purpose,
- payment channel breakdown,
- monthly net flow,
- activity-linked summaries where activity links exist.

Reports must not present inferred data as final without review state.

## Minimal Activity Hook

This PRD does not build full activity management.

It only requires:

- a minimal activity record/reference,
- finance documents can link to an activity,
- transactions can link to an activity manually,
- per-activity Keez handoff override can be stored.

Full activity creation workflows, participant management, fees, Stripe payments, budget reports, and meal planning are later work.

## Security And Privacy

- Store uploaded documents outside the public web root.
- Validate file type and size.
- Use authorization checks on every file download.
- Keep Keez credentials server-side and rotate the credentials shared in chat before production.
- Avoid logging sensitive document content, tokens, or secrets.
- Keep notification payloads generic.
- Audit finance status changes and external handoff attempts.

## Rollout

Recommended vertical slices:

1. Finance role and menu entry.
2. Document upload and personal document list.
3. Finance inbox/status workflow.
4. Notifications for finance workflow.
5. Keez adapter with manual fallback and credential config.
6. BT import preview and transaction storage.
7. Manual document-to-transaction linking and missing-document state.
8. Finance statistics.

## Rollback

Rollback should disable new finance routes and external handoff attempts without deleting uploaded files or finance audit records. Database migrations should avoid destructive rollback of production finance data.
