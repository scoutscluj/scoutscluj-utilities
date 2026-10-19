# Design: unit member management

## Existing implementation and evidence

- Backend: NestJS, MikroORM and PostgreSQL. Frontend: SvelteKit.
- `users` stores application accounts and coarse application roles, not every
  member in the local center. `orgo_connections` links signed-in identities.
- `OrgoRosterService` reads paginated members, validates the local center and
  projects identity and fee eligibility. It does not provide the proposed unit
  management domain. `OrgoTokenService.apiJson` prefers configured
  `ORGO_API_TOKEN`, otherwise delegated access; `administrativeJson` currently
  uses a delegated token for national financial operations.
- `MembershipObligation` has a unique period/Orgo-user pair and a non-null
  Orgo user ID. Receipts, allocations and national transfers are distinct.
  Existing annual financial periods start on 1 September.
- Existing account roles are `moderator`, `admin`, `finance_manager` and
  `super_admin`. They must not be used as substitutes for unit/group scoping.
- The parental-consent schema includes typed form-field definitions and
  organizer data. Its current user flow renders PDF fields for handwritten
  completion; those are not stored individual registration responses.

Public Orgo contracts inspected during discovery:

- [Authentication](https://orgo.space/docs/api-reference/concepts/authentication.md):
  server `Api-Token` can be read-only or read/write and inherits its owner's
  permissions. OAuth app access is separately constrained; the login flow must
  not be treated as proof of administrative API rights.
- [Get unit](https://orgo.space/docs/api-reference/unit/get-a-unit.md): units
  expose parent, unit type and local-center relations.
- [Create user role](https://orgo.space/docs/api-reference/userrole/create-a-user-role.md)
  and [update user role](https://orgo.space/docs/api-reference/userrole/update-a-user-role.md):
  assignments relate user, role and unit, with `dateEnded` and `isAdmin`.
  Required permissions differ by unit type; `isAdmin` needs separate authority.
- [Unit types](https://orgo.space/docs/api-reference/unittype/get-a-unit-type.md)
  and [unit listing](https://orgo.space/docs/api-reference/unit/list-units.md)
  describe structure/configuration, not the actual ONCR configuration.

These are public platform contracts, not successful live write tests on
`membri.scout.ro`. No production member or financial record was changed during
this discovery. Resolve actual role/status IDs and accepted payloads before
enabling the relevant writes.

## Domain model

Use a dedicated module for operational members (for example `members`), separate
from the existing financial `membership` module and authenticated `users`.
Names below describe responsibilities rather than prescribe final table names.

| Record | Responsibility |
| --- | --- |
| Member | Local stable ID, nullable unique Orgo ID until creation confirmed, account link when present, canonical identity projection, individual school grade, current lifecycle status and revisions |
| Unit | Local center, age branch, Orgo mapping, optional-group organization and archive state |
| MemberGroup | Stable cohort identity, parent unit, display name, optional school-cohort metadata and archive date; never use grade as its ID |
| Assignment | Member, unit/group/center scope, beneficiary/adult role, start/end, actor and source; beneficiary assignment and adult responsibilities are independent |
| LeaderPromise | Member, recorded promise date and recording actor; used with eligibility rules when granting leader status |
| CouncilMandate | Member, start/end and actor; source of derived admin access |
| PermissionGrant | Explicit scope and permission for helpers, grantor and lifetime |
| MemberProfile | Versioned contact/emergency/health and reusable typed fields, confirmation provenance and account actor |
| MemberNote | Author, member, content, edit history; local-only, same current-unit visibility rules |
| AnnualTransition | Target year, planned inputs, per-member/group outcome, overrides and idempotency keys |
| OrgoSyncOperation | Entity/field, local revision, remote base value, intended change, dependencies, credential mode and state |

Treat the application account and the member as different records: a member can
exist without having logged in. Link by verified Orgo identity, never silently
by display name or a parent email shared by siblings. A provisional new member
has no verified Orgo ID and cannot enter existing ID-dependent public checkout
flows until linkage is confirmed. Suspected duplicate members require review.

Maintain school grade individually even when the group has a cohort label.
Avoid a free-form profile JSON becoming an uncontrolled schema: reusable fields
have stable codes, types and field-specific read/write policies. The initial
field inventory comes from the existing templates and actual needs; organizer
activity fields and signatures are not reusable personal-profile answers.

Invariants:

- One current beneficiary unit and at most one current subgroup per member.
- A subgroup belongs to the beneficiary's unit. Reassignment closes prior
  assignments rather than deleting history.
- Adults may hold several concurrent scoped responsibilities. A senior may also
  help at units; while enrolled as a senior they cannot hold a leader role.
- Leader status requires a recorded promise and an eligible adult state. A
  senior's helper assignment does not confer leader permissions.
- A unit has one current chief; replacement is transactional and retains history.
- No active responsibility remains after global withdrawal. Reactivation does
  not reopen old assignments, mandates or grants implicitly.
- Creating/archive operations preserve history and must resolve active member
  assignments before archiving an occupied group. Ordinary group reorganization
  must not cause global withdrawal.

## Authorization

Centralize authorization in a policy service used by queries, mutations,
exports, background work and field serialization. Determine membership and
mandates from current database state; do not rely solely on roles cached in a
session. Persist assignment-derived and manually assigned application access
with separate provenance, so revoking a mandate removes only its contribution.

| Actor | Read | Write |
| --- | --- | --- |
| Member account (also used by parent) | Own reusable profile, own existing fee surface | Own contact/health/reusable answers; no internal notes, grade, roles or unit assignment |
| Group leader | Current members, fee summary, health and notes across own unit | Contacts, grade, health, notes and member lifecycle in own group; create/reactivate in own group |
| Leader of common collective | Same unit read access | Same operations in assigned collective |
| Unit chief | All own-unit member data and fee summaries | All own-unit member fields including name/birth date; own groups, helper grants, promise/leader grants and outbound unit transfers |
| Adult helper | Basic member fields in assigned group | None by default; chief can grant scoped member editing and fee reading; sensitive access requires explicit authorization |
| Active council administrator | Center-wide member administration | Units, chiefs, mandates, all member management and transfers |
| Existing financial staff | Existing authorized financial surfaces | Existing financial workflow; no new payment mutation power is implied for leaders |

The scope of a chief granting leader status is their unit. A chief cannot grant
council or global administrative access through a unit assignment. Council
membership derives `admin`, not `super_admin`; the existing technical
super-admin console remains protected. An administrator may manage council
mandates through a dedicated operation without exposing the generic
super-admin role editor.

Former-unit leaders immediately lose access to the live profile and notes after
a transfer. Historical registration snapshots follow activity authorization;
their existence does not confer continuing access to the current member file.
Audit actor/scope/field categories and revisions; do not copy health details or
note bodies into generic audit entries, notifications or logs.

## Annual progression and manual corrections

Run once per target year on 1 September in `Europe/Bucharest`, independently of
staff opening a page. The scouting program year begins in October; the September
change is preparation and does not redefine that program date. Financial period
rollover retains its existing separate behavior.

Advance individual grades 1–11 by one; completing grade 4 moves to Temerari,
completing grade 8 to Exploratori, and completing grade 12 to Seniori. A stable
Temerari group advances its class label while keeping its ID, members and adult
assignments. A graduating grade-8 cohort closes and its beneficiaries join the
common explorer collective; no new explorer group or adult destination is
invented automatically. New grade-5 cohorts need their own group and explicit
adult assignments. Until a destination subgroup exists, members can be attached
to the destination unit and listed as awaiting group assignment.

At the September transition, seniors already aged 24 become adult volunteers
with no unit assignment. End their senior membership and existing unit helper
assignments as part of that transition; do not infer scouter or leader status.
Use calendar dates/birth dates, not UTC age arithmetic that shifts the local day.

Record exceptions before processing and allow manual corrections afterwards.
Unknown grade, missing birth date, mixed-grade cohort contradictions or ambiguous
destination mappings create visible review items; do not guess from age or
silently omit members. Per-year uniqueness, transactional claims, saved input
revisions and bounded per-member work make retries safe across processes. A
manual correction cannot be overwritten by a stale annual run or sync response.
After downtime, catch up the missed scheduled transition without processing an
already-completed target year twice.

Manual grade, membership and role updates remain available throughout the year.
Automatic branch eligibility is distinct from a leader's permission to move a
member between units manually. An outbound manual transfer requires the source
chief or council and notifies the destination chief for subgroup allocation.

## Withdrawal, return and fees

Withdrawal is a global lifecycle change, not removal from one group. An
authorized leader can execute it immediately without chief approval. In one
transaction, set local status, end active responsibilities/mandates/grants,
remove derived privileges, exclude from active rosters and reminders, and enqueue
Orgo updates. Preserve historical facts, receipts and snapshots.

Separate fee collection eligibility from the immutable financial history.
Suppress arrears tracking/collection for withdrawn members and do not create
new payable periods while withdrawn. Prior years do not become debts on return.
Reactivation selects a current unit/group and creates or reuses the current
member/period obligation, respecting existing current-year payments and plan
review rules. No duplicate charge and no assumed refund or ledger deletion.
Financial corrections and national marking remain in their existing workflows.

Expose a dedicated, minimized unit/group fee-status projection joined by
verified member identity. It may show period, due/paid/remaining and national
sync status where available; it does not expose processor secrets, bank
reconciliation or payment-administration operations to leaders. Pending Orgo
identity/status must not be misrepresented as financially verified.

## Reusable profile and activity boundaries

Deliver member profile editing and notes now. A parent may sign in through the
child's account; audit records the authenticated account without claiming which
human used it. Do not introduce parent invitation/account linking as a dependency.

Registration forms and parental consents are separate workflows. The existing
parental-consent PDFs continue to be generated, completed and signed; editing a
profile or confirming a registration does not sign, regenerate, invalidate or
replace a PDF. Do not add digital signing or reuse a checkbox as a signature.

Define a narrow integration contract for future activity registration:

1. An authenticated/authorized registration reads allowlisted reusable profile
   values and their revision; public unauthenticated ID lookups reveal none.
2. Medical information and emergency contacts require explicit reconfirmation.
3. Submission validates answers, stores an immutable activity registration
   snapshot, and updates permitted reusable fields with optimistic concurrency.
4. A stale form cannot silently overwrite newer health/contact changes. Resolve
   the differences before writing the live profile.
5. Historical registrations retain their confirmed data; internal leader notes
   never enter participant-visible forms or the Orgo sync queue.

A complete event-registration builder, event-fee checkout and attendance are
follow-up work. Do not retrofit a participant-answer store into organizer-draft
data or infer medical answers from empty handwritten PDF fields.

## Orgo synchronization

First map the actual ONCR configuration: local-center ID, units/parents/types,
roles for beneficiaries/helpers/leaders/chiefs/council, user status values and
editable profile/custom fields. Some layers may have no permitted equivalent;
keep them local with explicit unsupported mapping instead of inventing IDs or
claiming successful synchronization. Unit admin flags are not application roles
and must not be copied without a verified mapping and required authority.

Use a capability matrix per operation (members, units, assignments, status,
identity, profile). Prefer a server `Api-Token`. Scope every read/write to the
configured center and validate relations, including when the token owner has
broader national rights. Do not assume the token is configured/read-write merely
because the code supports it. Public docs do not prove the deployed tenant's
version or the current token owner's permissions.

Persist local change, audit and outbox entry atomically. The worker uses
dependency ordering (create member before assignments), leases, bounded retries
and independent status for each operation. Suggested states: pending, running,
synced, conflict, permission-required, unsupported and uncertain. UI labels are
Romanian and include the last confirmed synchronization time.

Compare the latest local revision, last known remote value and fresh remote
value. Remote changes to clean fields can be imported. Both sides changing a
field differently creates a conflict; do not overwrite a local pending change
with a periodic roster refresh. Local withdrawal/role revocation remains effective
for authorization even if Orgo has not yet accepted it. Resolution is itself
authorized, versioned and audited. Never infer withdrawal from a failed or
incomplete paginated read.

On 403 or unsupported fields, keep the local result and show the pending reason.
Do not automatically fall back to a user's token. If the user explicitly elects
delegated authorization for a supported operation, bind that choice and actor to
the job, recheck current authority and use existing encrypted token storage.
Do not assume a legacy SSO success token or OAuth app token can perform the same
administrative writes. This proposal does not change existing national fee
marking's explicit delegated-token rule.

After an uncertain write, read back before retrying. Do not replay member
creation or role creation blindly when Orgo lacks an idempotency mechanism.
Store enough minimal evidence to match an attempted creation; ambiguous matches
require review, not automatic merging by name/email. Verify the resulting remote
fields before marking an operation synced. Secrets, health answers and note
bodies are excluded from routine logs.

## Migration and delivery

Additive tables and constrained links first, then a reviewed initial import of
the actual center roster and mappings. Import active and withdrawn identities
without duplicating financial records or assuming they have application
accounts. Resolve class/cohort data gaps before enabling the annual worker.
Existing authenticated accounts, fee obligations and signed/generated PDFs keep
their identifiers and history. Assignments derive new unit permissions; do not
grant every adult account a global role.

Enable read-only roster/profile surfaces first, then scoped local mutations,
reviewed Orgo writes, withdrawal/return fee integration and annual automation.
The import itself is not permission to run an immediate annual catch-up against
unreviewed historical grade data. Production write activation requires verified
mappings/capabilities; unsupported operations remain visibly local/pending.

## Validation

Test the policy matrix through real API boundaries, including cross-group
reads/writes, sensitive-field serialization, helpers, multi-role seniors,
mandate expiry and former-unit access. Test withdrawal/return with paid,
partially paid and unpaid current periods without changing historical money.
Test September transitions, grade-8 cohort closure, age-24 unassignment,
exceptions, missing data, downtime recovery and concurrent manual correction.
Exercise Orgo paging, center validation, conflict handling, credential selection,
403, uncertain create/update and readback against fixtures or a suitable test
environment; do not mutate real members merely to prove an API accepts a write.
