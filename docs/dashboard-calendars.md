# Dashboard calendars

The signed-in dashboard reads two public Google Calendar sources through the
existing NestJS API. Google Calendar remains the editing interface. The API key
is stored only on the API server. Reading these sources does not require members
to connect a Google account.

## Connect Google Calendar

1. Select an organization-owned Google Cloud project (the existing Google API
   project can be reused), then enable **Google Calendar API** in APIs & Services.
2. Create an API key in APIs & Services → Credentials. Restrict it to **Google
   Calendar API**. If deployment has a stable outbound IP, also restrict it to
   that address. Browser website/referrer restrictions will not work for these
   server-to-server requests. Do not grant broad Cloud IAM roles.
3. For each source, have the calendar owner verify Settings and sharing → Access
   permissions for events → **Make available to public / See all event details**.
   Workspace policies may prevent public sharing. The application does not
   change these settings. Public sources can be read outside this application;
   requiring sign-in protects the application UI/API, not the Google source.
4. Copy each Calendar ID from Settings and sharing → Integrate calendar. The IDs
   below match the existing embeds. Do not use an embed URL or an iCal URL.
5. Set the following variables on the **API deployment**, not the web deployment:

   ```dotenv
   GOOGLE_CALENDAR_API_KEY=<restricted-api-key>
   GOOGLE_CALENDAR_EVENTS_ID=c_f3605cf4dbf3bbabf28c1ffbd50611905c9b3da5941c5556ace54a0ab3d456be@group.calendar.google.com
   GOOGLE_CALENDAR_HEADQUARTERS_ID=c_456e2c5db77124a1f42e417621e5fb1f70aec044fff06ae072c4ed54fe53675e@group.calendar.google.com
   GOOGLE_CALENDAR_DAILY_REQUEST_LIMIT=2000
   ```

6. Restart/redeploy the API and web through the normal deployment process. With
   a valid app session, open the dashboard and check both source calendars.
   Inspect `/calendar-data/events?...` or the authenticated NestJS
   `/api/calendars/events?...` response to confirm a `200`, actual event titles,
   and `Cache-Control: private, no-store`. Repeat for `headquarters`. Requests
   without a session must return `401` and no data. Verify an expected all-day
   event, recurring entry and headquarters booking against Google Calendar.
   Do not paste API keys, cookies, or raw provider responses into issue reports.

No OAuth client, consent screen, service account, Google login callback, database
migration, or separate cache service is required for this public-source setup.
If sources must become private, use a separately reviewed authorized integration;
an API key cannot provide that access.

## Behavior

- Events start with a 90-day window and expand through provider pages and later
  date windows using `Încarcă mai multe`, including after an empty window.
  The initial lower bound is rounded down to a five-minute boundary so members
  share cached requests; ended entries are filtered out of the agenda.
- Headquarters defaults to a vertical Monday–Sunday agenda. `Lună` opens a
  Monday-first grid; selecting any date shows its full loaded agenda below.
  If Google returns multiple pages, use `Încarcă restul rezervărilor` to retrieve
  remaining bookings. Partial-result days are labelled accordingly.
- Both widgets are available on mobile. Display dates and times use Romanian
  formatting and `Europe/Bucharest`; all-day end dates are exclusive.
- The full-calendar routes retain their existing embeds.

## Quotas and costs

Google's current documentation offers standard usage without an additional fee
and describes planned charges above the standard daily threshold. Recheck the
project's actual limits and current pricing before deployment. Do not enable a
paid quota uplift for this integration. If adjustable, set a Cloud API request
quota below the free threshold and account for any other project consumers.

The API's default budget is 2,000 upstream requests per UTC day **per running
process**, configurable from 1 to 10,000. Retries count toward that limit. The
counter is in memory: restart resets it, replicas each have their own budget,
and it does not track Gmail or other Google integrations. It is a load guard,
not an account-wide billing cap. For hard aggregate protection, use the Google
project's quota controls where available; budget alerts alone do not stop bills.

Responses are cached for five minutes in a bounded process-local cache and
matching in-flight requests are coalesced. With continuous dashboard use and
one provider page per source/period, roughly 576 upstream requests per day per
process cover two five-minute source refreshes; additional period navigation,
pages, retries, and replicas increase that figure. There is no background polling.
At most four distinct upstream reads run concurrently. Each signed-in member
can make 60 calendar requests per minute, even if a result is already cached.
Each request covers at most 93 days and one provider page of up to 250 events.
Transient failures have at most one retry with bounded backoff; each fetch times
out after five seconds. A `Retry-After` longer than two seconds is not retried
inside the request. Recent cached pages may be shown with a stale warning for
up to 30 minutes, while permanent permission failures invalidate source cache.

## Troubleshooting and key rotation

- Both widgets unavailable: check API environment variables and API enablement.
- One source unavailable: verify its ID and public event-detail sharing. Free/busy
  access is insufficient. Private events may show only `Ocupat` as Google permits.
- Requests limited/unavailable: inspect project usage/quotas and the daily
  process budget. Allow the per-minute window to elapse; do not increase paid
  quotas as an automatic recovery action.
- Stale notice: old data remains visible during a temporary provider outage;
  use the retry action. Configuration/access errors fail closed.
- To rotate a key, create a newly restricted key, update the API deployment
  secret, restart, verify both sources, then revoke the old key. Continuation
  cursors signed with the old key become invalid; reload the dashboard.
- Logs and application errors omit the key and raw Google error payloads.

## Verification and rollback

Automated tests use mocked Google calls and a separate synthetic local API:

```sh
pnpm --filter api exec jest modules/calendars --runInBand
pnpm --filter web exec vitest run src/lib/dashboard-calendars/calendar.spec.ts src/service-worker.spec.ts
pnpm --filter web build
PLAYWRIGHT_CHANNEL=chrome pnpm --filter web exec playwright test --config playwright.calendars.config.ts
```

Browser tests use loopback ports 3016 and 5183 and do not connect to Google.
Perform the configured live-source smoke check separately after supplying
deployment credentials. The implementation does not provision Cloud projects,
change calendar sharing, or deploy credentials on the owner's behalf.

To roll back, restore the prior dashboard page with its two iframe embeds,
remove the `CalendarsModule` registration, and remove/revoke the API key if no
other consumer uses it. No database rollback is required. Keep the no-store
protection for authenticated calendar responses.

Sources: [credentials](https://support.google.com/googleapi/answer/6158857?hl=en),
[events API](https://developers.google.com/workspace/calendar/api/v3/reference/events/list),
[quotas and pricing](https://developers.google.com/workspace/calendar/api/guides/quota).

Calendar descriptions preserve basic HTML formatting (paragraphs, lists, emphasis, and links). The API sanitizes descriptions with an allowlist before returning them; the dashboard renders only that sanitized HTML. Scripts, embeds, images, inline styles, event handlers, and unsafe link protocols are removed. Links open in a new tab with `noopener noreferrer`.
