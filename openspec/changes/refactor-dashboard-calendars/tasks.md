## 1. Proposal

- [x] Inspect the dashboard embeds, source IDs, session guards, PWA cache behavior, and current specifications.
- [x] Confirm API-key access to public Google sources with application access limited to signed-in members.
- [x] Specify the events agenda, vertical headquarters week, month view, and integration design.
- [x] Obtain approval for this proposal and its proposed product defaults before implementation.

## 2. Google Connection And Backend

- [x] Document Cloud project/API enablement, API-key restrictions, calendar sharing prerequisites, environment variables, rotation, and free-usage quota controls.
- [x] Add the configured Google Calendar adapter and authenticated events/headquarters endpoints with DTOs and Swagger documentation.
- [x] Validate date ranges and source-bound pagination cursors; reject arbitrary calendar IDs and URLs.
- [x] Normalize recurring instances, cancelled entries, all-day dates, multi-day spans, ongoing events, and Bucharest times.
- [x] Add bounded five-minute caching, request coalescing, throttling, bounded retries/timeouts, and explicitly marked stale fallback.
- [x] Keep secrets/raw upstream errors out of responses and logs; invalidate data on permanent source-access failures.
- [x] Add API tests for authentication on cache hits/misses, input validation, pagination, date boundaries, normalization, and provider failures.

## 3. Dashboard

- [x] Add authenticated server loading and continuation/navigation requests with private no-store responses.
- [x] Replace the events embed with the date-grouped upcoming agenda and progressive window/page loading without a fixed total-event cutoff.
- [x] Replace the headquarters embed with the default vertical week schedule and switchable month grid.
- [x] Add period navigation, today action, date selection, month overflow access, and all-day/multi-day presentation.
- [x] Add independent loading, empty, stale, retry, and configuration-error states with Romanian labels.
- [x] Make both widgets available on mobile; verify keyboard, focus, touch, and view/period announcements.
- [x] Preserve existing full-calendar links/routes and ensure session expiry/logout clears rendered calendar data and prevents offline cache reuse.

## 4. Verification And Rollout

- [x] Validate this change using `pnpm exec openspec validate refactor-dashboard-calendars --strict`.
- [x] Run relevant API and web checks/tests and the official Svelte component checks during implementation.
- [x] Verify pagination and later empty windows, recurrence exceptions, DST, all-day exclusive ends, multi-day overlaps, and month overflow.
- [x] Verify desktop/mobile week/month behavior, independent failures, and cold/warm-cache authentication.
- [x] Verify unauthenticated API requests, expired sessions, logout, protected HTML/data cache headers, and PWA/offline isolation.
- [x] Document deployment quotas, expected traffic, credential setup, and rollback in `docs/dashboard-calendars.md`.
- [ ] Perform a configured smoke check against both existing Google calendars after the owner supplies the API key. No key is configured in this workspace.

## Verification Results

- User approved implementation on October 23, 2026.
- Full `pnpm verify` passed: all 17 workspace tasks succeeded, including 437
  API tests and 39 web tests, formatting, lint, and TypeScript checks.
- API production build, TypeScript and lint checks passed. Calendar HTTP tests
  exercise the real controller/guard/service with synthetic auth and mocked
  Google calls, including cache authentication, pagination, retry limits,
  normalization, permission failures, and request budgets.
- All 39 web unit tests passed, including Bucharest DST/date boundaries and
  offline service-worker cache isolation. Svelte checks report no errors or
  warnings, and the official Svelte autofixer reports no issues.
- All 7 Chrome browser tests passed against a production web build and synthetic
  local API. Verified agenda continuation/retry and empty windows, vertical
  weeks, month overflow/navigation, mobile keyboard use, independent errors,
  stale results, session expiry, and logout with a real service worker offline.
- Desktop week/month and mobile month screenshots inspected.
- OpenSpec strict validation and whitespace checks passed.
- Live Google source access is not claimed: API-key provisioning and the live
  smoke check remain deployment prerequisites. No sharing settings were changed.
