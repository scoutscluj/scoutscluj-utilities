## 1. Contracts and additive persistence

- [x] Inventory every member mutation path and classify local/shared fields and verified write capabilities.
- [ ] Verify tenant write permission, lifecycle mapping and conditional-update support without modifying real members for discovery.
- [x] Add refresh-run leases/metadata, status provenance and durable retry scheduling through additive migrations.
- [ ] Plan legacy inactive records, conflicts and outbox conversion; validate dry-run counts and identity/financial links.

## 2. Incoming reconciliation

- [x] Implement complete paginated center roster discovery/upsert, bounded detail reads and identity validation.
- [x] Reconcile profiles/statuses against baselines while preserving local organization and pending local-only changes.
- [x] Reuse lifecycle effects for inbound changes; preserve history and prevent restoration of ended authority.
- [x] Add authorized refresh start/status/retry endpoints with cross-process coalescing and honest failure metadata.
- [x] Reuse the same service for background refresh without the daily gate on page opens.

## 3. Unified member workspace

- [x] Show cached rows immediately and request refresh on opening; update on completion with progress/last-success/error feedback.
- [x] Unify inactive and current rows in the scoped serializer, main table, filters, counts, search, sorting and pagination.
- [x] Remove separate inactive-history UI/API and preserve relevant individual/bulk actions with server-side authorization.
- [x] Display pending, blocked, uncertain and confirmed remote delivery states without exposing private fields.

## 4. Outgoing synchronization

- [x] Atomically enqueue supported shared edits from every equivalent editing path, including withdrawal/reactivation and bulk changes.
- [x] Keep Resurse organization changes local; separate unsupported fields from deliverable field intentions.
- [x] Dispatch promptly after commit with durable worker recovery and automatic retry/backoff for transient errors.
- [x] Apply field-level Orgo-wins conflicts automatically, preserve unrelated intents and audit superseded changes.
- [x] Handle newer edits, lease ownership, uncertain responses/readback and blocked-operation recovery without duplicate writes.

## 5. Verification and release

- [x] Add reconciliation/lifecycle/worker tests for the design's acceptance cases and field privacy boundaries.
- [x] Verify migrations, locks and worker concurrency on PostgreSQL.
- [x] Test page refresh feedback, unified status filtering, selection across pages and unchanged access controls in the browser.
- [x] Run API/web checks and production builds appropriate to changed code.
- [x] Update CONTEXT.md and operating docs to replace the superseded behavior when implemented.
- [ ] Verify remote writes with an authorized test identity and edit-capable token before production enablement; record evidence.
- [x] Validate this proposal with OpenSpec strict validation.


Implementation evidence (2026-10-26): 472 API tests, 55 web unit tests and 20 browser regression tests passed locally.
API/web type checks, lint for changed code, and production builds were checked. The web unit suite needs a 15-second test timeout on this Windows host
for initial Svelte compilation. The PostgreSQL CI workflow passed on PR #73; Docker is unavailable locally and the installed client tools do not include initdb. The existing
PostgreSQL smoke test was extended to verify the new schema, discovery without
role grants, and repeat-refresh idempotence. No production credentials, write
flags or member data were changed. Remote conditional-write support and tenant
edit permission still require external verification.
