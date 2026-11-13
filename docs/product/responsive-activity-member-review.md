# Responsive activities, members and appearance

Scope: activities, overview, registrations and participation payments, settings,
finance, kitchen sections, audit, public activity, members, unit management and
member profiles. Other platform workspaces remain a later design phase. Shared
appearance tokens and navigation apply globally.

The [November 13 follow-up](neutral-dark-platform-review.md) extends appearance
coverage to the remaining workspaces and replaces the blue-gray dark foundation.

The user authorized implementation and production publication, with independent
subagent review above 8.5/10. The user separately approved browser-persisted
System / Light / Dark appearance.

## Review method

Three subagents split implementation and independent evaluation. The activity
implementer evaluates members/units; the member implementer evaluates activities;
the theme reviewer checks shared navigation, appearance and accessibility. Scores
are design judgments supported by screenshots and interaction checks, not a
claim of a universal objective score.

The acceptance gate applies to each major reviewed surface rather than an
average. A score above 8.5 also requires no unresolved overflow, inaccessible
routine actions or contrast blockers. Iterations rejected the initial oversized
headers, duplicate mobile navigation, tablet actions outside the content area,
weak dark controls, hidden payment balances and horizontally clipped audit/meal
information.

Browser captures use representative synthetic records at 320, 390, 768, 1024 and
1280px. Light/dark and System preference, reload persistence, dialog focus,
Escape, participant/member row access and real rendered contrast are checked.
Normal text requires 4.5:1 and essential form boundaries 3:1. The first participant
row must appear by 340px and the first member row by 350px at the reviewed mobile
size. Production records are never changed by these tests.

## Evidence

The independent shared-interface review passed at 9.1/10: appearance 9.1,
Orgo dialog 9.0, stable mobile navigation 8.9 and 320px shell/topbar 8.9.
The final dark placeholder was measured live at 7.63:1.

The subsequent requested AP state uses an orange eye for uploaded PDFs awaiting
review and stronger green AP/Cash confirmation buttons. Independent follow-up
reviews score these lists and the signature-review dialog 8.7–9.1. The new
review/confirmation text palettes have contrast ratios of 6.37–7.40:1, with
control boundaries above 3:1. The dialog explicitly requires a digital signature
instead of a handwritten signature and asks the leader to inspect the PDF.

| Surface independently reviewed | Final scores |
| ------------------------------ | ------------ |
| Activity workspace surfaces    | 8.6–9.0      |
| Member registry                | 8.8–9.0      |
| Member profile                 | 8.7–8.9      |
| Responsibility dialogs         | 8.8–9.0      |
| Unit management                | 8.8          |
| Orgo integration               | 8.7–8.8      |
| Structure reconciliation       | 8.6–8.8      |
| Public activity                | 8.8          |
| Audit list and details         | 8.7–8.8      |

The activity implementer reviewed member surfaces; the member implementer
reviewed activity surfaces. The theme reviewer independently repeated theme
keyboard/reload behavior, measured public-link and placeholder colors, and
verified audit filtering, counts, detail opening and Escape without runtime
errors.

Final local validation: 98 web unit tests, zero Svelte errors/warnings, a
production build, 20 responsive/theme browser scenarios, 41 activity
registration/publication regression scenarios, and 28 member regression
scenarios passed. Production checks are recorded in the pull request and
workflow history.

Run `playwright.design.config.ts` after building the web app. It writes screenshots
and layout metrics to `tmp/design-review`. The member regression suite also writes
unit-dialog captures. CI uploads these as `responsive-design-review` for seven
days. Generated screenshots are not committed as source assets.

Run Svelte checks and the build sequentially: they share generated SvelteKit
files. Browser tests wait for application initialization, reject JavaScript
runtime errors, and exercise audit counts, filtering and dialog opening; a
server-rendered screenshot alone is insufficient evidence of a working page.

## Behavior retained

AP/cash confirmations and reversals, withdrawn filters, revision checks,
authorization, financial history, agreement downloads and server-backed Orgo
operations retain their existing behavior. Background Orgo synchronization moves
its status into a focused dialog; it does not reload unfinished forms. Theme
selection adds no database migration or account setting.
