## ADDED Requirements

### Requirement: Fixed units and independent responsibilities

The system SHALL provide exactly seven immutable units in each of Cluj and Florești: Lupișori, Temerari, Exploratori, Seniori, Lideri, Voluntari adulți and Scouteri. Each classified member SHALL have one primary category and at most one primary subunit. Responsibilities SHALL be independent, multiple assignments and SHALL NOT confer permissions merely through the primary category.

#### Scenario: Senior helps another unit

- **WHEN** a Senior is assigned to help a Temerari subunit
- **THEN** their primary category remains Seniori and their responsibility is recorded separately.

#### Scenario: Attempt to change a fixed unit

- **WHEN** any user requests creation, rename, archive or deletion of a fixed unit
- **THEN** the system rejects the operation; permitted subunit operations remain available.

### Requirement: Explicit affiliation and safe initial classification

The system SHALL preview initial affiliation using accent-insensitive Orgo name matching for Florești, defaulting other names to Cluj. Central confirmation SHALL persist corrected affiliations and explicit imported categories with audit. Later name changes SHALL NOT recompute affiliation. Missing or contradictory categories SHALL require review rather than inferred classification.

#### Scenario: Confirm and rename

- **WHEN** a member with a normalized name containing Florești is confirmed in Florești and later renamed
- **THEN** their persisted affiliation remains Florești.

#### Scenario: No subgroup or unclear category

- **WHEN** an imported member has an explicit category but no subunit
- **THEN** the roster shows and filters that category with an unassigned subunit.
- **WHEN** the category is missing or contradictory
- **THEN** the member is marked De verificat without creating another unit category.

### Requirement: Migration preserves operational history

The migration SHALL be idempotent, previewed, centrally confirmed and audited. It SHALL preserve member identities, source mappings, historical assignments, document references and financial history. Ambiguous legacy unit mappings SHALL require resolution before conversion. Existing progression enablement and local edit conflict handling SHALL be preserved.

#### Scenario: Rerun migration

- **WHEN** the confirmed migration is rerun
- **THEN** it creates no duplicate units, members or assignments and changes no historical financial amounts.

### Requirement: Contextual member and subunit management

The system SHALL expose authorized management directly within common member and unit pages, using contextual menus and modal forms with per-item capabilities. Tables SHALL share compact controls, pagination up to 250 rows and counts limited to accessible results. Category filters SHALL work independently of subunit assignment. Member management admin submenus SHALL be removed and old page links SHALL resolve to the common workspace.

#### Scenario: Scoped management

- **WHEN** a unit chief opens the common roster
- **THEN** management actions appear only for elements within their mandate and execution is verified again by the server.

#### Scenario: Compact filtered roster

- **WHEN** an adult filters a primary category
- **THEN** matching unassigned members remain visible, pagination displays the visible range and filtered total, and the toolbar has no duplicate select-all-results button.
