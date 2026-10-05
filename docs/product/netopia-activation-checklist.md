# NETOPIA activation checklist for membership fees

Status: implementation ready for legal review; external merchant checks remain.

## Website content

- [x] Public description of the membership-fee service.
- [x] Final amount and RON currency shown before checkout.
- [x] Legal identity, address, telephone and email shown in the global footer and contact page.
- [x] Terms and conditions, payment methods and provider role.
- [x] Payment-confirmation policy explaining that there are no physical goods.
- [x] Cancellation, withdrawal and refund policy.
- [x] Privacy and GDPR policy.
- [x] Required acceptance of the legal documents before checkout, with version and timestamp retained.
- [x] Link to the current ANPC SAL information.
- [ ] Legal review and confirmation of the entity data displayed on the site.
- [ ] Official NETOPIA, Visa and Mastercard visual assets or the widget generated in the merchant account.
- [ ] Official current ANPC SAL pictogram placed in the site navigation/footer.

## Merchant and deployment evidence

- [ ] Confirm with NETOPIA that statutory membership fees are accepted for this point of sale. They are not donations; the site and checkout must describe them consistently as `cotizație statutară`.
- [ ] Confirm that the NETOPIA contract holder is still the entity with CIF `17637149`, rather than a successor or newly registered entity.
- [ ] Confirm that the production domain is owned or controlled by the contracted association.
- [ ] Deploy the site exclusively through HTTPS and verify the full certificate chain.
- [ ] Add the production website, return URL and notification URL in the NETOPIA point of sale.
- [ ] Enter the environment-specific API key and POS signature in the financial administration page; configure the common `NETOPIA_IPN_PUBLIC_KEY` separately on the API service.
- [ ] Run a sandbox payment, failed payment, callback replay and refund/reconciliation exercise.
- [ ] Ask NETOPIA to review and activate the point of sale before enabling live card payments.

## Stripe activation and processor selection

- [x] The financial administration page shows both supported processors and which one is active.
- [x] A processor can be selected only when its required server-side configuration is present.
- [x] The processor selected when checkout starts is retained for that payment, including retries and callbacks.
- [x] Stripe Checkout uses the amount calculated by the application, RON currency and signed webhooks.
- [x] Provider credentials can be entered by authorized staff and are encrypted in PostgreSQL with the application's KMS key.
- [x] The administration API never returns stored credentials; it exposes only configuration state and a four-character hint.
- [x] Credential rotation retains encrypted historical revisions for callbacks from checkouts already in progress.
- [ ] Enter the Stripe secret key and webhook signing secret in the financial administration page.
- [ ] Register `POST /api/membership/stripe/notify` as the Stripe webhook endpoint.
- [ ] Subscribe the endpoint to successful, failed and expired Checkout Session events.
- [ ] Run test-mode successful, failed, expired, duplicate-callback and reconciliation exercises.
- [ ] Verify that NETOPIA remains active until the administrators deliberately switch new payments to Stripe.

Changing the active processor affects only checkouts created after the change. Existing checkouts continue to be verified and reconciled by the processor recorded on them.

## Current public identity source

The initial values displayed by the application come from the signed NETOPIA contract supplied for review and the public contact page of Scouts Cluj. The registry number comes from the public Registry of Associations and Foundations. These values require confirmation by the association before production activation.

The former EU Online Dispute Resolution platform has been discontinued. The application links to the current Romanian ANPC SAL procedure instead of presenting the obsolete SOL platform as available.
