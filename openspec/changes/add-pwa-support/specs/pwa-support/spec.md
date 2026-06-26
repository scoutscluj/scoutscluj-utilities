## ADDED Requirements

### Requirement: Web App Manifest And Install Metadata

The web app MUST expose standards-compliant install metadata so supported mobile
and desktop browsers can install `ScoutsCluj` as a standalone app.

#### Scenario: Manifest is discoverable from the app

- **GIVEN** a user loads any SvelteKit route
- **THEN** the document head includes a manifest link for `/manifest.webmanifest`
- **AND** the document head includes ScoutsCluj favicon, Apple touch icon, and
  theme-color metadata
- **AND** requesting `/manifest.webmanifest` returns valid JSON with `name`,
  `short_name`, `description`, `start_url`, `scope`, `display`, `background_color`,
  `theme_color`, `lang`, and an icon array containing 192px, 512px, and maskable
  icons.

#### Scenario: Browser install uses localized product metadata

- **WHEN** a supported browser determines the app is installable
- **THEN** the install surface uses Romanian ScoutsCluj metadata from the
  manifest
- **AND** the installed app launches in standalone display mode at `/`.

### Requirement: Offline-Aware Service Worker

The web app MUST register a production service worker that improves repeat
loads and provides graceful offline fallback without caching sensitive
application data by default.

#### Scenario: Service worker precaches the shell

- **GIVEN** the app is running in a production browser environment
- **WHEN** the user loads the app for the first time
- **THEN** the client registers `/service-worker.js`
- **AND** the service worker precaches the app shell entry points, `/offline`,
  `/manifest.webmanifest`, favicon, and PWA icons
- **AND** old app-owned caches are removed during activation.

#### Scenario: Previously visited navigation remains readable offline

- **GIVEN** a user has successfully loaded a protected route while online
- **WHEN** the device goes offline and the user reloads that same route
- **THEN** the service worker serves a cached navigation response when available
- **AND** the UI shows a Romanian offline warning explaining that data-changing
  operations require internet connectivity.

#### Scenario: Uncached navigation falls back gracefully

- **GIVEN** the browser is offline
- **WHEN** the user navigates to a route that has no cached navigation response
- **THEN** the service worker returns the localized `/offline` page
- **AND** the page does not attempt authenticated API calls during render.

#### Scenario: Unsafe requests are not cached

- **WHEN** the service worker observes a request that is not a safe cache target
- **THEN** it does not cache non-GET requests, authentication routes, logout
  routes, uploads, responses marked `Cache-Control: no-store`, or API responses
  unless a later approved feature explicitly allowlists them.

### Requirement: Install And Connectivity UX

The client MUST communicate install availability, standalone state, and network
connectivity using unobtrusive Romanian UI.

#### Scenario: Native install prompt is available

- **WHEN** the browser emits `beforeinstallprompt`
- **THEN** the client stores the prompt event and displays an install CTA with
  Romanian copy
- **AND** choosing the CTA calls the saved event's `prompt()` method
- **AND** accepting or dismissing the prompt clears the active install CTA.

#### Scenario: Manual install is required

- **GIVEN** the browser does not expose `beforeinstallprompt` but supports manual
  home-screen installation
- **WHEN** the user is not already in standalone mode
- **THEN** the UI can display concise manual install instructions appropriate to
  the platform.

#### Scenario: Offline state is visible

- **WHEN** the browser fires the `offline` event or `navigator.onLine` is false
  during hydration
- **THEN** the UI displays a persistent offline warning
- **AND** the warning clears when the browser fires the `online` event.

#### Scenario: App shell shows PWA status

- **WHEN** the authenticated app shell renders
- **THEN** it includes a compact status chip that distinguishes online,
  offline, and standalone installed states
- **AND** the chip remains usable without crowding the mobile header.

### Requirement: Controlled PWA Update Flow

The client MUST detect new deployed builds and let the user activate a waiting
service worker without silently reloading active work.

#### Scenario: Waiting service worker triggers update prompt

- **GIVEN** a new deployment registers a service worker while an existing tab is
  controlled by an older worker
- **WHEN** the registration has a worker in the `waiting` state
- **THEN** the client displays a persistent update prompt within two seconds
- **AND** the prompt includes safe build metadata such as app version and commit
  hash when available.

#### Scenario: User accepts update

- **WHEN** the user chooses the update action
- **THEN** the client posts `{ type: "SKIP_WAITING" }` to the waiting worker
- **AND** the page reloads only after the `controllerchange` event fires
- **AND** if there is no waiting worker, the action falls back to a normal page
  reload.

#### Scenario: Version mismatch re-prompts after long-running sessions

- **GIVEN** the build identifier stored in `localStorage` differs from the
  hydrated build identifier
- **WHEN** the app hydrates
- **THEN** the client displays the update prompt even if the browser did not
  emit a fresh `updatefound` event
- **AND** dismissing the prompt stores the dismissed build identifier so the user
  is not prompted again until another build ships.
