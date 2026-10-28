# Activity publication, eligible groups and Romanian dates

The user requests structure-scoped eligibility choices, structure names for ambiguous unit names, a prominent publication action and Romanian date fields. They explicitly confirmed that public activity pages should become unavailable after the activity ends. This follow-up approves those refinements of the existing activity workflow.

Show a publication bar at the top of activity administration. Keep its action separate from editing registration options, require saving pending changes first, and preserve optimistic concurrency. Automatically hide completed/cancelled activities and activities whose final calendar day has passed in Europe/Bucharest. Where a legacy activity has only a start date, treat it as a one-day activity. Internal administration and existing records remain available.

Use fixed current units in eligibility catalogs, filter subgroups through their parent units and label units by structure when more than one structure is in scope. Replace browser-dependent date fields throughout the app with a shared Romanian text input and the existing Bits UI calendar primitives. Display day.month.year and 24-hour time while retaining canonical ISO values in forms and APIs. No database migration or Google Calendar integration is needed.
