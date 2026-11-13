# Neutral dark platform review

This follows the November 13 production screenshots and the user's request to
repeat independent design review with a neutral charcoal palette like Codex.
It extends the earlier activity/member release to the remaining platform.

## Acceptance method

Three subagents implement separate surfaces and review one another's work.
Scores are informed design judgments, not objective measurements. Each major
reviewed surface must exceed 8.5; an average cannot hide a contrast or responsive
blocker. Screenshots cover 320, 390, 768, 1024 and 1280px in both appearances.
Interactive cases include errors, menus, dialog focus/Escape, expanded metadata,
calendar states and contribution eligibility/payment states.

The browser checks measure actual text including heading/label/value nodes,
ancestor opacity, portal dialogs, field text, placeholders and control borders.
Normal text requires 4.5:1 and field boundaries 3:1. Fully hidden file inputs are
represented by their visible labeled upload control. Equal RGB foundation colors
prevent the previous navy cast. Light explicitly restores native light controls
even after PDF.js styles load; System follows the device setting.

## Design decisions

Dark uses canvas #191919, navigation #202020, surface #242424, raised #2b2b2b,
inset #1d1d1d and neutral borders. Status accents remain semantic. Calendars and
contribution cards now pair semantic surfaces with readable ink. PDF pages retain
white paper and black print content.

Registers adapt to their actual available content width, including the desktop
sidebar at 1024px. Mobile users, audit and Orgo rows keep primary information and
actions visible, with secondary metadata in details. Finance lists show identity,
balance and actions before import/technical information. Native scrolling tables
remain only where the surrounding workflow intentionally needs them.

Inventory editors and financial-document previews reuse the shared accessible
dialog. Submission errors receive focus through FormFeedback. Existing backend
permissions, revision checks, payment calculations and mutation endpoints are
unchanged. Test mutations use isolated synthetic fixtures only.

## Review evidence

Independent review accepted contribution/payment self-service at 8.7 (320px) and
8.8–8.9 (390/1280px), and dashboards/calendars at 8.7–8.9 after rejecting earlier
currency wrapping and misaligned calendar headings. Profile was 8.8–8.9, objective
error dialog 9.0, document rejection dialog 8.8, adult documents 8.6–8.8,
financial documents 8.7–8.8 and administration landing 8.6.

Final independent review accepted the corrected dense registers and financial
workspaces after rejecting earlier clipping, excessive card padding and status
badge overlap:

| Surface | Independent score |
| --- | --- |
| Fees and admission payment | 8.7–8.9 |
| Dashboard and calendars | 8.7–8.9 |
| Profiles and objective dialogs | 8.8–9.0 |
| Adult document dossiers | 8.7–8.8 |
| Financial administration and tariffs | 8.6–8.8 |
| Users and role dialog | 8.8 |
| Orgo outbox | 8.8 |
| Notification administration | 8.8 |
| Inventory, including tablet actions | 8.7–8.8 |
| Global audit | 8.9 |
| Administration landing | 8.6 |
| Upload and Keez dialogs, mobile/desktop in both themes | 8.9 |
| Financial PDF preview | 8.8 |
| Guest registration, including selected state | 8.7 |
| Login / offline recovery | 8.9 / 8.8 |

## Verification

The four new reproducible browser suites cover 24 contribution/admission cases,
11 calendar cases, 10 financial-administration cases and 18 remaining-platform
cases. The latter traverses 18 authenticated routes at five widths in both
appearances, plus guest pages, expanded records and four dialog/error-state
combinations. The 22 activity/member appearance cases also pass, including System
mode, AP digital-signature review and receipt states. The web unit suite passes
98 tests; Svelte diagnostics report no errors or warnings; production build,
Prettier, source ESLint and strict OpenSpec validation pass.

CI repeats these suites alongside registration, admissions, members, profile and
financial mutation regressions. Production verification uses deployment image
identity, health endpoints and anonymous read-only mobile browser checks.
Captures are generated in `tmp/design-review/` and retained by CI for seven days.
The pull request and deployment workflow retain the release result.

## Limits

External Notion documentation and Google feedback contents are not controlled by
the platform. Tests stub their contents and verify only our headings, available
frame size and external-link fallback. Synthetic fixtures exercise representative
states; they do not authorize live record changes or payment-provider operations.
The paused global agreement editor stays paused. Paper/PDF previews deliberately
retain their document palette.
