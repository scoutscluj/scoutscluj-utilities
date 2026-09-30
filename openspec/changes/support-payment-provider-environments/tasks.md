## 1. Persistence and migration

- [x] 1.1 Add `activeEnvironment` to payment settings.
- [x] 1.2 Replace provider-wide active configuration uniqueness with provider/environment uniqueness.
- [x] 1.3 Reactivate the latest existing revision per provider/environment and backfill the selected environment.
- [x] 1.4 Extend migration verification coverage.

## 2. Backend behavior

- [x] 2.1 Return four provider/environment summaries without secrets.
- [x] 2.2 Select and validate an exact configured provider/environment pair.
- [x] 2.3 Rotate only the selected pair's prior active revision.
- [x] 2.4 Resolve checkout configuration by the selected pair while retaining revision-bound callback verification.
- [x] 2.5 Add regression tests for independent environment configuration and selection.

## 3. Administrator and member UI

- [x] 3.1 Render four clearly labelled active-payment choices.
- [x] 3.2 Update shared response types and active labels to include environment.
- [x] 3.3 Keep credential forms environment-specific and avoid implicit activation after save.

## 4. Verification

- [x] 4.1 Run API verification.
- [x] 4.2 Run web verification.
- [x] 4.3 Run every workspace package's verification suite.
