# ADR 0004: Use A Central App Audit Journal

## Status

Accepted

## Context

Scouts Cluj Utilities already records finance document status history in a
finance-specific audit table. The application is growing into activity,
finance, kitchen, procurement, and future operational modules. Users need a
consistent way to answer who changed important records and when, across the
entire app.

Keeping only module-specific audit tables would make each module solve auditing
differently and make cross-app review difficult. Using server logs as the audit
source would be incomplete because logs are operational, not domain records, and
may not retain structured entity context.

## Decision

Add a central app audit journal for important user and system actions.

Audit records include the actor when available, action, entity type, entity id,
timestamp, and a small structured metadata or diff payload.

Module-specific history may remain for workflow-focused screens, but important
state changes should also write to the central audit journal.

## Consequences

All new write-heavy modules should include audit logging in their service layer.

Existing finance document audit history can continue to power its detailed
workflow view while also emitting central audit events for cross-app visibility.

The central journal must avoid storing secrets or large document payloads.
