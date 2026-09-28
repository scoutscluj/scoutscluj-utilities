# PRD: Cotizație Payments and National Settlement

Status: Approved by the user for NETOPIA implementation, with the amendments below.
Date: 2026-09-21.
Code baseline: main, 8669191; remote metadata refreshed during this review.

## Approved implementation amendments

- NETOPIA is selected; sandbox credentials were supplied privately and must never be committed.
- Only member-scoped ORGO login tokens are currently available. There is no administrative server token. Background roster lookup and national write-back remain unavailable until suitable access is supplied and verified; represent this explicitly rather than reporting synchronization success.
- Guest checkout is allowed without ORGO identity validation. Guests enter an ORGO numeric ID or card ID, choose a published fee plan, and acknowledge that staff must review the payment before it credits a member. No profile preview is promised. Preserve the submitted identifier separately from the verified beneficiary.
- Normalize card IDs to uppercase in the textbox and on the server. Numeric IDs and card IDs are distinct identifier types; never derive a numeric ID by stripping a card prefix.
- Guest identity validation can be added later without changing historical receipts. The earlier verified guest preview and automatic guest credit requirements below are superseded.
- Baseline prices remain until staff explicitly publish an approved change. Sandbox testing does not authorize live activation.

## Problem Statement

Centrul Local Cluj currently collects cotizație and activity fees through bank transfers. Volunteers identify the member, check the amount, track collection, forward the national share, and update Orgo. Family discounts and transfers covering several members make this work harder. Introducing cards alone will not eliminate bank transfers or duplicate payments.

The first release must simplify this year's cotizație collection while preserving a reliable record of money received, national amounts owed, transfers actually made, and Orgo's resulting status. Activity payments are a later phase; WSJ is no longer the pilot.

## Solution

Provide a Romanian cotizație page with two entry paths: sign in with Orgo and pay your own fee, or enter an exact Orgo identifier and confirm a limited identity preview to pay for someone else without login. Both paths resolve the same member and obligation. Collect one payment into Cluj's organizational payment account; do not split checkout between Cluj and the national organization.

An admin or Responsabil financiar can track all relevant Cluj members, mark bank payments as received with transfer notes, allocate a transfer across members, resolve exceptions, and confirm a national transfer batch. Confirming the batch queues the corresponding Orgo updates. Member payment, processor payout, national bank transfer, and Orgo confirmation are separate facts.

NETOPIA is the recommended candidate following review of Cluj's existing account and contract. This is a recommendation for acceptance, not a finalized provider selection. Stripe remains the researched alternative. Implement one processor for the pilot after confirming the commercial terms and sandbox behavior.

## Agreed Product Decisions

- Pilot cotizație for the current Orgo membership period; do not assume a calendar year or invent a due date.
- Orgo owns member identity, local-center affiliation, assigned fee plan, and membership period.
- National amount comes from the assigned Orgo plan. The baseline local amount equals the national amount.
- Cluj will manually set any additional RON needed in its published total after choosing a provider. No automatic fee calculation, percentage gross-up, or card-dependent checkout adjustment.
- Logged-in self-payment is supported. Guest payment using an exact Orgo ID supersedes the earlier self-only restriction. No guardian verification or family relationship checks are required for paying another member.
- Guests confirm limited identity information and cannot access plan labels, family relationships, or payment history.
- Both admins and Responsabil financiar can mark payments as received and add transfer details in notes.
- One bank transfer can be allocated across several members' obligations; unallocated money stays visible.
- Full collection settles the member's obligation in Resurse immediately, independently of national settlement.
- National transfers are performed outside Resurse. An explicit confirmation action records the transfer and triggers Orgo synchronization.
- Block checkout for paid obligations. Flag duplicate receipts for financial review; do not silently carry them to the next period or automatically refund them.
- Defer activity signup forms, CSV participation imports, and activity installments until after the cotizație pilot.

## User Stories

1. As a member, I want to sign in with Orgo and see my current cotizație amount and period, so that I can pay the correct obligation.
2. As a member, I want my existing Orgo plan to determine the baseline amount, so that family and social discounts are respected.
3. As a payer, I want to see the complete published total before checkout, so that payment has no surprise additions.
4. As a guest payer, I want to enter an exact Orgo identifier and confirm the intended person, so that I can pay for them without an account.
5. As a member, I want my family/social plan and payment history kept out of guest lookup results, so that paying for me does not expose my profile.
6. As a payer, I want one card transaction to Cluj for the entire obligation, so that I do not need a separate national payment.
7. As a payer, I want a clear success, pending, cancelled, or failed result, so that I know whether another attempt is needed.
8. As a member, I want confirmed payment to show as paid even if national settlement happens later, so that I am not asked to pay twice.
9. As a member who already paid by bank, I want that payment reflected in Resurse before checkout is offered, so that the transition respects earlier payments.
10. As an admin or Responsabil financiar, I want a Cluj member dashboard, so that I can identify unpaid, partially paid, paid, and exceptional obligations.
11. As an admin or Responsabil financiar, I want to mark a payment as received and add transfer notes, so that ordinary bank payments remain easy to record.
12. As an admin or Responsabil financiar, I want to allocate a shared transfer across several members, so that family payments are recorded once.
13. As an admin or Responsabil financiar, I want unallocated and excess money visible, so that discrepancies do not disappear into a paid checkbox.
14. As an admin or Responsabil financiar, I want to correct a mistaken allocation with a reason and preserved history, so that balances can be repaired without losing evidence.
15. As an admin or Responsabil financiar, I want to publish totals for each plan and period, so that the approved Cluj pricing can cover operating needs.
16. As an admin or Responsabil financiar, I want collected national shares listed separately, so that I know what remains to be forwarded.
17. As an admin or Responsabil financiar, I want to select members and confirm a national transfer with a reference and note, so that its total and membership allocation are traceable.
18. As an admin or Responsabil financiar, I want Orgo submission and approval outcomes visible per member, so that partial failures can be resolved.
19. As an admin or Responsabil financiar, I want retries to preserve successful updates, so that a repeated action cannot duplicate national fee records.
20. As an admin or Responsabil financiar, I want receipts, processor fees, and bank payouts kept distinct, so that net deposits are not mistaken for underpaid cotizații.
21. As an admin or Responsabil financiar, I want refund and dispute outcomes reflected with their national-settlement consequences, so that reversed funds are not reported as available.
22. As a reviewer, I want an audit trail of financial changes, so that I can identify the actor, time, reason, and affected records.

## Implementation Decisions

### Existing foundations and boundaries

Use the current SvelteKit frontend, NestJS API, and PostgreSQL/MikroORM persistence. Reuse existing Orgo identity links, application roles, and the central audit journal required by ADR 0004. Existing finance functionality centers on financial documents and accounting handoff; a fee obligation or incoming payment is not a Document financiar. Link supporting documents where useful without making document upload a prerequisite for marking a transfer paid.

The existing Orgo connection stores numeric user ID, card ID, and a profile snapshot. The current SSO client verifies login but does not persist API access/refresh credentials. A member cache must cover members who have never signed into Resurse, without creating authenticated accounts for guests or silently matching people by name/email.

Use explicit membership-finance authorization for Admin, FinanceManager, and SuperAdmin. The current role guard does not make Admin imply FinanceManager; do not globally broaden roles to implement this feature. A Moderator or activity coordinator gets no membership-finance access from that role alone.

### Amounts, plans, and periods

Current baseline, confirmed from the user's Orgo screenshot:

| Plan | National share | Local baseline | Baseline total |
| --- | ---: | ---: | ---: |
| Normală | 150.00 RON | 150.00 RON | 300.00 RON |
| Fam 1 | 150.00 RON | 150.00 RON | 300.00 RON |
| Fam 2 | 75.00 RON | 75.00 RON | 150.00 RON |
| Fam 3 | 37.50 RON | 37.50 RON | 75.00 RON |
| Socială | 50.00 RON | 50.00 RON | 100.00 RON |

Resolve the plan applicable to the membership period rather than infer family rank from payment order. Do not invent Fam 4 or other tiers. Missing/unrecognized plans and ambiguous periods require review before collection. If Orgo uses period-start pricing, honor that configuration instead of blindly using today's price.

Proposed configuration for acceptance: authorized finance users publish a final RON total per plan and period; the unchanged national share is retained separately, and the remainder belongs to Cluj. Start with the baseline values above. No additional amount is currently approved. Apply the published total equally to card and bank payments, consistent with the reviewed NETOPIA contract; manually configuring a card-only increase would still be a payment-method surcharge. This is a pricing constraint, not a claim that Resurse authorizes the organization to change its membership fee.

Store money in integer bani. Snapshot plan, period, national share, local share, total, and pricing version on an obligation/payment attempt. Publishing a new price or synchronizing a changed plan must not silently rewrite a paid obligation or an already confirmed transaction. Unpaid affected records enter an explicit review/repricing flow, with stale quotes invalidated before new checkout.

Recommended pilot behavior: a card payment covers the full remaining balance of one obligation. Bank receipts may partially cover it. The full-installment rule previously agreed for WSJ is not assumed to prohibit real partial bank receipts for cotizație.

### Member and guest payment

Show the period, amount due, and payment action after resolving identity. The member page also shows their own receipts and status. The guest path accepts an exact identifier only, with no name search or member directory. Confirm first name, last-name initial, and Cluj affiliation before showing the payable total.

Treat the public identifier as distinct from the canonical API user ID until its mapping is verified against real tenant data. If both card ID and API ID are accepted, label them explicitly and never guess ambiguously.

Guest lookup must be rate-limited and return only the minimum confirmation fields. Do not expose dates of birth, addresses, contact data, plan labels, history, or national remittance status. The payable amount can itself suggest a discounted tier; hiding the label does not eliminate that inference. Keep this residual limitation visible for acceptance of the guest flow.

Issue short-lived opaque payment references bound server-side to the resolved member, obligation, amount, currency, and environment. Recheck eligibility and outstanding balance before starting checkout. Browser-supplied prices, member IDs, redirects, and status flags are not trusted. A guest sees only the status of their own payment attempt, not the member's ledger. Collect payer contact details only as required for checkout/confirmation, separate from the beneficiary.

Use a provider-hosted card collection flow; Resurse must not receive or store card numbers or security codes. Authenticate callbacks using the provider's supported verification scheme, check merchant/environment, amount, currency, and internal reference, and persist the event before acknowledging it. Sandbox proof is required for the chosen NETOPIA callback verification and hosted flow.

An attempted checkout or browser return is not a receipt. Only a verified provider success creates the receipt/allocation. Replayed, concurrent, delayed, and out-of-order events must not duplicate credits or regress a confirmed transaction. A checkout-start timeout has an unknown outcome; reconcile it before creating a fresh charge. Reuse a pending attempt where supported. If a valid late payment exceeds the remaining balance, preserve the receipt and flag excess for review.

### Manual bank payments and transition

Provide a simple `Marchează ca plătit` action that creates a recorded receipt/allocation, not an unaudited Boolean. Proposed minimum inputs are amount received, receipt date, and transfer-details note; support a separate bank reference when available. Record the actor and entry timestamp automatically.

For a shared transfer, record it once and allocate amounts to several member-period obligations. Allocations cannot exceed the receipt amount. Unallocated funds remain explicit. A second entry with matching bank evidence raises a duplicate warning, without collapsing genuinely distinct equal-value transfers.

At launch, synchronize the eligible Cluj roster, assigned plans, periods, and available Orgo payment evidence. Finance staff reconcile existing collections and remittances before exposing checkout. Orgo's national paid status alone does not prove that Cluj collected its local share; never automatically mark the entire combined fee paid from that flag. Unresolved existing records are held for review, not charged again by default.

Record corrections through audited reversal/reallocation, preserving original receipts. Do not delete paid obligations. A refund/chargeback or correction affecting a national batch creates a reconciliation exception; it cannot erase the bank transfer already made. No automatic next-period credit, automatic refund, or automatic reversal of Orgo national approval.

### Tracking and national settlement

Dashboard rows identify member, period, plan (authorized staff only), expected total, receipts allocated, balance, payment method, transfer notes, national share, batch, and Orgo result. Proposed filters: name/exact ID, period, paid/unpaid/partial, unallocated/excess, national transfer pending, and Orgo errors. Basic CSV export is recommended for reconciliation; automated bank-file ingestion is not required for this pilot.

Maintain independent states:

| Dimension | Meaningful states |
| --- | --- |
| Member obligation | Needs review, unpaid, partially paid, paid; excess/refund/dispute flags |
| Card attempt | Created, pending, succeeded, failed, cancelled/expired, unknown outcome |
| Processor payout | Awaiting payout, reconciled, discrepancy |
| National settlement | Not transferred, draft batch, transfer confirmed, correction required |
| Orgo synchronization | Not queued, queued, submitted/pending approval, confirmed, failed, unknown outcome |

The member is paid when confirmed allocations cover their obligation. Fees withheld by the processor are a Cluj expense, not a member shortfall. Processor settlement into Cluj's bank is separate from the original gross receipt.

`Confirmă transferul și actualizează ORGO` previews selected members, periods, national amounts, and the batch total. Require the recorded bank transfer date and reference/note. Prevent reuse of an already settled member-period national share. The bank transfer itself remains manual. Do not send NETOPIA's net payout or Cluj's manually added amount as the national fee amount.

Persist the confirmed batch and its Orgo work items atomically. Retry individual failures without resending successful items. If Orgo accepted a request but the response was lost, reconcile remote evidence before another create. If the API offers neither an idempotency key nor a reliable way to identify an earlier write, hold unknown outcomes for financial review.

Only display Orgo `confirmed` after verifying the corresponding member and period's final result. An accepted request or pending national approval is not the same as paid validity in Orgo. Failure to synchronize must never turn a settled Resurse obligation back into unpaid.

### Orgo integration

Use a dedicated server-side Api-Token with only the owning account permissions required for Cluj operations. OAuth member tokens may support member actions but the documentation caps them to member permissions; do not assume they can approve national payments. Do not treat the legacy successToken as an API credential.

The documentation establishes member/price resources, fee records, and administrative approval workflows. It does not yet prove the exact request sequence that records every selected member's national period using Cluj's actual permission level. A generic FeePayment create response alone is insufficient evidence. Before enabling live collection, verify member-ID mapping, plan/period fields, local-center filtering, write permissions, member allocation, approval effects, and read-back reconciliation in the actual supported tenant integration. Do not use guessed status integers from generated examples.

Orgo's documented native local/national Stripe flow charges those two fees separately. Our agreed one-payment-to-Cluj workflow therefore needs a Resurse-owned combined obligation even if Stripe is chosen. Keep processor integration separate from Orgo synchronization.

Show last synchronization time and failures to staff. Missing or stale pricing/eligibility must not produce guessed charges. Existing receipts, manual recording, and retry queues remain usable during an Orgo outage. Do not expose server credentials to guest or member browsers.

### Provider and accounting

NETOPIA recommendation is conditional on successful hosted checkout, authenticated notifications, recovery of uncertain payments, and documented refund handling in sandbox. The existing account must have the Resurse payment channel approved/activated. Do not assume an existing account activates every domain or activity automatically.

Use a small provider boundary for creating checkout, validating events, and reconciling status where supported. Persist provider identity and transaction references. Implement one provider, not a multi-provider routing system. Dashboard refunds with audited reconciliation are the proposed pilot fallback because NETOPIA's public API specification labels some operations as future functionality.

Track gross collected, actual processing costs (including provider VAT where applicable), payout fees, net received, national owed, and national transferred separately. Provider estimates are not accounting facts. Reconcile to provider settlement statements and bank evidence; a net payout is not a second member payment. Automatic accounting invoice issuance and Keez integration are outside this slice.

## Testing Decisions

These are proposed acceptance seams for review with this PRD, not tests already executed.

- Test public API behavior and persisted balances through NestJS HTTP/service boundaries, using the existing Jest and Supertest tooling. Existing finance service, Keez adapter, user, role-guard, and session tests are prior art. Mock external providers for repeatable tests; use real PostgreSQL transactions for allocation and concurrency assertions rather than relying only on mocked repositories.
- Verify all five supplied plan labels, period-start pricing, exact bani arithmetic, manually configured totals, preserved national amounts, and equal totals across payment methods.
- Verify authorized staff can record a transfer with notes, split it across obligations, retain unallocated money, and correct it with audit evidence. Unauthorized roles cannot read or mutate the ledger.
- Verify guest exact-ID matching, ambiguous/unknown/non-Cluj IDs, missing plans, lookup rate limits, minimum response fields, opaque-reference expiry, and tamper resistance.
- Verify repeated checkout clicks, provider-start timeouts, invalid signatures, wrong amount/currency/environment, duplicate callbacks, reversed event order, delayed success, and simultaneous bank/card collection. Each actual receipt is represented once; excess remains visible.
- Verify period changes and price updates cannot alter an existing successful payment or charge a stale quote without reconfirmation.
- Verify existing national-paid evidence does not incorrectly settle the local share during migration.
- Verify national batches total the exact national amounts, reject duplicate allocation, survive partial Orgo failure and timeout-after-success, and distinguish pending approval from confirmed membership validity.
- Verify refund/dispute/correction after national remittance creates a visible reconciliation exception without deleting financial history.
- Run provider sandbox end-to-end checks for hosted card collection, authentication challenge, success, decline, cancellation, callback retry, reconciliation, and full/partial refund handling. Confirm amount units experimentally against the actual API.
- Exercise the Romanian UI on mobile and desktop with an ordinary member, guest, admin, and Responsabil financiar. Demonstrate one complete collection-to-national-confirmation journey before broad rollout.

## Pilot Acceptance and Rollout

Start with reviewed members representing Normală/Fam 1, Fam 2, Fam 3, and Socială where present. Expand to the full local center only after matching Resurse receipts to provider and bank evidence and completing a national settlement batch or explicitly verifying the required national-approval step.

The pilot succeeds when every collected payment maps to the intended member-period; card and bank receipts coexist without double credit; staff can resolve a shared transfer using the app; national amounts and batch membership reconcile exactly; and every Orgo item is confirmed or has a visible actionable state. Record manual effort and exceptions during the pilot to judge whether procedures became simpler. No numerical adoption target or launch deadline has been agreed.

## Out of Scope

- WSJ payments and historical WSJ installment migration.
- Activity signup forms, approval workflows, CSV participant imports, and activity installments in the first release.
- Automatically splitting one checkout between two merchant accounts or initiating the national bank transfer.
- Automatic card-fee calculation or card-only surcharge.
- Membership auto-renewal subscriptions, saved-card charging, and automatic arrears collection.
- Guardian verification, public member search, or changing Orgo family/social plans from guest checkout.
- A replacement national member database, general bank-feed integration, automatic fiscal invoices, and new Keez workflows.

## Further Notes and Unresolved Checks

The 25-question interview is complete. Resolve the following through evidence and review of this draft, without treating unconfirmed assumptions as accepted requirements:

1. Final provider selection. NETOPIA is recommended, not yet explicitly chosen by the user.
2. Screenshot rate versus contract and amendments: confirm 1.19%, zero fixed fee, VAT treatment, and current payout charges using an invoice/settlement statement or NETOPIA confirmation.
3. Final published amount for every tier and period, including any Cluj addition. Until approved, baseline totals apply; no default extra amount is invented.
4. Exact current Orgo period boundaries, active/fee-eligible member rules, public identifier mapping, and the working API contract for plan reading and national write-back. Endpoint names in generic documentation do not establish tenant permission.
5. Whether national approval must occur after Cluj submits the batch. Reflect the real workflow; do not request broader authority merely to bypass it.
6. Initial reconciliation of payments already collected and national shares already forwarded, including price changes during the transition.
7. NETOPIA channel activation, hosted checkout and authenticated callbacks, uncertain-payment reconciliation, and the operational refund owner. Proposed default: refunds remain with existing authorized NETOPIA account operators; Resurse admins/finance record the result.
8. Guest privacy limitation from exposing a payable amount, and the final minimum identity preview.
9. Due date, reminder policy, and launch date were not specified. No reminder campaign or automatic penalty is included.

After PRD acceptance, prepare and validate the repository's OpenSpec proposal and implementation tasks, resolve integration gates, and implement the approved scope. Do not publish a ready-for-agent issue, deploy, or enable live payments on the strength of this draft.

## Research References

- [NETOPIA contract review and cost scenarios](netopia-contract-review.md).
- [Orgo authentication](https://orgo.space/docs/api-reference/concepts/authentication).
- [Orgo documentation index](https://orgo.space/docs/llms.txt) lists member fee-price resources; exact tenant response remains to be verified.
- [Orgo chapter fees](https://orgo.space/docs/platform/local-group-fees/create-local-fees) documents separate local/national checkout and validity, plus batch approval roles.
- [Orgo external payment recording](https://orgo.space/docs/platform/fees/record-payment) distinguishes fee-period recording from invoices and general payment records.
- [Orgo fee creation](https://orgo.space/docs/api-reference/feepayment/create-a-fee-payment) and [approval](https://orgo.space/docs/api-reference/feepayment/approve-a-fee-payment) require validation of member-period semantics.
- [NETOPIA v2 API](https://doc.netopia-payments.com/docs/payment-api/) and [published specification](https://secure.sandbox.netopia-payments.com/spec).
- [Stripe Checkout sessions](https://docs.stripe.com/api/checkout/sessions/create) and [webhooks](https://docs.stripe.com/webhooks).
