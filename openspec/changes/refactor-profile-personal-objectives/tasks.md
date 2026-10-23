## 1. Proposal

- [x] Inspect the current profile, notification lifecycle, authentication boundary, and existing specifications.
- [x] Define the profile layout, notification route, objective dialog, persistence, and acceptance scenarios.
- [x] Obtain approval for the proposal and proposed product decisions.

## 2. Backend

- [x] Add the owner-scoped personal-objective entity and reversible database migration.
- [x] Add authenticated list/create endpoints with trimmed text limits and strict calendar-date validation.
- [x] Test authentication, ownership isolation, persistence, ordering, and rejected input.

## 3. Frontend

- [x] Move current notification controls to `/profile/notifications` and register the route title.
- [x] Place notification settings and logout in the identity header, with crossed-bell and green-check states.
- [x] Add authenticated objective loading/creation and the responsive objectives list.
- [x] Add the accessible creation dialog with validation, pending, success, and failure behavior.
- [x] Verify notification status refresh when returning to the profile header.

## 4. Validation

- [x] Validate the OpenSpec change with `pnpm exec openspec validate refactor-profile-personal-objectives --strict`.
- [x] Run relevant API tests and web type, lint, and UI checks.
- [x] Verify creation, cancellation, validation errors, save failures, reload persistence, and isolation between users.
- [x] Verify notification controls, denied/unsupported browser states, and profile navigation.
- [x] Check mobile layout and dialog keyboard/focus behavior.

## Verification Results

- API: 16 HTTP tests passed for authentication, session ownership, isolation,
  text limits, ordering, leap dates, and invalid deadlines.
- Database: `pnpm --filter api exec tsx test/personal-objectives-postgres.smoke.ts`
  passed against a uniquely named local disposable database, then removed it.
  Verified migration up/down, real persistence, date-only values, foreign-key
  enforcement, and owner-deletion cascade.
- Browser: all 8 tests passed with
  `PLAYWRIGHT_CHANNEL=chrome pnpm --filter web exec playwright test --config playwright.profile.config.ts`.
  Notification browser APIs and delivery use synthetic local fixtures.
- Desktop/mobile screenshots inspected, including the creation dialog.
- API and web type checks, production builds, and ESLint/Prettier checks for all
  changed code passed. Official Svelte autofixer reported no issues.
- OpenSpec strict validation and `git diff --check` passed.

Apply `Migration20261023000100` with the normal API migration process before
running this feature against an existing environment.

## Profile Header Refinement

- [x] Combine roles and Orgo details in one full-width information card.
- [x] Move notification settings and logout to the right of the identity header.
- [x] Show a crossed bell when notifications are not ready and a green check when ready on this device.
- [x] Format the Orgo login timestamp as a readable Romanian date and time.
- [x] Verify header placement, notification states, and desktop/mobile layouts. All 8 profile browser tests passed; desktop/mobile screenshots inspected; Svelte checks, lint, formatting, and production build passed.

## Personal Profile Details Refinement

- [x] Return an allowlisted personal-profile view from the current-user API.
- [x] Normalize Orgo calendar dates and prefer the stored profile photo.
- [x] Split personal and connection information into responsive cards.
- [x] Add labeled role colors, membership status, and fee-validity treatment.
- [x] Add photo error handling with an initials fallback.
- [x] Test personal-field serialization, invalid dates, and exclusion of private fields.
- [x] Verify browser data display, photo fallback, and responsive screenshots at 375, 768, 1024, and 1440 px. All 8 profile browser tests and 8 user-service tests passed; type checks, lint, formatting, API/web builds, and Svelte autofixer passed.

## Compact Profile Cards

- [x] Make desktop information cards equal in width and height.
- [x] Reduce headings, padding, gaps, and metadata spacing.
- [x] Move fee validity into the details grid and keep roles in a compact inline row.
- [x] Keep the objectives section unchanged, as requested.
- [x] Verify equal dimensions, compact height, and responsive layouts. All 8 profile browser tests passed; desktop/mobile screenshots inspected; Svelte checks, lint, formatting, and production build passed.
