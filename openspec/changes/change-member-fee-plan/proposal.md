# Change member cotisation type in Resurse

## Why
Financial staff currently must change the type in Orgo before Resurse can accept it.

## What Changes
Add an authorized type selector (Normală, Fam 1/2/3, Socială), preview current-year
recalculation, preserve paid evidence, and queue the canonical Orgo price change
through the member outbox. Orgo wins genuine concurrent changes. Block historical
period edits, open payments, overpayment and incompatible national transfers with
clear review instructions. A pending local type must survive an unchanged Orgo
roster. Expose the action in the financial roster and the member fee menu.

## Approval
The user requested the selector and then instructed implementation and production
release on 2026-10-26. Use the recommended current-year recalculation safeguards.
Deployment includes the previously authorized member synchronization change.

## Integration evidence
Read-only inspection of Orgo's tenant product catalog on 2026-10-26 confirmed
versioned Normală/Fam/Socială prices. Its official client PATCHes users with
feeTenantProductPrice set to a ProductPrice @id. Resolve currently valid choices
from that catalog; do not hard-code IDs or enable the disabled server write flag.
