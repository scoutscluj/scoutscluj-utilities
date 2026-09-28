# NETOPIA Contract Review for Cotizație

Reviewed: 2026-09-21. Product/integration analysis of the supplied documents, not a determination that no subsequent amendments exist.

## Evidence and recommendation

The user supplied a 24-page NETOPIA contract for the Cluj organization and a screenshot of the account's commission screen. Relevant contract pages were text-extracted and visually checked. Sensitive signature, personal, and bank details are intentionally omitted from this repository note; the source PDF remains in the user's Downloads folder.

Recommend NETOPIA as the pilot candidate because Cluj already has an account and the displayed tariff has no fixed per-payment charge. Provider selection remains for PRD acceptance. Commercial confirmation and sandbox verification are still necessary.

| Source | Card processing | Settlement |
| --- | --- | --- |
| Uploaded account screenshot | RON, any card, one payment, 1.19%, fixed 0 EUR | 3 days |
| Supplied contract, Annex 1 art. 4.1, p. 18 | Ordinary individual and business cards: 0.99% + 0.30 RON; VAT added. Fixed charge is footnoted as payment-confirmation SMS | See Annex 1 art. 5 |

Do not combine the screenshot percentage with the PDF's fixed charge, or present either as definitively superseding the other. Main-contract art. 3.3 (p. 3) allows tariff changes with 15 calendar days' notice. A newer configuration may explain the difference. The screenshot does not establish VAT inclusion or show bank payout fees. Check recent invoices, settlement reports, or amendments.

## Payment pricing and the requested manually set total

Main-contract art. 4.2.3, continued on p. 5, requires equal prices and prohibits passing NETOPIA processing charges to these payers as an additional fee. Annex 1 art. 2.2.2 (p. 16) repeats equal pricing and conditions across payment methods and prohibits a minimum card purchase amount.

A manually set card-only uplift has the same contractual issue as an automatic surcharge. Proposed product treatment: Cluj approves a published membership total per plan/period that applies across payment methods. Keep the national obligation unchanged and record the remainder as Cluj's component. No amount has been approved yet. This does not itself authorize a fee change under the organization's rules, nor characterize the membership payment's tax treatment.

## Settlement, refunds, and integration obligations

- Annex 1 art. 5.1 (p. 19): bank settlement is net of processing fees, payout charges, applicable VAT, refunds, and chargebacks. Preserve gross member credit separately.
- Art. 5.2 (p. 20): three calendar days counted from the working day following processing; a non-working settlement date moves to the next working day. The screenshot's shorter “3 days” label should not be interpreted as an unconditional 72-hour guarantee.
- Art. 5.3: minimum settlement is 100 RON for RON-only processing. Unsettled balances carry forward. The contract has different thresholds for mixed-currency processing, outside this pilot.
- Art. 5.4: 5 RON for 100–999.99 RON transferred; 6 RON for 1,000–49,999.99; 17 RON above 50,000; VAT added. These are per payout, not per member. The exact 50,000 boundary is not explicit in the printed table. Current terms should be verified rather than inferred from conflicting public support pages.
- Art. 5.5–5.7: monthly fee invoices are provided through the platform and treated as paid through withholding. Avoid recording the invoice as a second cash payment.
- Art. 3.2.1–3.2.4 (p. 16): the organization decides refunds, which can be initiated through the merchant account; sufficient balance or replenishment is required.
- Art. 3.2.5 (p. 17): normally the percentage processing commission is returned on refund; fixed/special fees are not. A Shopify exception exists and is irrelevant to the proposed native integration. Do not assume an exact partial-refund formula without current confirmation.
- Art. 3.3 (p. 17): disputed funds may be held and supporting evidence requested. Preserve member, payment, period, confirmation, and correction records. A reversal after national remittance requires reconciliation, not deletion of the batch.
- Main-contract art. 4.2.2–4.2.3 (p. 4) and art. 4.3.3 (p. 5): enroll each channel, display merchant identity, prices, terms, refund/contact/privacy information, and complete technical activation. Existing account ownership alone does not prove Resurse is activated.
- Annex 1 art. 2.2.3 (p. 16): do not collect/store card credentials in Resurse. Use provider-hosted card collection.

## Cost scenarios

Budget assumption only: screenshot rate 1.19%, no fixed charge, and 21% VAT added as in the contract. Actual invoices determine costs; this does not assume VAT is recoverable. Rounding is illustrative per payment.

| Baseline membership payment | Processing before VAT | Estimated processing including VAT |
| --- | ---: | ---: |
| 300 RON (Normală / Fam 1) | 3.57 RON | 4.32 RON |
| 150 RON (Fam 2) | 1.785 RON | 2.16 RON |
| 75 RON (Fam 3) | 0.8925 RON | 1.08 RON |
| 100 RON (Socială) | 1.19 RON | 1.44 RON |

For 250 payments of 300 RON, the aggregate estimate is about 1,080 RON including VAT, before payout fees, compared with 1,375 RON at Stripe's published standard EEA card rate of 1.5% + 1 RON. Saving is about 295 RON before NETOPIA payout fees. Actual membership cost requires the real mix of plans; 250 full-price members is only the earlier comparison scenario.

For the previously discussed broader scenario (375,000 RON across 650 transactions), screenshot-rate NETOPIA processing would be approximately 5,399.63 RON including VAT, before payouts, versus 6,275 RON for Stripe standard EEA cards. Approximate difference: 875.38 RON before payout fees and actual card mix. Activity payments remain outside the pilot.

At 21% VAT, the printed contract's 5/6/17 RON payout charges become 6.05/7.26/20.57 RON respectively. Payout frequency and amount distribution are not known, so a total settlement cost is not invented. If the displayed 1.19% already includes VAT, these budget estimates overstate NETOPIA cost; obtain invoice evidence before final comparison.

## Technical verification before launch

NETOPIA recommends v2 JSON/API-token integration. Its public documentation supports notifications and a sandbox, but some operation descriptions (including status/refund operations) still say future availability. Documentation alone is not proof these work for Cluj's account.

Demonstrate provider-hosted checkout, correct RON units and rounding, authenticated notification verification, amount/reference checking, repeated notification handling, and recovery after a lost response. Record external transaction IDs. Use the merchant dashboard for refunds until API behavior is proven. Do not treat a browser redirect or an unsigned JSON callback as confirmation.

## Sources

- Supplied private contract: `attachment; filename=Contract.595511.pdf`, pages 3–5 and Annex 1 pages 15–20. No contract copy or private account data is committed with this note.
- User-supplied NETOPIA commission screenshot: 1.19%, fixed 0 EUR, RON, 3 days.
- [NETOPIA API version guidance](https://doc.netopia-payments.com/docs/payment-api/).
- [NETOPIA merchant API specification](https://secure.sandbox.netopia-payments.com/spec).
- [NETOPIA refund guide](https://support.netopia-payments.com/hc/ro/articles/44149405027089--Ghid-pentru-procedura-de-restituire-a-fondurilor-c%C4%83tre-clien%C8%9Bi).
- [Stripe Romania pricing](https://stripe.com/en-ro/pricing), researched during this session.
- [ANAF standard VAT guidance](https://static.anaf.ro/static/10/Anaf/AsistentaContribuabili_r/Cotele_de_TVA_09.2025.pdf): 21% standard rate from August 2025; applied here to the provider-charge scenario, not to the cotizație itself.
