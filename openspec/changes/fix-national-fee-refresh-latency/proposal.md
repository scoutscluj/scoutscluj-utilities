# Verify national credit before payment and decouple member rendering from Orgo

## Why
Membership ID lookup and checkout could quote a national amount already paid in Orgo. Opening a member or fee dialog waited for four sequential external requests, with production page durations reaching 15.7 seconds. The unit registry did not request national verification on each opening.

## What changes
- Verify the current national credit before ID lookup, the authenticated payment view and checkout calculate the outstanding amount. Confirmed partial national credit counts once, within the national amount; failed checks or pending national approval block a new online payment.
- Render saved member details and fee dialogs immediately, then update fees separately without invalidating edited forms.
- Check fee-visible members on each registry load, in bounded batches with three concurrent verifications and isolated ORM contexts. Recheck authority before financial mutation.
- Deduplicate concurrent identical remote reads; later openings request fresh verification.
- Load a scoped context for a single member instead of serializing the whole roster.

## Authorization and rollout
The user requested these changes and explicitly requested production publication on 13 November 2026. No schema migration or new Orgo write permission is required. Existing overlap reconciliation remains mandatory. Online membership payment now stops with a retry message if server-side Orgo verification is unavailable. Reverting the application leaves imported evidence intact.
