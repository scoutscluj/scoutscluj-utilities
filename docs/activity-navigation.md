# Activity Navigation

## Current Direction

Activities should become expandable entries in the main left menu so users can
move directly into the activity they are currently working on.

The sidebar activity list should stay curated rather than exhaustive:

- active and upcoming activities
- activities coordinated by the current user

The full activity archive remains available through `Toate activitățile`.
Pinning should not be part of the first implementation slice.

Clicking an activity entry in the sidebar opens that activity's `Prezentare`
page. Department links remain visible only for the current activity so the left
menu stays compact.

Departments are real activity-scoped responsibility areas. Each activity chooses
its departments from a standard set, such as finance, kitchen, program, or
logistics.

The app stores which departments are enabled for each activity so coordinators
can adjust the activity workspace after creation. `Prezentare` is always
available; optional departments currently include `Financiar`, `Bucătărie`,
`Program`, and `Logistică`.

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

Global finance navigation and activity finance navigation should both remain.
Global `Financiar` is the cross-activity finance manager workspace. Activity
`Financiar` is the finance department for one activity.

Activity audit should remain a privileged utility rather than a normal
department. Show it inside an expanded activity only for users who can view that
activity's audit entries, and present it as secondary to the activity
departments.

When a user opens a deep activity URL directly, the sidebar should orient them
automatically: expand `Activități`, expand the current activity, highlight the
current department, and let contextual department menus highlight the current
subsection.

The main sidebar should stop at the department level. For example, an expanded
activity may show `Prezentare`, `Financiar`, `Bucătărie`, `Program`, and
`Logistică`, but it should not also expand `Mese`, `Ingrediente`, `Rețete`,
`Aprovizionare`, or `Rapoarte` inside the same tree.
