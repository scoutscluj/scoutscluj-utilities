# Separate payment configurations by environment

## Why

Saving NETOPIA Sandbox currently deactivates NETOPIA Production, and the same limitation applies to Stripe Test and Production. Financial staff need to keep all four credential sets configured and explicitly choose which exact provider/environment combination receives new checkouts.

## What changes

- Store one current encrypted configuration for each provider/environment pair: NETOPIA Sandbox, NETOPIA Production, Stripe Test, and Stripe Production.
- Present those four combinations as distinct choices in the active-processor panel, with clear Romanian environment labels and configuration status.
- Record both the active provider and active environment for new checkouts.
- Keep configuration saves independent: rotating one environment does not deactivate credentials for another environment.
- Recover the latest existing encrypted revision for each environment during migration, including a production revision that was deactivated by a later sandbox save.
- Preserve checkout-to-configuration revision binding so existing payments continue to validate with their original credentials.

## Approval

Approved by the user on 2026-09-30.

## Impact

- Additive/backfill database migration for payment settings and the partial uniqueness rule on provider configurations.
- Internal membership API response and selection payload include environment.
- Admin payment-processor UI and membership summaries distinguish the four selectable targets.
- No credential values are exposed, copied, or decrypted by the migration.

