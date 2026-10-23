# Profile And Personal Objectives Design

## Profile Layout

1. Identity header: Orgo profile photo (initials fallback), display name, and email on the left; a notification
   settings icon and logout action on the right.
2. Two information cards: personal details on the left (email, card ID, Orgo
   membership status, date of birth, date joined, fee valid until, and application
   roles) and connection details on the right (connection status, Orgo ID,
   connection date, and last login). Use a two-thirds/one-third desktop width split with equal heights, 16px
   card padding, compact information columns, and an inline role row. Present fee
   validity as a regular detail rather than a separate inset panel. Stack the
   cards on narrow screens.
3. Full-width `Obiective personale` section with an `Adaugă obiectiv` button.

The notification icon links to `/profile/notifications`. A crossed bell indicates
that notifications are not ready on this device; a bell with a green check
requires browser support, granted permission, server configuration, and an active
subscription on the current device. Loading and failed requests have distinct
states with accessible status text and tooltips. The link remains available in
all states. Reading status never requests browser permission. On narrow screens
logout retains an accessible label while its visible text gives way to its icon.

The objective list displays each title, description, and localized deadline.
Descriptions preserve line breaks and long content wraps on narrow screens.
An empty list explains `Nu ai adăugat încă niciun obiectiv personal.` and retains
the create action. Loading failures show an error and retry action instead of
claiming the list is empty.

## Create Dialog

Use the existing dialog component and form conventions. The dialog has a visible
title, associated field labels, keyboard focus containment, Escape dismissal,
and focus restoration to the create button.

| Field | Control | Validation |
| --- | --- | --- |
| Titlu | Text input | Required after trimming; maximum 200 characters |
| Descriere | Textarea | Required after trimming; maximum 5,000 characters |
| Termen limită | Date input | Required, valid calendar date in `YYYY-MM-DD` format |

Cancel closes the dialog without creating a record. While saving, prevent
duplicate submissions and accidental dismissal. On success close the dialog,
reset the form, refresh the list, and announce success. On validation or network
failure keep the dialog open with entered values and a Romanian error message.

## Notification Settings

Extract the current notification behavior into the dedicated authenticated route.
Retain explicit permission requests, service-worker subscription, current-user
test delivery, device unsubscribe, and unsubscribe-all behavior. Preserve denied,
unsupported, server-unconfigured, busy, and failure states. The profile summary
reloads status when the user returns from settings.

## Persistence And API

Add a small `personal-objectives` NestJS module. Use an authenticated controller
independent of the super-admin-only `UsersController`.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/personal-objectives` | Return only the authenticated user's objectives, ordered by deadline ascending and creation descending, with ID as a deterministic tie-breaker |
| `POST /api/personal-objectives` | Validate title, description, and deadline; derive ownership from the authenticated session; return the saved objective |

The web application uses its existing authenticated server API helper for loading
and creating objectives. Do not expose session tokens to browser code. Reject
unauthenticated requests. Never accept a client-provided owner to select another
user's data.

The new table contains `id`, `user_id`, `title`, `description`, `deadline`, and
`created_at`. `user_id` references the local authenticated `users` record;
`deadline` uses a Postgres `date` column. Index `(user_id, deadline)` for the
owner-scoped list. Define and test migration rollback for the new table.

## Boundaries

These are the account owner's personal objectives. They do not add beneficiary
pedagogy records or imply access by unit leaders. Notification subscriptions and
administrative broadcasts retain their current API and permissions.

Implementation is based on `origin/main` at `522ab50` and reuses its shared
UI conventions. Existing unrelated proposal artifacts were left untouched.

## Orgo Personal Details

The current-user serializer returns only email, membership status, date of birth,
date joined, and fee-validity date from the stored Orgo profile. Normalize the
nested Orgo date objects to validated `YYYY-MM-DD` strings. Format these calendar
dates without timezone shifts. Login/connection timestamps use Europe/Bucharest.
Do not expand the administrative user-list payload with these personal fields.

Prefer the stored Orgo profile image for the avatar and fall back to the account
avatar, accepting HTTPS URLs. If no image is available or loading fails, show the
user's initial. Keep image dimensions fixed so loading does not shift the header.

Retain the existing Scouts design tokens, white surfaces, and red actions.
Application-role badges use labeled purple (super admin), blue (admin), amber
(finance manager), and teal (moderator) treatments. Membership and connection
success use green; expired fee validity uses an explicit amber `Expirată` label.
Missing fields display `Indisponibil`.

A full-width amber warning banner above both profile cards offers a
`Plătește cotizația` link to `/cotizatie` when
validity has expired or the current-period obligation has an outstanding balance.
Use the existing catalog and authenticated `membership/mine` endpoints, loaded
alongside objectives, to identify the current user's current-period balance.
If no validity is recorded, offer the link unless current-period payment is
confirmed in full. A failed balance request is unknown, not evidence of debt.
The banner keeps its action beside the warning on desktop and wraps below the
message on mobile. The fee date and status remain in the personal card.
Navigation opens the existing fee page; payment uses its existing flow.
