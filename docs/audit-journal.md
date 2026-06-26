# Audit Journal

The app records user-visible business actions in `app_audit_entries`.

Each entry stores:

- actor id when the action was performed by a signed-in user
- action name in `domain_entity.verb` form
- entity type and id
- optional activity id
- sanitized metadata
- creation timestamp

Metadata must not include file contents, base64 payloads, passwords, tokens,
secrets, or session values. The audit helper recursively replaces sensitive keys
with `[redacted]`.

Activity audit visibility is limited to the activity coordinator, finance
managers, and super admins. The global audit journal is super-admin only.

## Action Naming

Audit actions use `domain_entity.verb` names. Current examples:

- `financial_document.created`
- `financial_document.status_updated`
- `kitchen_plan.created`
- `kitchen_plan.updated`
- `kitchen_days.synced`
- `kitchen_ingredient.created`
- `kitchen_ingredient.updated`
- `kitchen_recipe.created`
- `kitchen_recipe.updated`
- `kitchen_meal.created`
- `kitchen_meal.updated`
- `kitchen_meal.deleted`
- `kitchen_meal_recipe.assigned`
- `kitchen_meal_recipe.removed`
- `kitchen_meal_attendance.replaced`
- `kitchen_quantity_adjustment.created`
- `kitchen_quantity_adjustment.deleted`
- `kitchen_procurement_event.created`
- `kitchen_procurement_event.updated`
- `kitchen_procurement_event.deleted`
- `kitchen_procurement_item.created`
- `kitchen_procurement_item.updated`
- `kitchen_procurement_item.deleted`
- `kitchen_procurement_items.added_from_meal_plan`
- `kitchen_procurement_document.linked`

New modules should follow the same pattern and record audit entries only after
the business write succeeds.

## Metadata Rules

Good audit metadata is small, structured, and useful for answering what changed.
Prefer identifiers, previous/new status values, counts, filenames, MIME type,
file size, and user-facing notes when they are not sensitive.

Do not store:

- document bytes
- base64 payloads
- cookies, session tokens, API tokens, OAuth codes, or passwords
- Keez or Orgo secrets
- full request bodies for uploads
- large exports

If metadata contains a nested sensitive key, the audit helper redacts it before
persisting.

## Views

Available views:

- global audit journal for `super_admin`
- activity-scoped audit journal for the activity coordinator, `finance_manager`,
  and `super_admin`

Finance still keeps its document-status history for detailed workflow review.
Important finance state changes also write central audit entries so cross-app
history remains visible in one place.
