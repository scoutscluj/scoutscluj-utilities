# Dashboard Calendar Design

## Current State

`apps/web/src/routes/(app)/+page.svelte` embeds the events calendar in agenda
mode and the headquarters calendar in Google's default view. The headquarters
widget is hidden below 900px. `apps/web/src/lib/calendars.ts` contains both
source IDs in embed URLs; the full-calendar routes reuse those URLs.

The protected layout checks `locals.user`. NestJS endpoints separately use
`AuthGuard`; hiding the dashboard alone does not protect a new data endpoint.
The service worker respects `Cache-Control: no-store`, but may otherwise cache
HTML navigation responses. Calendar-bearing HTML and SvelteKit data responses
therefore also need explicit protection against offline/shared cache reuse.

## Access And Google Connection

Use one Google Cloud project with Calendar API enabled and an API key restricted
to that API. Apply an IP restriction only if hosting provides stable outbound
IPs; browser-referrer restrictions do not match a server-side integration.
No Google login, OAuth consent flow, or paid Workspace seat is needed for
reading public calendars with this API key.

Proposed API environment variables:

- `GOOGLE_CALENDAR_API_KEY`: deployment secret, never a public web variable.
- `GOOGLE_CALENDAR_EVENTS_ID`: existing events calendar ID.
- `GOOGLE_CALENDAR_HEADQUARTERS_ID`: existing headquarters calendar ID.

Keep both calendar IDs configured server-side and resolve them through fixed
source aliases. An API key is not a privacy boundary for the Google sources;
calendar owners must explicitly accept public readability of the displayed
details. Do not change Google sharing settings as part of implementation.
Test both sources using the API key alone before enabling the custom widgets.
Read access that returns only free/busy data is insufficient for this design.

## Backend Contract

Add session-protected endpoints under the existing `/api` prefix:

- `GET /api/calendars/events?from=...&to=...&cursor=...`
- `GET /api/calendars/headquarters?from=...&to=...&cursor=...`

`from` and `to` are RFC3339 instants with offsets and define an exclusive-end
range. Validate `from < to` and reject ranges longer than 93 calendar days.
Headquarters requests include any adjacent dates visible in the month grid.
Do not accept arbitrary calendar IDs or upstream URLs. Bind opaque continuation
cursors to their source and date range; reject mismatched or malformed cursors.

Return a minimal event DTO: instance identity, title, optional plain text
description/location, and either date-only all-day boundaries or timed start/end
instants. Include `range`, `nextCursor`, `fetchedAt`, and `stale` metadata. Private
Google entries with hidden details must not gain fabricated titles/details.
Do not forward raw Google payloads, attendee data, credentials, or provider error
messages. Use existing authentication for every request before consulting cache.

Use `events.list` with `singleEvents=true`, `orderBy=startTime`,
`showDeleted=false`, range bounds, and `timeZone=Europe/Bucharest`. Handle every
`nextPageToken` through bounded pages rather than treating the first response
or `maxResults` as the complete calendar. Keep recurrence instance identity
stable, deduplicate overlapping fetches, and exclude cancelled instances.

The events agenda rounds its initial lower bound down to a five-minute boundary
for shared cache reuse and captures that bound once per browsing session
and advances through bounded windows; continuation must not shift that bound
on every click. Remove ended entries as time advances. Headquarters fetches
events overlapping its visible range, including entries that began earlier.

## Cache, Failure Handling, And Cost

Use a bounded in-memory cache keyed by source, normalized range, and provider
page, with five-minute freshness and request coalescing. Fetch on demand; no
per-browser polling, scheduled synchronization, or new infrastructure is needed.
Limit request duration, page size, cache entries, concurrent upstream calls, and
per-session browsing rate to keep navigation from creating unbounded work.
Process restarts may clear the cache; multiple replicas have separate caches.

For transient Google failures, apply bounded backoff and respect rate limits.
Last successful cached results may be shown for up to 30 minutes from fetch with
a visible stale-data notice and retry action. Missing credentials, revoked access,
or other permanent configuration/permission failures fail closed for the affected
source and invalidate its cached data. Never substitute an empty success result
for an upstream failure or cache a partially retrieved range as complete.

API and web responses containing calendar data use `Cache-Control: private,
no-store`; do not persist events in browser storage or PWA runtime caches. The
API's internal shared cache remains behind authentication. Remove calendar data
from the rendered client state on logout/session expiry; handle `401` as session
expiry rather than falling back to cached data. Verify that service-worker and
offline navigation cannot reveal previously rendered calendars after logout.

Google currently documents standard API use at no additional cost and planned
charges above its daily threshold later in 2026. Use existing hosting, no paid
quota uplift, and a deployment quota cap below the applicable free threshold
where Google exposes that control. Document actual project quotas and monitor
aggregate requests, including other integrations/replicas; stop/degrade requests
at configured limits rather than opting into billable overage. Five-minute
caching reduces calls but is not itself a hard spending limit or a guarantee
about future Google pricing. Recheck pricing and quotas before rollout.

## Presentation

### Upcoming Events

Show a single chronological agenda grouped by Bucharest calendar date. Include
ongoing events and distinguish them from future entries. Provide progressive
loading without a fixed total-event cutoff; expose the loaded date range and
further-window action even if the current window contains no events. A failed
continuation keeps earlier results visible and retryable without duplicates.

### Headquarters Week

Default to the current Monday-through-Sunday week. Stack seven dated sections
vertically with bookings sorted within each day, an explicit empty-day message,
and a current-day marker. This is a schedule list, not seven side-by-side hourly
columns. Show overlapping bookings independently. Entries spanning multiple
days appear on every affected day, with a continuation indication.

### Headquarters Month

Provide a Monday-first month grid with weekday labels, current-day marker,
adjacent-month dates, and event summaries. A day with more entries than fit
offers an accessible way to inspect the full list without truncating bookings.
Selecting a date exposes its full agenda in an accessible panel or disclosure.
Previous/next and `Astăzi` move the active period; switching week/month preserves
the selected date. Returning to the current period uses Bucharest's current day.

### Shared Rules

Use Romanian labels and `Europe/Bucharest` time, including daylight saving
changes. Preserve all-day dates without converting them to UTC; Google's all-day
end date is exclusive. Timed multi-day events show their actual date span and
display within each overlapping headquarters day. Render external description
content as plain text, never trusted HTML. Keep both widgets available on narrow
screens; month dates and overflow controls must remain keyboard/touch usable.
Loading, empty, stale, and error states are independent between widgets. Keep
the existing full-calendar navigation links. Support visible keyboard focus,
accessible view-button state, and announcements when the active period changes.

## Rollout And Verification

First approve the proposal, then implement the backend adapter and fixtures,
then the dashboard views. Document source-sharing verification, key restrictions,
deployment secrets, quota configuration, and rollback. Rollback restores the
previous dashboard embeds and disables the new endpoints; full-calendar routes
already remain unchanged. No database changes or data migration are required.

Test authentication on cold and warm cache, cursor/range validation, multi-page
results, recurring exceptions, cancellations, boundaries, timezone/DST behavior,
all-day and multi-day bookings, stale responses and configuration failures. Use
mocked provider calls for automated tests. Browser verification covers agenda
continuation, week/month navigation, overflow, both responsive layouts, keyboard
access, session expiry/logout, and offline-cache isolation. A manually configured
live smoke check verifies both Google sources without committing credentials.
