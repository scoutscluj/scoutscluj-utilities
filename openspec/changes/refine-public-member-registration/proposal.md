# Refine public member registration

## Why

Applicants need to choose Cluj or Florești independently of their branch and understand the steps after submitting. Member emails must not be reused for another identity.

## What Changes

- Separate required structure selection from branch selection; filter branch choices and persist affiliation even when guidance is requested.
- Explain child versus guardian emails and check normalized member emails against local accounts, member profiles, active applications and the configured Orgo tenant. Recheck before remote account creation; do not accept unverifiable Orgo results.
- Replace the short success message with applicant-facing next steps, adapted for parents, members and children without email.

## Impact

No schema migration. Optional structure in application JSON keeps existing applications compatible. Uses Orgo's exact `/api/v1/users?email=...` filter, verified read-only in production against an existing email and an unused synthetic email. The live public `check-email-exists` route rejects new addresses and is not used. No emails, credentials or production registrations are generated during validation.
