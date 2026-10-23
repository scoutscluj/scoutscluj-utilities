## ADDED Requirements

### Requirement: Authenticated Calendar API Access

The system SHALL retrieve the configured events and headquarters sources through Google Calendar API using a backend-only API key, and SHALL require a valid local session for every application calendar-data request. Calendar owners SHALL verify that displayed source details are publicly readable at Google before rollout.

#### Scenario: Signed-in member requests a configured source

- **GIVEN** the API key and source calendar IDs are configured
- **AND** the source's displayed event details are publicly readable at Google
- **WHEN** a member with a valid local session requests that calendar
- **THEN** the API returns only normalized display data for the configured source
- **AND** no Google login or personal Google connection is required.

#### Scenario: Unauthenticated request encounters a warm cache

- **GIVEN** calendar results are already cached by the API
- **WHEN** a request without a valid local session calls either calendar endpoint
- **THEN** the API returns `401` without calendar data or an upstream fetch.

#### Scenario: Calendar is private or credentials are invalid

- **WHEN** a configured source cannot be read using the API key
- **THEN** the affected widget shows a safe configuration/unavailable state
- **AND** the system does not change source sharing or treat the failure as an empty calendar
- **AND** permanent access failures invalidate that source's cached data.

### Requirement: Bounded Complete Calendar Retrieval

The API SHALL retrieve date-bounded event instances with chronological ordering, provider pagination, stable recurrence identity, and source-bound continuation. Requests SHALL use configured sources, validated ranges of at most 93 calendar days, and bounded upstream work rather than arbitrary URLs or calendar IDs.

#### Scenario: Google returns multiple pages

- **WHEN** a requested range contains more events than one provider page
- **THEN** subsequent pages remain accessible through continuation
- **AND** the response indicates that additional results exist
- **AND** the UI does not silently present the first page as the complete range.

#### Scenario: Recurring event has an exception and a cancellation

- **WHEN** the requested range includes recurring instances
- **THEN** the system displays the instances at their effective scheduled times
- **AND** excludes cancelled instances and duplicate occurrences.

#### Scenario: Request has an invalid range or continuation

- **WHEN** a caller supplies an invalid or excessive range, arbitrary source, or mismatched cursor
- **THEN** the API rejects the request without fetching an unapproved source.

### Requirement: Upcoming Events Agenda

The dashboard SHALL list ongoing and upcoming events chronologically, grouped by date, with no fixed total-event cutoff. It SHALL initially load a 90-day window and allow members to complete its pages and advance through later windows.

#### Scenario: Member views the events agenda

- **WHEN** the agenda loads
- **THEN** it includes events still in progress and future events in the loaded range
- **AND** shows titles, dates/times or all-day labels, and optional location/details
- **AND** excludes events that have ended.

#### Scenario: Later events exist beyond an empty loaded window

- **GIVEN** the current window contains no events or has no remaining provider pages
- **WHEN** the member advances the agenda
- **THEN** the next date window can be loaded even if the previous window was empty
- **AND** the visible loaded range expands without duplicates
- **AND** empty-range text does not claim there are no future events outside that range.

#### Scenario: Continuation fails

- **WHEN** loading another agenda page or date window fails
- **THEN** earlier loaded events remain visible
- **AND** a retry action resumes the failed continuation without skipping events.

### Requirement: Vertical Headquarters Week Schedule

The dashboard SHALL default the headquarters calendar to a Monday-through-Sunday week displayed as seven vertically stacked day sections with chronological bookings, rather than side-by-side hourly columns.

#### Scenario: Current week is displayed

- **WHEN** a member opens the headquarters widget
- **THEN** all seven days appear in date order with a current-day marker
- **AND** each day shows its bookings or an explicit empty-day state.

#### Scenario: Bookings overlap or span days

- **WHEN** bookings overlap in time or cross day boundaries
- **THEN** every booking remains inspectable on each day it overlaps
- **AND** spanning entries indicate continuation and their date/time span.

### Requirement: Headquarters Month View And Navigation

The dashboard SHALL provide a switchable Monday-first month grid, previous/next period navigation, and an `Astăzi` action. Switching week/month SHALL preserve the selected date, and every booking on a date SHALL remain accessible.

#### Scenario: Member switches views and navigates

- **WHEN** the member selects a date and switches week/month views
- **THEN** the selected date remains inside the displayed period
- **AND** previous/next advances by the active view's period
- **AND** `Astăzi` returns to the period containing today's Bucharest date.

#### Scenario: Month cell has more bookings than fit

- **GIVEN** a month cell has an overflowing list of bookings
- **WHEN** the member activates that date or its overflow control
- **THEN** an accessible full agenda for the date is available
- **AND** bookings are not silently dropped.

### Requirement: Calendar Date And Content Semantics

The system SHALL use Romanian labels and `Europe/Bucharest` display dates/times, preserve date-only all-day values and exclusive end dates, and render external descriptions as sanitized HTML with paragraphs, lists, emphasis, and safe links without attendee lists or raw provider payloads.

#### Scenario: All-day event ends on the following date

- **GIVEN** an all-day event starts on October 23 and has exclusive end October 24
- **WHEN** it is displayed in either calendar
- **THEN** it appears on October 23 only with an all-day label.

#### Scenario: Timed event crosses daylight saving or midnight

- **WHEN** an event crosses a Bucharest clock change or local day boundary
- **THEN** displayed times use the correct Bucharest offsets
- **AND** headquarters entries appear on exactly the local dates they overlap.

#### Scenario: Description contains markup

- **WHEN** a provider description includes HTML or executable content
- **THEN** the API removes scripts, embedded content, event handlers, inline styles, and unsafe link protocols; the interface preserves allowed formatting and safe links and executes no provider content.

### Requirement: Bounded Cache And Resilient Calendar Widgets

The API SHALL use bounded on-demand caching with five-minute freshness, coalesce matching requests, bound retries and upstream work, and require no additional paid infrastructure. Widgets SHALL independently distinguish loading, empty, stale, and failed states without exposing credentials or raw provider errors.

#### Scenario: Multiple members request the same fresh range

- **WHEN** valid sessions request a matching cached range within five minutes
- **THEN** the API reuses its internal cache instead of fetching for every member
- **AND** each request still passes authentication.

#### Scenario: Transient provider failure has a recent cached result

- **GIVEN** the last successful cached result is no more than 30 minutes old
- **WHEN** a transient provider error prevents refresh
- **THEN** the widget may display that result with its age and a stale warning
- **AND** offers a retry action without blocking the other widget.

#### Scenario: Failure has no eligible cached result

- **WHEN** a source fails with no eligible fallback, or the configured request limit is reached
- **THEN** the widget displays an unavailable/retry state
- **AND** does not represent missing results as a successful empty response
- **AND** the API does not opt into paid quota increases or unbounded retries.

### Requirement: Calendar Session And Browser Cache Isolation

The application SHALL mark calendar-bearing API, HTML, and SvelteKit data responses private and no-store, SHALL keep calendar results out of persistent browser/PWA caches, and SHALL clear rendered calendar state on logout or session expiry. The backend's internal cache SHALL remain behind session validation.

#### Scenario: Member logs out and opens the dashboard offline

- **GIVEN** a member previously viewed calendar data and then logged out
- **WHEN** the dashboard is reopened through back navigation or offline navigation
- **THEN** cached calendar content is not revealed to the signed-out visitor.

#### Scenario: Session expires during navigation

- **WHEN** a calendar continuation or period-navigation request returns `401`
- **THEN** the UI removes calendar data and invokes the existing login flow
- **AND** does not substitute stale calendar data for authentication failure.
