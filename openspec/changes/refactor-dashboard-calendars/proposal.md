# Change: Replace Dashboard Calendar Embeds With Custom Views

## Why

The dashboard embeds two Google Calendars, which limits presentation and makes
the upcoming events and headquarters schedule difficult to scan. Members need
a chronological events agenda and headquarters views tailored to the app.

## What Changes

- Read the existing events and headquarters calendars through Google Calendar
  API v3 using a backend-only API key.
- Require a valid application session for the dashboard and both calendar API
  endpoints, including requests served from the backend cache.
- Replace the events iframe with a chronological agenda grouped by date, with
  progressive loading of all upcoming events rather than a fixed item cutoff.
- Replace the headquarters iframe with switchable `Săptămână` and `Lună` views.
  The default week view stacks Monday through Sunday vertically, with each
  day's events below its heading, like a schedule/agenda. The month view uses
  a Monday-first calendar grid with access to every day's events.
- Show both calendars on mobile and desktop, with Romanian labels, Bucharest
  dates/times, period navigation, and independent loading/error states.
- Cache Google responses in the existing API process; add no paid service or
  database migration. Continue managing calendar entries in Google Calendar.

## Confirmed Access Decision

On October 23, 2026, the user confirmed: `Keep the API key; restrict the
dashboard to signed-in members`.

An API key reads public Google Calendar data; it does not authorize access to
private calendars. The application dashboard and API remain authenticated,
but the source calendars' displayed event details must be publicly readable
at Google. This proposal does not make either calendar public automatically.
Calendar owners must verify this prerequisite before rollout. If either source
must become private, revise the integration to use authorized credentials.

## Proposed Product Defaults

- Events initially cover now through the next 90 calendar days; `Încarcă mai
  multe` completes provider pagination and then advances through subsequent
  90-day windows. Display the loaded date range and allow advancing even when
  a window is empty, so later events are not silently excluded. Never claim
  to have exhausted an infinitely recurring calendar.
- Include events currently in progress; exclude ended or cancelled entries.
- Headquarters opens on the current week. Provide previous/next period,
  `Astăzi`, and week/month switching that preserves the selected date.
- Show event title, date/time or `Toată ziua`, location when present, and plain
  text details in an accessible disclosure. Do not expose attendee lists.
- Existing full-calendar routes and links remain available; replacing the
  embeds on `/info/calendar` and `/sediu/orar` is outside this dashboard change.

## Impact

- New capability: `dashboard-calendars`; added `app-shell` requirement.
- API: calendar module, authenticated read endpoints, DTOs/OpenAPI contract,
  Google adapter, bounded cache, and request/error handling.
- Web: dashboard server loading, authenticated continuation requests, custom
  agenda/week/month components, and cache-control for protected responses.
- Configuration/docs: Google project and API key setup, two calendar IDs,
  quota/cost controls, deployment verification, and credential rotation.
- No calendar writes, personal Google connections, Redis, database persistence,
  webhooks, or paid calendar UI dependency.

## Approval Status

Approved by the user on October 23, 2026, with the instruction `implement`.
The API-key/public-source distinction is confirmed.

## References

- [Google API key access to public data](https://support.google.com/googleapi/answer/6158857?hl=en)
- [Calendar events listing and recurrence expansion](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)
- [Calendar API standard usage, quotas, and pricing](https://developers.google.com/workspace/calendar/api/guides/quota)
