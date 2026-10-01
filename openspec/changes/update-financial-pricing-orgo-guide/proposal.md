# Uniform cotizație pricing, delegated ORGO marking and financial guide

## Why
Administrators need a clear financial workflow, processor-specific cost coverage, and verified national membership marking. The user approved equal adjusted pricing for card and bank, delegated use of the logged-in financial user's ORGO token, an in-app nontechnical guide, guest-only footer and production rollout.

## What Changes
- Publish processor-inclusive cotizație totals rounded upward to multiples of 5 RON, with configurable NETOPIA and Stripe fees and preserved historical financial amounts.
- Queue national marking under the financial actor's encrypted OAuth token; read back the exact ORGO period and avoid duplicate submissions after uncertainty.
- Add Admin → Financiar → Ghid financiar and clear per-member ORGO states and recovery actions.
- Hide the footer for authenticated users.

## Impact
Membership payment settings and national items receive additive columns. Active unpublished/unpaid prices are adjusted at rollout. Existing allocations, open checkouts and national transfers retain their recorded amounts. Existing national items are not automatically submitted retrospectively. No bank transfer, refund or test payment is executed by deployment.
