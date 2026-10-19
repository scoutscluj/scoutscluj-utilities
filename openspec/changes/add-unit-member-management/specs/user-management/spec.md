## MODIFIED Requirements

### Requirement: User Role Updates

The system SHALL let super admins update the manually assigned application roles
of an existing user through the generic role-management surface. Effective
roles SHALL also incorporate independently sourced active council mandates.
Only super admins SHALL manage arbitrary roles through the generic editor;
administrators MAY manage council mandates through a dedicated operation.
Derived grants SHALL retain provenance so mandate expiry does not erase
independently granted rights.

#### Scenario: Super admin changes a user's roles

- **GIVEN** an authenticated user has `super_admin`
- **AND** another local user exists
- **WHEN** the super admin submits a valid manual role change
- **THEN** the system stores the manually assigned roles and returns effective roles
- **AND** subsequent current-user and authorization checks use current manual and derived grants

#### Scenario: Non-super-admin uses the generic role editor

- **GIVEN** an authenticated user does not have `super_admin`
- **WHEN** they attempt arbitrary role changes through the generic editor
- **THEN** the API responds with `403` and changes no roles
- **AND** a dedicated authorized council-mandate operation remains separate

#### Scenario: Invalid role payload

- **GIVEN** a super admin submits an unsupported role value
- **WHEN** the API validates the request
- **THEN** the request is rejected and no roles are changed

#### Scenario: Duplicate roles are submitted

- **WHEN** a super admin submits the same valid manual role more than once
- **THEN** the stored manual role set contains it at most once

#### Scenario: Target user does not exist

- **WHEN** a super admin submits a manual role change for a missing account
- **THEN** the API responds with `404`

#### Scenario: Super admin changes their own roles

- **WHEN** a super admin changes their own manually assigned roles
- **THEN** the change is applied and subsequent checks use current effective access

## ADDED Requirements

### Requirement: Council mandate-derived administration

The system SHALL allow administrators to manage council mandates through a
dedicated audited operation. An active mandate SHALL confer application `admin`
access, not `super_admin`. Ending a mandate SHALL revoke only that mandate's
derived rights on subsequent authorization checks, preserving independent
current grants. Unit chiefs SHALL NOT grant council mandates by virtue of their
unit role alone.

#### Scenario: Member joins the council

- **WHEN** an authorized administrator records an active council mandate
- **THEN** the linked account receives effective administrator access
- **AND** no technical super-admin role is inferred

#### Scenario: Mandate ends while a session remains open

- **WHEN** the member's last active council mandate ends
- **THEN** subsequent requests no longer use that mandate's admin grant
- **AND** any independent current unit-chief or manual access is preserved
- **AND** the previous session cannot retain revoked derived privileges
