# Tasks

## 1. Finance Access Foundation

- [x] Add `Responsabil financiar` role/capability to the API auth model.
- [x] Add role-aware route/menu entries for the finance module.
- [x] Add tests for finance role checks and non-finance denial.

## 2. Financial Document Inbox

- [x] Add storage and database model for financial documents.
- [x] Add document upload API with file validation and audit metadata.
- [x] Add document status transition API and audit history.
- [x] Add uploader document list.
- [x] Add finance inbox with status actions.
- [ ] Add finance inbox filters.
- [x] Add activity link field without implementing full activity management.

## 3. Notifications

- [ ] Add PWA manifest/service worker foundation if missing.
- [ ] Add Web Push/VAPID subscription model and APIs.
- [ ] Add notification preferences.
- [ ] Notify `Responsabil financiar` users for new uploads.
- [ ] Notify uploaders for status changes and clarification requests.
- [ ] Keep notification payloads generic and route-gated.

## 4. Keez Adapter

- [x] Add server-side Keez configuration status with staging/prod support.
- [ ] Implement token retrieval with client credentials.
- [ ] Implement confirmed invoice API operations needed for future extensibility.
- [x] Add generic document handoff abstraction with unsupported/manual fallback mode.
- [ ] Track Keez handoff attempts and errors.
- [x] Add global handoff mode setting.
- [ ] Add per-activity handoff mode settings.
- [ ] Add tests with mocked Keez responses.

## 5. BT Import And Transactions

- [ ] Add parser/import pipeline for BT CSV, MT940, and ZIP archives.
- [ ] Add import preview before writes.
- [ ] Add deterministic transaction fingerprints and duplicate detection.
- [ ] Add transaction import audit records.
- [ ] Add transaction classification metadata and review status.
- [ ] Add tests for legacy duplicate-risk cases and parser edge cases.

## 6. Reconciliation And Missing Documents

- [ ] Add manual document-to-transaction links.
- [ ] Add `Document lipsă` state on transactions.
- [ ] Add filters for missing-document and linked-document state.
- [ ] Add audit history for link/unlink and missing-document changes.

## 7. Statistics

- [ ] Add finance statistics backend query/service.
- [ ] Add dashboard cards for operational income, expenses, net flow, needs-review, and missing-document totals.
- [ ] Add purpose/channel/monthly summaries.
- [ ] Separate internal transfers and non-operational rows from headline operational totals.

## 8. Documentation And Validation

- [ ] Document Keez capabilities and open questions.
- [x] Document required environment variables.
- [ ] Validate OpenSpec change if the CLI becomes available in the repo.
- [x] Run focused API/web checks after implementation slices.
