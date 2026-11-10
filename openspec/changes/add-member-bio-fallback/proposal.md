# Member details in Orgo Bio

## Why

Grade changes cannot synchronize without an Orgo custom-field mapping, and local structure affiliation has no profile field equivalent. The user approved using a readable section in Bio for these values while retaining the existing biography.

## What Changes

- Use the dedicated grade field when configured; otherwise synchronize a readable Romanian grade in Bio.
- Queue independent Bio synchronization on structure transfers and affiliation confirmation, without treating it as confirmation of Orgo roles or unit membership.
- Merge into the latest remote biography, replace only the generated section, and require readback confirmation.
- Keep other local fields and internal notes outside this fallback.

## Impact

No database migration. Existing unsupported grade operations can use the existing reviewed retry flow after deployment. Existing structure changes require a new affiliation edit to queue a Bio operation; this change does not silently backfill profiles or mark prior organization operations as synchronized.
