# Refine public member registration

## Why

Applicants need to choose Cluj or Florești independently of their branch and understand the steps after submitting. Member emails must not be reused for another identity.

## What Changes

- Separate required structure selection from branch selection; filter branch choices and persist affiliation even when guidance is requested.
- Explain child versus guardian emails and check normalized member emails against local accounts, member profiles, active applications and the configured Orgo tenant. Recheck before remote account creation; do not accept unverifiable Orgo results.
- Replace the short success message with applicant-facing next steps, adapted for parents, members and children without email.

## Impact

No schema migration. Optional structure in application JSON keeps existing applications compatible. Uses Orgo's `/check-email-exists` contract as present in the tenant frontend; production verification of that endpoint and tenant discovery remains necessary before rollout. No emails, credentials or production registrations are generated during validation.
