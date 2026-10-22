# Rollout and recovery

The approved release runs `Migration20261022000100` through the existing production migration step before the new API starts. The migration is transactional and uses the existing finance-before-member lock order. Fixed catalog IDs are deterministic. MikroORM records successful application and skips a second run; an aborted transaction can be retried.

The migration retains the full original member, unit and assignment rows in `member_organization_migration` and leaves legacy unit rows intact. It copies existing subgroups into `scout_subunits`, records Orgo source aliases and initializes primary affiliation once. It does not change financial evidence, receipt allocations, member IDs, Orgo IDs or progression enablement. Initial affiliation remains centrally reviewable at `/units/structures`; contradictory/missing categories remain in the De verificat filter. Legacy named roots can be explicitly reconciled as subunits from that preview, without guessing that every imported root is a new subgroup.

Only existing active Cluj-linked accounts with Admin/SuperAdmin are backfilled as explicit central member administrators. Other central access requires an active Cluj Council assignment. Unlinked accounts and local administrators are not promoted. Duplicate chiefs for the same consolidated unit are ended, with their original mandates retained in the snapshot for central reconciliation. Cross-structure responsibility evidence remains stored, but does not grant cross-structure access. Manually delegated roots require a still-valid central issuer; local descendants require an active parent mandate.

After activation, central administrators review initial affiliation/categories, reconcile legacy source names when appropriate, and reappoint ambiguous unit chiefs. These data review operations do not require delaying the code deployment.

## Recovery

Prefer a forward fix on the additive schema. Do not automatically run `migration:down` or deploy the previous application against the new constraints: its mutable-unit operations no longer satisfy the fixed-catalog model.

If restoring the old model becomes necessary, enter maintenance mode, take a fresh database backup and export the current member/unit/subunit/assignment/source-link tables. Compare current records with `member_organization_migration` by member/assignment ID, preserving every post-release change and all financial tables. Prepare and validate a reconciliation migration on a disposable copy before restoring old references and constraints. Historical snapshots are evidence for this migration, not permission to overwrite current rows. Resume writes only after reference, identity, assignment, outbox and financial-total checks pass.

## Verification

- API HTTP/security, organization/delegation, Orgo and financial regression suites.
- TypeScript, ESLint, formatting, API build, web build and Svelte checks.
- `apps/api/test/member-organization-migration.mjs` executes the actual migration SQL on temporary embedded PostgreSQL, including transaction rollback/reapply, accent matching, contradictory category review, central/local distinction, immutable catalog constraints and unchanged financial references. `PGLITE_RUNTIME_PATH` supplies the temporary test-only dependency; it is not part of the production runtime.
- `apps/api/test/members-postgres.smoke.ts` in CI runs all migrations twice against disposable PostgreSQL and exercises real persisted member, subgroup, transfer, lifecycle and finance operations.
- Browser regression scenarios cover shared/read-only workspaces, category filtering without subunit assignment, fixed-unit controls, subunit dialogs and desktop/mobile layouts.

The user requested production publication without waiting for deployment completion. After PR checks pass, merge and report the deployment run as started; do not describe production activation as confirmed.
