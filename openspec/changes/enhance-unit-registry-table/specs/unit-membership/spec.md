## ADDED Requirements

### Requirement: Multi-select member registry filters

The roster SHALL support multiple choices in every categorical filter. Choices
within one filter SHALL be combined with OR; different filters and name search
SHALL be combined with AND. An empty selection SHALL include all values. The
initial status selection SHALL remain active members.

#### Scenario: Multiple structures and categories

- **WHEN** an administrator selects two structures and two categories
- **THEN** results include either selected category within either selected structure
- **AND** changing structure or category clears stale subunit choices.

#### Scenario: Balanced filters and reversible selections

- **WHEN** the registry is shown on desktop, tablet or mobile
- **THEN** search and table actions occupy a separate row above an evenly sized filter grid
- **AND** selected filters appear as removable chips alongside the result count
- **AND** reset clears search and every filter without changing authorization.

### Requirement: Age and voting eligibility

The roster SHALL display and sort age in completed years as of today's date in
Europe/Bucharest for members whose details the reader can access. It SHALL NOT
expose birth dates in the roster response. The voting filter SHALL classify age
16 and above as eligible, below 16 as ineligible, and absent or inaccessible ages
as unknown.

#### Scenario: Sixteenth birthday

- **WHEN** today in Bucharest is the member's sixteenth birthday
- **THEN** their displayed age is 16 and they match the eligible voting filter.

### Requirement: Current-fee filtering

The roster SHALL offer separate multi-select paid, partially paid and unpaid
cotizație filters. Paid SHALL mean credited payments cover the current fee total;
partially paid SHALL mean positive payments below that total; unpaid SHALL mean
no payments toward an existing current fee. These states SHALL be independent of
member status and collection tracking. Missing current fees and rows without fee
permission SHALL have separate options rather than implying an unpaid balance.

#### Scenario: Partial payment

- **WHEN** a member has credited payments and an outstanding balance on the current fee
- **THEN** the member matches partially paid and does not match unpaid or paid.

#### Scenario: Combined unpaid and partial selections

- **WHEN** the user selects both unpaid and partially paid
- **THEN** results and exports include both groups while excluding fully paid members.

### Requirement: Filtered roster CSV export

The roster SHALL export all rows matching current filters across pagination,
in table sort order and respecting column choices and existing permissions.
CSV SHALL preserve Romanian text, escape delimiters, quotes and newlines, and
neutralize spreadsheet formulas in text fields.

#### Scenario: Results span multiple pages

- **WHEN** the user exports a filtered roster with more rows than the page size
- **THEN** the CSV contains every matching row, including rows on other pages
- **AND** unauthorized fee amounts and hidden columns are excluded.
