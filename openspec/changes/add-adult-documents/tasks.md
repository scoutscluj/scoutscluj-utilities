## 1. Proposal

- [x] Confirm eligibility, annual scope, authorization, retention and review flow.
- [x] Inspect current profile, membership, audit and identity conventions.
- [x] Verify official certificate-obtainment guidance.
- [x] Validate this change with OpenSpec (`validate add-adult-documents --strict`).
- [x] Obtain approval for the assembled proposal; incorporate the subsequent CIC-only clarification.

## 2. API And Persistence

- [x] Add versioned private adult-document persistence and a migration.
- [x] Implement age/year eligibility and explicit central-admin authorization.
- [x] Implement owner/admin dossiers, admin listing, upload, protected download,
      validation and rejection with required reason.
- [x] Check file signatures, size, year and type; preserve original files.
- [x] Audit important writes and administrator reads without private contents.
- [x] Test authorization, version replacement, review, history, file validation
      and concurrent upload/review behaviour.

## 3. Web

- [x] Add profile dossier summary and shared accessible responsive dialog.
- [x] Add year selection, upload, history, status and rejection feedback.
- [x] Add the user's Romanian CIC instructions and official/alternative links.
- [x] Add central-admin-only `Documente adulți` navigation and review page.
- [x] Enforce protected no-store download handling.
- [x] Use local membership data exclusively in the fee banner with neutral
      unavailable-data behaviour.

## 4. Validation

- [x] Run API and web typechecks, builds, changed-file lint/format and relevant tests.
- [x] Cover owner/admin flows and Orgo/local-fee conflicts in regression tests.
- [x] Verify desktop/mobile dialog layout and keyboard interactions.
- [x] Document setup, completed validation and any limitations in `docs/adult-documents.md`.
