# Add optional criminal records to adult dossiers
## Why
The user requested criminal record upload alongside CIC and explicitly confirmed it remains optional.
## What Changes
Add an independent criminal_record kind to the existing private annual upload/review/version workflow and a separate workspace status. Preserve CIC-only completeness. Expand the existing database constraint without modifying or deleting existing records.
## Impact
Adult document API, schema migration, profile/admin dossier UI and regression coverage. No new access roles, secrets, expiry rules or Orgo writes.
