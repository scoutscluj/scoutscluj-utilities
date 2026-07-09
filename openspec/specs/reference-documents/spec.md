# reference-documents Specification

## Purpose
TBD - created by archiving change add-reference-document-viewer. Update Purpose after archive.
## Requirements
### Requirement: Authenticated Reference Document Routes

The system SHALL expose the migrated organizational reference documents through
their legacy-compatible routes inside the authenticated SvelteKit application.

#### Scenario: User opens the ONCR statute

- **GIVEN** an authenticated user
- **WHEN** they open `/info/statut`
- **THEN** the app shows `Statut ONCR 2025`
- **AND** loads `/documents/statut-2025.pdf`.

#### Scenario: User opens the ONCR regulation

- **GIVEN** an authenticated user
- **WHEN** they open `/programe/regulamente`
- **THEN** the app shows `Regulament ONCR 2025`
- **AND** loads `/documents/regulament-oncr-2025.pdf`.

#### Scenario: User opens the headquarters regulation

- **GIVEN** an authenticated user
- **WHEN** they open `/sediu/regulament`
- **THEN** the app shows `Regulament Sediu`
- **AND** loads `/documents/regulament-sediu.pdf`.

#### Scenario: Anonymous user opens a document page

- **GIVEN** a user has no valid local session
- **WHEN** they open any migrated reference-document page
- **THEN** the existing authenticated layout redirects them through the login
  flow
- **AND** preserves the safe relative return target.

### Requirement: Reference Document Navigation

The system SHALL provide enabled app-shell navigation to each migrated reference
document.

#### Scenario: User opens an Info document from the menu

- **GIVEN** the authenticated app shell is visible
- **WHEN** the user expands `Info`
- **THEN** enabled entries for `Statut ONCR` and `Regulament ONCR` are visible
- **AND** each entry navigates to its corresponding document route.

#### Scenario: User opens the headquarters regulation from the menu

- **GIVEN** the authenticated app shell is visible
- **WHEN** the user expands `Sediu`
- **THEN** the `Regulament` entry is enabled
- **AND** it navigates to `/sediu/regulament`.

### Requirement: In-App PDF Reading

The system SHALL render each migrated reference PDF in a reusable in-app viewer
with continuous vertical scrolling, text search, and zoom controls.

#### Scenario: PDF loads successfully

- **GIVEN** a migrated document page is open
- **WHEN** PDF.js finishes loading the configured asset
- **THEN** the document pages are available in one continuous vertical surface
- **AND** the viewer shows the current page and total page count.

#### Scenario: User scrolls through the document

- **GIVEN** a multi-page PDF is loaded
- **WHEN** the user scrolls down through the viewer
- **THEN** subsequent pages appear in document order without requiring a next
  page action
- **AND** the current-page status follows the visible page.

#### Scenario: User searches document text

- **GIVEN** a PDF with a text layer is loaded
- **WHEN** the user searches for text contained in the document
- **THEN** matching text is highlighted
- **AND** the viewer shows the current and total result count
- **AND** the selected match is scrolled into view.

#### Scenario: User navigates search results

- **GIVEN** a search query has multiple matches
- **WHEN** the user selects the previous or next result control
- **THEN** the corresponding match becomes selected
- **AND** the viewer scrolls that match into view.

#### Scenario: User changes zoom

- **GIVEN** a PDF page is rendered
- **WHEN** the user increases or decreases zoom
- **THEN** the page is rerendered at the new bounded scale
- **AND** the viewer remains usable at narrow viewport widths.

### Requirement: Local PDF Assets And Worker

The system SHALL serve the three unchanged legacy PDF files and the PDF.js worker
from the deployed web application.

#### Scenario: Viewer loads its dependencies

- **GIVEN** a migrated document page is open
- **WHEN** the viewer loads the PDF and its worker
- **THEN** both resources are requested from the application deployment
- **AND** no PDF worker is requested from a third-party CDN.

#### Scenario: Migrated PDF integrity is checked

- **GIVEN** the three PDFs have been copied into the SvelteKit static assets
- **WHEN** their SHA-256 hashes are compared with the legacy source files
- **THEN** all three hashes match
- **AND** their filenames remain unchanged.

### Requirement: Download And Failure Fallback

The system SHALL let users download each source PDF whether inline rendering
succeeds or fails.

#### Scenario: User downloads a loaded document

- **GIVEN** a PDF is loaded in the viewer
- **WHEN** the user selects `Descarcă`
- **THEN** the browser downloads or opens the configured PDF asset
- **AND** uses the original PDF filename.

#### Scenario: PDF loading or rendering fails

- **GIVEN** the configured PDF cannot be loaded or rendered
- **WHEN** the failure occurs
- **THEN** the viewer shows Romanian error guidance
- **AND** provides a normal link to the configured PDF asset as a fallback.

### Requirement: Accessible Viewer Controls And Status

The system SHALL expose the viewer controls and state to keyboard and assistive
technology users.

#### Scenario: User operates controls with a keyboard

- **GIVEN** a PDF document page is open
- **WHEN** the user navigates the controls by keyboard
- **THEN** each control has a visible focus state and accessible name
- **AND** unavailable actions are disabled.

#### Scenario: Viewer state changes

- **GIVEN** the viewer is loading, has changed page, or has failed
- **WHEN** its status changes
- **THEN** the relevant status is available to assistive technology
- **AND** the visible document title identifies the viewer.

