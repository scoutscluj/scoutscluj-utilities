# Activity Navigation

## Current Direction

Activities should become expandable entries in the main left menu so users can
move directly into the activity they are currently working on.

The sidebar activity list should stay curated rather than exhaustive:

- active and upcoming activities
- coordinated activities only while they are active or upcoming

The full activity archive remains available through `Toate activitățile`.
Pinning should not be part of the first implementation slice.

Clicking an activity entry in the sidebar opens that activity's `Prezentare`
page. `Prezentare` is the activity landing/dashboard page, but it is not shown
as a child menu item. Department links remain visible only for the current
activity so the left menu stays compact.

Departments are real activity-scoped responsibility areas. Each activity chooses
its departments from a standard set, such as finance, kitchen, program, or
logistics.

The app stores which departments are enabled for each activity so coordinators
can adjust the activity workspace after creation. `Prezentare` is always
available through the activity entry itself; optional departments currently
include `Financiar`, `Bucătărie`, `Program`, and `Logistică`.

When an activity is expanded, its enabled departments appear under it. Kitchen
subsections remain in a separate contextual kitchen menu, not mixed directly
into the main application sidebar. The kitchen contextual menu should be a
horizontal menu at the top of the kitchen workspace.

Activity departments should not also render as a top tab row. Once department
navigation moves into the left menu, the kitchen workspace should show only one
horizontal navigation row: the kitchen menu under the activity and department
context.

Department pages should use a compact activity context header instead of
repeating the full activity overview header. The full activity details belong
on `Prezentare`; department pages should keep only the activity title and a
short metadata line needed for orientation.

The top bar owns page titles. It shows the current activity title and context
on activity routes, and it replaces text links such as `Înapoi la activități`
with an icon-only back button that has an accessible label and tooltip.

`Prezentare` should behave as a compact activity dashboard. It should show the
activity basics, active departments, department-level summaries, important
warnings, and recent activity/audit context. It should answer what needs
attention in the activity without duplicating department workspaces. Edit forms
and setup controls belong in `Setări activitate`, not on the dashboard.
Inactive departments should stay hidden from normal users. Managers may see a
small setup area when inactive departments are available to enable, but it
should not compete visually with active department status.

The dashboard should optimize for actionability rather than decorative stats.
Use compact activity basics, cards only for enabled departments, one to three
signals per department, a clear attention strip for missing setup or workflow
problems, and a lower-priority recent activity/audit feed.

Global finance navigation and activity finance navigation should both remain.
Global `Financiar` is the cross-activity finance manager workspace. Activity
`Financiar` is the finance department for one activity.

Activity audit should remain a privileged utility rather than a normal
department. Show it inside an expanded activity only for users who can view that
activity's audit entries, and present it as secondary to the activity
departments.

Activity settings should follow the same utility pattern rather than the
department pattern. `Setări activitate` lives at `/activities/:activityId/settings`,
is visible only to users who can manage that activity, and is visually separated
from department links in the expanded activity menu.

`Setări activitate` should edit the activity container: title, type, status,
dates, location, description, enabled departments, and responsible people when
the model supports them. Orgo-linked metadata should be read-only unless a
specific admin workflow needs to change it. Department-specific setup stays
inside the owning department workspace, and dangerous actions such as delete,
cancel, or archive should be separated from normal edits.

Only `super_admin` users and the activity's `Coordonator` should edit `Setări
activitate`. Users with activity access may see `Prezentare`, but the settings
link should only appear for users who can manage the activity container. Future
department leads should manage settings for their own department, not the whole
activity.

Disabling a department is a navigation and access decision, not a delete
operation. Existing department data should be preserved and restored if the
department is re-enabled. `Setări activitate` should warn managers when they
disable a department that already has data.

When a user opens a deep activity URL directly, the sidebar should orient them
automatically: expand `Activități`, expand the current activity, highlight the
current department, and let contextual department menus highlight the current
subsection.

The main sidebar should stop at the department level. For example, an expanded
activity may show `Financiar`, `Bucătărie`, `Program`, and `Logistică` under
the activity entry, but it should not also expand `Mese`, `Ingrediente`,
`Rețete`, `Aprovizionare`, or `Rapoarte` inside the same tree.
