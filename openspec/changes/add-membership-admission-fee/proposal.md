# One-time membership admission fee

## Why
New members pay a one-time 55 RON admission fee, independently of annual membership dues. Staff need to identify admission payments made in the selected collection period.

## What changes
- Small Romanian link on the dues page opens the admission flow using the existing hosted payment providers.
- Verify the existing ORGO/card ID; charge exactly 5500 bani and preserve terms acceptance, callback verification and receipt history.
- Prevent repeated collection across periods for the same canonical ORGO identity and block uncertain attempts.
- Display an admission badge only for a confirmed, unreversed payment in the selected period. Admission receipts never reduce dues or national settlement balances.

## Scope authorization
Requested directly by the user on 2026-10-19. User confirmed that new members already have ORGO IDs. This is a bounded extension of existing checkout, with an additive purpose column; no provider activation or deployment is included. User subsequently selected account creation within the last 90 days as the eligibility rule; there are no legacy members being newly added to ORGO. Import dateCreated (documented at https://orgo.space/docs/api-reference/user/get-a-user); missing or invalid dates require financial review.
