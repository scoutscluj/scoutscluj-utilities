# Profile And Personal Objectives Design

## Profile Layout

1. Identity header: avatar, display name, and email.
2. Responsive overview cards: roles, Orgo connection, and notifications.
3. Full-width `Obiective personale` section with an `Adaugă obiectiv` button.
4. Existing logout action.

The notification summary contains a short current-device status, the number of
active devices, and a button styled link to `/profile/notifications`. Loading and
failed requests have distinct states; a failed request must not appear as zero
active devices. Unsupported browsers still receive a readable summary and can
open the settings page. Reading the summary never requests browser permission.

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
