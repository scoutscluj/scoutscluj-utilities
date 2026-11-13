# Neutral dark appearance and complete workspace coverage

## Why

The user supplied production screenshots showing light event cards and payment
cards with almost invisible inherited dark-mode text. The initial appearance
release covered activity/member workspaces but left legacy page styles behind.
The user also explicitly prefers the neutral charcoal appearance of the Codex
reference over the current blue-gray base palette.

## What changes

- Use neutral charcoal canvas, navigation, surfaces, inset controls and borders
  for explicit Dark and System-dark appearance.
- Correct component styles at their source across dashboards/calendars,
  self-service contribution/admission payments, financial administration,
  profile/documents, inventory and remaining administration pages.
- Keep status colors and Scouts branding meaningful; retain the requested
  orange digital-agreement review and visible green receipt confirmations.
- Broaden actual rendered-text contrast checks to headings, labels, values,
  badges and stateful content, not just links and token definitions.
- Reproduce representative paid/unpaid/error, calendar, editor/dialog and
  administrative states on desktop and mobile before independent acceptance.

## Authorization and scope

This continues the user's explicitly authorized design-review/publication
process and their request on 13 November 2026 to repeat it with the attached
production evidence and neutral dark reference. Reviewers must inspect full
page and interactive-state captures and score each reviewed surface above 8.5.
Payment calculations, permissions, data access and stored records remain governed
by the existing backend; mutation checks use synthetic data only.

## Impact

Web styling, shared dialog accessibility, synthetic fixtures and browser
verification. No database migration or payment-provider behavior change.
