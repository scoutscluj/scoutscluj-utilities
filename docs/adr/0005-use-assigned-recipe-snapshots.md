# Use Assigned Recipe Snapshots

Kitchen plans will preserve historical meal planning by copying recipe details into a `Rețetă atribuită` when a recipe is assigned to a meal, rather than creating scheduled activity-end snapshots. This avoids background jobs and keeps shared catalog edits from silently changing current or past activity plans; coordinators can explicitly refresh an assigned recipe from the catalog when they want the newer version.
