# Resolve membership reviews from the registry

## Why
Paid members whose valid ORGO plan changes remain blocked without an action to accept the corrected plan while preserving receipts.

## What Changes
- Add a reason-specific review dialog beside `De verificat` in the membership registry.
- Preview current ORGO data and the period tariff, allocated payments, remaining balance, and blockers.
- Let financial staff confirm eligible ORGO data with a required explanation and audit trail. Derive the payment status from the resulting balance.
- Keep surplus payments, unresolved payment reviews, invalid/missing ORGO data, and incompatible national transfers blocked with links to the relevant workflow.
- Revalidate the preview at confirmation; preserve all receipts, allocations, and national transfer history.

## Approval
The user approved recalculation from the ORGO plan while preserving payments, with surplus or incompatible national transfers remaining under review, in this chat on 2026-10-19.

## Impact
Membership API, shared finance form actions, membership registry, operator guide, and regression tests. No database migration.
