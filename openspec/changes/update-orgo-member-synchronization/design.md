# Design

## Current implementation

- `MembersController.list` calls `MembersService.dashboard`; the dashboard
  returns separate `members` and `inactiveMembers` collections.
- `MemberOrgoService.refreshProfiles` loops over local linked members, reads
  details and reconciles profiles/categories. It does not discover missing
  identities or apply incoming lifecycle changes.
- `MemberOrgoService.daily` gates refresh at 24 hours. Retain a background
  fallback, but it must use the same new reconciliation path as page refresh.
- Profile/status mutations already persist `MemberSync` records. The worker
  reads remote state and checks write enablement, baselines and readback.
  Its generic failure handler conflates temporary failures and permissions;
  automatic execution only selects pending/running jobs. Unrelated revision
  changes can stop an older intent as `review`.

## Ownership and operation inventory

| Data | Authority and delivery |
| --- | --- |
| Shared identity, contact, supported reusable profile fields, photo | Local edits enqueue verified supported Orgo operations; Orgo wins concurrent same-field changes |
| Membership lifecycle status | Shared; local withdrawal/reactivation enqueue status operations; inbound changes reconcile lifecycle |
| Structure, category, fixed unit/subunit, local responsibilities | Resurse; preserve on refresh, no remote structure write |
| Grade, promises and fields without verified write mappings | Keep explicit local ownership or unsupported state per field; never claim delivery without a contract |
| Internal notes and local operational/financial evidence | Resurse; excluded from generic member PATCH |

Centralize the per-field capability/ownership registry. Inventory create/update,
bulk actions, rich-profile and reusable-profile editors, contact, photo,
withdraw/reactivate, organization and progression paths. Do not allow a broad
unsupported payload to prevent supported fields from syncing. Creating a member
without an Orgo identity remains explicitly unlinked until a verified create/link
contract exists; never create duplicate remote users by retrying blindly.

## Page refresh and complete roster reconciliation

The initial roster request returns the saved, authorized view and refresh
metadata without waiting for Orgo. On workspace opening the client requests a
refresh through an authenticated server endpoint. A durable run/lease keyed by
configured center coalesces overlapping opens across processes. Each opening
requests fresh data; there is no 24-hour or completed-run freshness shortcut.
Search, sorting and pagination over the loaded snapshot do not each start a full
import. Manual retry uses the same entry point.

Fetch all roster pages with bounded concurrency for necessary detail reads.
Validate center, IDs, duplicates and pagination completeness before inferring
absence or advancing a successful-completion timestamp. Upsert by unique Orgo ID,
retaining local identity, account, assignment and financial links. Do not infer
withdrawal from a missing row, empty page, timeout or failed fetch. A failed run
retains cached rows and reports failure; any partially refreshed records must
not make the whole run appear successful.

Automatic discovery does not automatically import authority. New members use the
existing one-time structure bootstrap rules; ambiguous identity/placement goes
to review with central visibility and existing structure gates. Established
Resurse organization is preserved even if Orgo type, names or roles change.

The browser polls bounded run status while refreshing, then reloads the scoped
roster without losing filters, sorting or current page unnecessarily. Counts,
run summaries and failures must not reveal members from another structure.

## Status and lifecycle

Retain raw Orgo status alongside the effective local lifecycle and source. Use
an explicit mapping that distinguishes suspension, inactivity and withdrawal.
Unknown codes remain visible as requiring review, never silently active.

Local status edits immediately apply authorized lifecycle effects and enqueue
the corresponding remote status intent. With unchanged remote baseline, incoming
refresh preserves this pending local change until delivery. A genuine concurrent
remote status change wins and uses the same lifecycle service rather than
directly changing a display string. A confirmed remote ACTIVE status restores
active visibility for a previously suspended/inactive member.

Withdrawal ends all current involvement and derived permissions. Suspension
must prevent inactive authority from remaining effective without falsely
recording a global withdrawal. Reactivation never reopens ended mandates,
delegations or administrator privileges. Retain known local affiliation; missing
placement requires explicit assignment/review, not restoration of old authority.
Preserve historical receipts and allocations; current-year eligibility uses
existing financial rules and lock ordering, with no retroactive arrears.

## Outgoing delivery and Orgo-wins reconciliation

Compare each shared field against its last confirmed baseline. If remote equals
baseline and local changed, deliver local. If remote already equals the intended
value, acknowledge without a redundant PATCH. If both diverged differently,
adopt remote, audit supersession, and retire that field's pending intent. Other
fields in the same operation can still be delivered.

Persist intent before dispatch; never hold a database transaction across network
calls. Add durable attempt count, next attempt time and error classification,
plus leases recoverable after restart. Retry network failures, 429 and temporary
server errors with bounded exponential backoff, jitter and Retry-After support.
Authentication/authorization failures and unsupported mappings need explicit
action, not rapid retries. Resume blocked intents after configuration is fixed.

For timeouts after a possible write, read back before retrying. A completed
readback must confirm the exact identity, center and affected values. Never mark
an uncertain write as synchronized. Process current field intentions in member
order, superseding older edits to that field while retaining unrelated pending
changes. Recheck member revisions/baselines and lease ownership at commit so an
in-flight response cannot erase a newer edit. Orgo read-before-write without
remote conditional updates cannot guarantee atomic cross-system writes; verify
conditional-update support and document this limit if unavailable.

## Unified table and migration

Return all authorized members through one consistent serializer. Display
`Activ`, `Suspendat`, `Inactiv`, `Retras din activitate` and unknown/review states
as appropriate to verified status mapping. Use the existing main status filter;
provide an all-status choice. Keep the existing default active view unless
implementation evidence requires an explicit migration of the saved filter.
All-status search, sort, totals, pagination and bulk selection use the same set.
Existing action policies remain enforced for every selected member.

Remove the inactive-history component from the main workspace and obsolete API
split. Backfill status provenance from saved remote snapshots where possible;
ambiguous rows remain for review. Reconcile legacy conflict/unsupported jobs
under the new ownership rules rather than replaying stale changes. Dry-run
counts must prove no duplicate members, lost links or widened structure access.
Audit supersession with the existing field privacy rules; do not expose medical
values through roster messages or general audit metadata.

## Verification and delivery order

1. Add ownership/status model, migration and reconciliation tests.
2. Deliver complete roster reconciliation and page-open refresh feedback.
3. Unify the table and retire separate inactive history.
4. Complete field-level automatic delivery, retries and legacy-job handling.
5. Verify permitted status/profile writes in a suitable test environment with an
   edit-capable token; then enable production writes through existing config.

Regression coverage must include suspended-to-active discovery, pending local
withdrawal against unchanged ACTIVE baseline, genuine remote-wins status
conflicts, immutable local organization, no privilege restoration, pagination
failure, cross-process duplicate refresh, restart recovery, edits during network
calls, permission errors, readback mismatch and preserved financial evidence.
