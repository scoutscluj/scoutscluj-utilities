# Financial pricing and national ORGO marking

The user approved one common adjusted price for card and bank and explicitly requested the logged-in user's ORGO token for national marking. The administrator-facing operating manual lives at `/admin/finance/guide`.

## Pricing evidence (checked 2026-10-01)

- NETOPIA's current published standard: 1.19% + 0.30 RON: https://netopia-payments.com/servicii/plati-online-cu-cardul/
- Stripe Romania standard EEA cards: 1.5% + 1 RON; other card categories differ: https://stripe.com/en-ro/pricing
- These defaults are editable contract assumptions, not proof of the merchant's negotiated effective fee. Include applicable taxes in configured rates. See the contract's equal-pricing requirement in `netopia-contract-review.md`.
- Gross-up calculation: `ceil((baseBani + fixedBani) * 10000 / ((10000 - basisPoints) * 500)) * 500`. Zero base remains zero. Preserve base separately to avoid compounding rounding when fees change.

## ORGO protocol evidence

The official operating guide https://orgo.space/docs/platform/fees/record-payment distinguishes national financial permissions, marking as paid, and pending national approvals. The public client deployed at https://membri.scout.ro/ was inspected read-only on 2026-10-01. Its history selection uses:

- GET `/api/v1/users/{memberId}`; beneficiary's national price and local center.
- GET `/api/v1/tenants?appHost=membri.scout.ro`; `settingFeatures.fees.productUuid`.
- GET `/api/v1/products/{productUuid}`.
- GET `/api/v1/fee-history/tenant/{productId}?uid={memberId}`; exact `intervalId` of `YYYY-MM-DD_YYYY-MM-DD`, `status`, `paid`, `unpaid`, `isPending`.
- POST `/api/v1/fee_payments` with `userId`, `fees: {"memberId:intervalId": amountRON}`, `type: "tenant"`, `method: "check"`, `markAsPaid: true`, `productPriceId`, and national `productId`.

The adapter uses the OAuth bearer token of the financial actor, never server-token fallback. Backend permissions remain authoritative. It does not approve national batches through undocumented APIs. Only exact-period paid history with no pending flag confirms synchronization. No production financial transaction is created for testing.

## Recovery and concurrency

Persist actor, attempt time and ORGO state on each national item. Financial mutations and job claims share PostgreSQL advisory lock 9212026; network requests execute outside the lock. Recheck staff role and collected balance before a write. A fresh claim has a two-minute lease. An expired claim or pending approval is read back only. Failed/unknown items require explicit staff action. An uncertain write can be resubmitted only after absence verification with evidence. Concurrent financial corrections are never overwritten by the returned ORGO state. Legacy items are not automatically queued by migration.

OAuth token storage honors an explicit `ORGO_TOKEN_ENCRYPTION_KEY`. If absent, HKDF-SHA256 derives a domain-separated encryption key from the production session secret (minimum 32 characters). AES-GCM and per-owner associated data preserve ownership. Reauthentication captures tokens for users who logged in before encrypted token capture was enabled. Rotating either encryption source requires reauthentication; no plaintext credentials are logged.
