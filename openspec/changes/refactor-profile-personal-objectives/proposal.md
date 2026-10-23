# Change: Refactor Profile And Add Personal Objectives

## Why

The profile currently mixes identity details with a full push-notification control
panel. Users need a compact profile overview and a place to record their own
objectives with a title, description, and deadline.

## What Changes

- Keep identity, roles, Orgo connection information, and logout on `/profile`.
- Replace the notification controls with one short summary card showing the
  current device state and active-device count, plus a `Setări notificări` button.
- Move enable, test, disable-current-device, and disable-all-device controls to
  `/profile/notifications`, with a `Înapoi la profil` link.
- Add an `Obiective personale` section on `/profile`, listing the signed-in
  user's objectives and providing an `Adaugă obiectiv` button.
- Open an accessible dialog containing required `Titlu`, `Descriere`, and
  `Termen limită` fields, plus `Anulează` and `Salvează obiectiv` actions.
- Save objectives in Postgres, scoped to the authenticated user, so they remain
  available after reloads and on other devices.
- Use Romanian labels and the existing responsive card and dialog conventions.

## Proposed Decisions For Approval

- Objectives are private to their owner and available to any authenticated user.
- All three requested fields are required. Trim title and description, with
  limits of 200 and 5,000 characters respectively.
- A deadline is a calendar date, stored and returned as `YYYY-MM-DD` without
  timezone conversion. Past dates are allowed and shown as `Termen depășit`.
- List objectives by nearest deadline first, then newest creation first for
  matching dates.
- This first version supports listing and creation. Editing, deletion,
  completion tracking, sharing, and deadline reminders are separate changes.

## Impact

- Modified capabilities: `app-shell`, `web-push-notifications`.
- New capability: `personal-objectives`.
- Frontend: profile route, dedicated notification route, objective dialog and
  list, authenticated server load/action, and route-title metadata.
- Backend: owner-scoped personal-objectives module, validation DTOs, and
  authenticated list/create endpoints.
- Database: a new `personal_objectives` table and migration; existing user and
  notification records remain intact.

## Approval Status

Approved by the user on October 23, 2026, with the instruction `implement`.
