# Cotizație collection with NETOPIA

## Why
Cluj needs one auditable record of cotizație collected by card and bank, member allocations, and national transfers.

## What changes
- Public Romanian payment page, NETOPIA hosted checkout and authenticated notifications.
- Guest payments with numeric ORGO ID or uppercase card ID, validated against the active local-center obligation register before checkout.
- Period pricing, verified obligations, manual bank receipts and shared-transfer allocations.
- Admin/financial staff dashboard, corrections, national transfer records and explicit pending ORGO integration state.
- No automatic processing surcharge or live activation.

## Approval
User approved the PRD and NETOPIA implementation, then replaced the temporary unverified guest flow with local-register validation before checkout. See docs/product/prd-cotizatie-payments.md for the current access constraints.

## Impact
Additive database migration, API module, web pages and configuration. Existing authentication and finance-document roles remain unchanged. Sandbox POS signature, notification public key, and actual ORGO contracts are integration gates, not assumed credentials.
