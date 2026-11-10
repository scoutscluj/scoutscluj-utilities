# Enhance the member registry table

The Units roster currently accepts only one value per filter, omits age, and
cannot export its filtered results. Add multi-select categorical filters, age,
current-fee and voting-age filters, and a CSV download across all filtered pages.
This is a bounded enhancement of the existing roster, with no schema changes.

Confirmed behavior: all categorical filters support multiple values; cotizație
is active when the current fee is fully paid; voting eligibility
means age 16 or older. Export respects filters, sort order and visible columns.
Profile and fee permissions remain enforced by the API and export.
