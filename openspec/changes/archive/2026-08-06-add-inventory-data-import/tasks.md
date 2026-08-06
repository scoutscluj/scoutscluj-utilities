# Tasks

## 1. Import Utility

- [x] Validate and map the Firestore inventory JSON export.
- [x] Download supported Firebase Storage images to a local cache.
- [x] Import items and image `bytea` records in one PostgreSQL transaction.
- [x] Refuse implicit append into a non-empty inventory and write an ID mapping report.
- [x] Generate a self-contained transactional SQL file for offline production import.

## 2. Validation

- [x] Add focused parser, download, URL safety, and CLI tests.
- [x] Run OpenSpec validation, API typecheck, lint, formatting, and focused tests.
- [ ] Run download-only validation against the supplied export (blocked locally by DNS resolution for Firebase Storage).
