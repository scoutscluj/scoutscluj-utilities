## ADDED Requirements

### Requirement: Search-First Readable Table Toolbars

Application table toolbars SHALL place text search before domain filters in
visual and keyboard order. Controls SHALL provide sufficient line-height and
width for their values and SHALL wrap without clipping at narrow widths.

#### Scenario: Membership toolbar at intermediate width

- **WHEN** a user opens membership records on a tablet-sized viewport
- **THEN** name/ID search precedes period and payment-state filters
- **AND** selected filter text is readable
- **AND** the table scrolls within its container instead of widening the page.

### Requirement: Safe Search Term Highlights

Visible table results SHALL highlight matching search terms regardless of case
or Romanian diacritics. Highlighting SHALL preserve original text, DOM behavior,
links and form controls and SHALL NOT interpret search input as markup.

#### Scenario: Search without diacritics

- **GIVEN** a result contains `Ștefan`
- **WHEN** the user searches for `stefan`
- **THEN** the matched name is highlighted while keeping its original spelling.

### Requirement: Shared Compact Table Pagination

Paginated listings SHALL use a compact footer with result range, rows per page
and first/previous/next/last navigation as neutral icon buttons with accessible
Romanian labels. Page and selection bounds SHALL remain correct after filtering
or changing page size, including zero results and the all-results option.

#### Scenario: Filter reduces the result count

- **GIVEN** a user is on a later table page
- **WHEN** a filter reduces the result count
- **THEN** navigation points to an existing page
- **AND** the footer range matches the visible results
- **AND** unavailable navigation actions are disabled.

### Requirement: Consistent Application Table Presentation

All application tables SHALL share the documented table density, headers,
focus/hover treatment and responsive containment. Column selectors SHALL have
icon-only triggers with accessible labels. Existing table editing, totals,
exports, column choices and authorization SHALL remain correct.

#### Scenario: Member column selection

- **WHEN** a member administrator opens the column icon
- **THEN** the existing column choices are available
- **AND** toggling a choice updates the table without changing member selection.
