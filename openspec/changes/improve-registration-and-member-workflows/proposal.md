# Improve member and registration workflows

## Why
Organizers need clearer member responsibility dialogs and practical activity information. Authenticated families need to save an unfinished registration without reserving a place or initiating payment.

## What changes
- Arrange responsibility scope, permissions and submission actions separately; show pending feedback without a full page reload.
- Open unit management and sync tools in dialogs and label transfer history explicitly.
- Show an emphasized Romanian registration deadline and practical information without nested accordions.
- Render specific activities through a list editor and as separate bullet paragraphs in new PDFs.
- Explain Orgo as Orgo (membri.scout.ro) in explanatory text while keeping action labels short.
- Store incomplete registration forms in the authenticated account with owner-only access and revision checks; remove them atomically after successful submission.

## Impact
One additive draft table migration; existing registrations, documents and financial ledgers retain their behavior. Existing issued PDFs are not rewritten.
