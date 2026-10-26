# Actor-token fallback for member writes

## Why
The configured server token reads Orgo but cannot edit members. The user explicitly
requested using the signed-in user's token when server access cannot perform the write.

## What Changes
Prefer enabled server writes; on disabled server writes or explicit HTTP 401/403,
use only the original operation actor's encrypted OAuth access token. Recheck the
actor's current local authorization and target center, apply the same baselines,
readback, retries and field mappings, and record the credential mode in audit.
Never use another user's token or an SSO successToken. A timeout/5xx does not switch
credentials or trigger a second write. Missing/revoked OAuth prompts reauthentication.
Existing blocked operations retry with their saved actor. An authorized administrator
may explicitly retry an operation as themselves; this rebind is audited.

## Approval
The user explicitly authorized fallback and earlier requested production release
when work is complete. This supersedes the previous server-only member write rule.


## Live evidence
On 2026-10-26 the saved actor OAuth token read the canonical blocked member with
HTTP 200. A single empty PATCH on the same record returned HTTP 403. No profile
fields were changed. The fallback remains subject to Orgo permissions; current
actor credentials cannot be claimed to solve the remote edit restriction.
