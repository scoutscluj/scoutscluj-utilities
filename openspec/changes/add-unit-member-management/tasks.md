## 1. Integration discovery and migration contract

Implementation status: the user approved implementation. The local management
module and migration are implemented; production import, PostgreSQL migration
execution and full ONCR write mappings remain pending. See
`docs/product/unit-member-management.md` for supported operations and limits.

- [ ] Read the authorized ONCR structure; record actual center, unit/type, role,
      status and profile-field mappings without exposing credentials/member data.
- [ ] Document server-token capabilities per operation; verify write contracts in
      an appropriate test environment and record unsupported operations.
- [x] Inventory reusable individual fields separately from activity organizer
      fields, handwritten PDF answers, signatures and leader notes.
- [ ] Define reviewed initial import, duplicate resolution, unknown-grade review
      and explicit activation of annual processing; update domain terminology.

## 2. Readable roster and unit structure

- [x] Add member/account identity linkage, units, stable groups, historical
      assignments, promises, mandates and explicit grants with additive migrations.
- [ ] Import reviewed Orgo members/structure; preserve existing account, ledger
      and document identifiers and distinguish provisional identities.
- [x] Implement shared policy queries and field-aware serialization.
- [x] Deliver Romanian unit/group rosters, member views and current-year fee
      summaries without granting payment-administration access.
- [x] Verify cross-group reads, helper defaults, multi-unit adult access and
      exclusion of health/notes from unauthorized and public responses.

## 3. Scoped member management

- [x] Implement manual member/grade/contact updates, elevated identity editing,
      new-member creation and reviewed duplicate handling.
- [x] Implement chief/group assignment, promises/leader eligibility and helper
      grants; prevent seniors acquiring leader rights.
- [x] Implement council mandate-derived admin access with grant provenance and
      immediate revocation checks; retain super-admin separation.
- [x] Implement source-chief/council transfers, destination notifications and
      immediate revocation of former-unit access.
- [x] Implement global withdrawal and explicit destination-based reactivation,
      ending privileges without automatically restoring old responsibilities.
- [ ] Verify authorization and audit for all mutations, including stale sessions.

## 4. Reusable member file

- [x] Implement typed contact, emergency, medical and reusable profile fields,
      profile revisions and internal local-only notes.
- [x] Deliver member-account self-service and staff edits under scoped policies;
      record the signed-in account when a parent uses the child's account.
- [x] Define future registration prefill/reconfirmation/snapshot integration,
      with concurrency rules and no dependency on a complete registration builder.
- [x] Verify history, transfer visibility and exclusion of notes from self-service.
- [x] Preserve the separate parental-consent PDF generation/signing workflow;
      profile updates and registration confirmations do not replace signed PDFs.

## 5. Reliable Orgo synchronization

- [ ] Add transactional outbox, capability-aware server-token adapter, field-level
      mappings and local/remote revisions with center validation.
- [ ] Implement safe inbound reconciliation, conflict resolution, leases,
      dependency ordering, uncertain-write readback and explicit pending states.
- [ ] Add admin sync/conflict views and explicit actor-bound delegated execution
      only where supported; never silently change credential modes.
- [ ] Verify permission errors, incomplete pages, duplicate creation risk and
      manual edits concurrent with pending remote responses.

## 6. Lifecycle and fee eligibility

- [x] Integrate withdrawal with arrears suppression and future-period eligibility
      without deleting or rewriting receipts, allocations or settlement evidence.
- [x] Reactivate only the current year's payable amount, honoring current-year
      allocations and existing plan-change review behavior.
- [ ] Prevent unverified provisional Orgo identities entering existing ID-based
      checkout; verify paid/partial/unpaid return cases and idempotency.

## 7. Annual progression

- [x] Implement independent September 1 scheduling in Europe/Bucharest,
      target-year uniqueness, catch-up, exceptions and per-member outcomes.
- [x] Advance individual grades and stable cohort labels; implement grade 4/8/12
      branch transitions and archive completed Temerari groups with history.
- [x] Keep adults with continuing cohorts; explicitly handle new grade-5 groups
      and adults from archived groups without inventing destinations.
- [x] Convert seniors aged 24 to unassigned adult volunteers; close existing
      unit helper assignments and do not infer scouter/leader roles.
- [ ] Test missing data, cohort exceptions, repeated runs and concurrent manual
      correction before enabling automation on production members.

## 8. Verification and release

- [x] Validate this proposal with `openspec validate add-unit-member-management
      --strict`.
- [x] Resolve proposal review findings before implementation.
- [x] Run API HTTP/policy/adapter tests, existing API/web tests, type checks,
      production builds, and lint/format checks on modified files.
- [ ] Execute the migration and transactional scenarios on PostgreSQL; local
      PostgreSQL and Docker were unavailable during implementation.
- [ ] Review imported mappings, scoped access and sync evidence before enabling
      production writes; show unsupported/pending changes honestly.
- [x] Update the operations guide and domain docs with implemented behavior and
      any remaining integration gates.
