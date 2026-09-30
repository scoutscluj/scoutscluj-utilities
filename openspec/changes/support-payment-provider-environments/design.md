# Design: provider/environment payment targets

## Decisions

### Selection identity

The operational target is the pair `(provider, environment)`, not the provider alone. `membership_payment_settings` retains `active_provider` and adds `active_environment`. NETOPIA uses `sandbox | live`; Stripe uses `test | live`.

### Current configuration identity

`membership_payment_provider_configs` remains revision-based. Its partial unique index changes from one active row per provider to one active row per `(provider, environment)` pair. Saving credentials deactivates only older rows for the same pair.

### Existing data

After removing the old uniqueness constraint, the migration reactivates the most recently updated revision in every provider/environment partition. This recovers a previously configured live revision that the old provider-wide rotation logic marked inactive. The selected environment is backfilled from the latest configuration matching the selected provider, with the provider's non-live environment as a fallback when no configuration exists.

### Checkout stability

New checkouts resolve the currently selected pair and bind to its active configuration revision. Existing checkouts already carry `provider_config_id` and `environment`, so callback validation remains revision-stable.

### Administrator UI

The active-processor section renders four radio cards: NETOPIA Payments — Sandbox, NETOPIA Payments — Producție, Stripe — Test, and Stripe — Producție. Each card shows configured/unconfigured state and the masked key hint. Saving a credential form does not implicitly switch the active target.

