# Recognize Orgo national payments and delegate manual fee collection

## Why
Orgo confirms only the national half of a membership fee. Recognizing this payment currently requires recording a local bank receipt in the same operation, and unit leaders cannot record receipts themselves.

## What changes
- Verify national evidence independently using the existing exact-period Orgo history reader, without creating payments in Orgo or inventing local receipts.
- Refresh the current period during membership synchronization and when opening a member's fee information. Earlier periods require an explicit verification.
- Permit chiefs and leaders to record bank/cash membership receipts only for members covered by their current mandates; retain existing structure and mandate-parent checks.
- Confirm receipts immediately with amount, reference, date, method, author and audit trail. Preserve partial payments.
- Offer “Înregistrează plată manuală” directly in each authorized active member's context menu and open the current fee form expanded.
- Preserve overlapping financial records and flag reconciliation instead of duplicating credit.

## Authorization and scope
The user requested implementation, approved these five decisions in the interview, and subsequently requested the direct context-menu action and production rollout. Existing financial administration endpoints remain restricted. No schema migration is required.
