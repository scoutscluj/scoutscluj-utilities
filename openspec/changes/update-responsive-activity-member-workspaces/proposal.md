# Responsive activity and member workspaces

## Why

On mobile, administrative banners and permanently expanded filters push the first participant/member below the first screen. Activity surfaces use inconsistent colors and spacing, while member tables require horizontal navigation for routine actions. The platform has no appearance preference.

## What changes

- Reorganize activity listing, overview, registrations, settings and department surfaces around the current task, with secondary administration in accessible menus/disclosures.
- Adapt member and unit browsing to compact mobile rows, visible row actions and focused filters, retaining desktop density and existing authorization.
- Add browser-persisted System / Light / Dark appearance, approved explicitly by the user, and semantic theme tokens for shared controls, menus and dialogs.
- Show uploaded parental agreements as orange AP/eye controls requesting digital-signature review, with clearer agreement/cash confirmation colors, as requested in the user's follow-up.
- Evaluate new screenshots and interactions independently using subagents. Iterate until the reviewed surfaces exceed 8.5/10 without accessibility or overflow blockers.

## Authorization and scope

The user requested this redesign, independent subagent evaluation, iteration above 8.5 and production publication on 12 November 2026; they explicitly approved adding all three appearance choices. This proposal records that authorized scope. Other platform workspaces will be handled in a later phase; common shell and token changes apply consistently across the application.

No financial, consent, membership or Orgo authority is changed. Real production records are not used for mutation tests.

## Impact

Web UI, synthetic browser fixtures and regression coverage; additive browser preference only. No database migration or backend protocol change is required.
