# Improve the membership finance experience

## Why
The member register hides payment history in expanding table rows, lacks a clear collection progress indicator, and requires navigating away to record a manual payment. Finance pages need clearer summaries, status colors, and approachable layouts.

## Changes
- Replace payment accordions with accessible icon tooltips.
- Show collection progress for the selected period, both paid members and collected amounts.
- Record bank or cash payments from a member row using a modal, saving receipt and allocation atomically.
- Support cash in the receipts page and preserve method, document reference, actor, and audit history.
- Improve the pending payments, receipts, and fee configuration layouts and move pending payments below the main finance workflows in navigation.

## Scope
Uses existing staff permissions, financial records, and transaction locking. No database schema migration or payment processor changes. The user requested implementation and production publication.
