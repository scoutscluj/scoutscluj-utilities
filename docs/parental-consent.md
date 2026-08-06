# Parental consent generator

## Scope and access

This feature is specific to Scouts Cluj activities. Enable the `parental_consent`
department on an activity to expose its `Acord parental` workspace.

- The activity coordinator and `super_admin` can configure, preview, publish,
  republish, inspect history, and download archived files.
- Any authenticated user who can open the activity can see and download the
  current published PDFs.
- `admin` can edit template drafts. `super_admin` additionally manages the
  organization identity and approved images, and activates template versions.
- There is deliberately no legal-review or approval workflow. Template changes
  are rare, versioned administrative operations.

## Template model

Templates are structured JSON documents, not HTML. Supported blocks are:

- paragraph, H1-H3, callout, bullet list, ordered list, and table;
- separator and explicit page break;
- approved local image, allowlisted variable, predefined conditional module,
  and form field.

Supported inline marks are bold, italic, underline, and `http`, `https`,
`mailto`, or `tel` links. Raw HTML, CSS, scripts, remote images, unknown nodes,
unknown variables, and unknown modules are rejected by the shared validator.

Available variables:

- organization: `name`, `address`, `email`, `phone`;
- activity: `title`, `location`, `startDate`, `endDate`,
  `emergencyContactName`, `emergencyContactPhone`;
- branch: `label`, `startDate`, `endDate`, `ageRange`.

Predefined modules are `transport`, `accommodation`, `activity_catalog`,
`water`, `tools`, `fire_cooking_blacksmithing`, `hiking`, `first_aid`,
`food_allergies`, `equipment`, and `conduct_sfh`. Their content is generated
from typed organizer data; template code is never evaluated.

Form fields support `short_text`, `long_text`, `date`, `number`, `phone`,
`email`, `yes_no`, `single_choice`, `multiple_choice`, `dropdown`,
`acknowledgement`, `repeating_group`, `signature`, and `read_only`. Each field
has a stable unique code, label, optional help text, required state, choice
options, handwritten line count, and optional future digital-validation
metadata. The renderer produces printable controls and response areas for every
type.

The layout is constrained to US Letter with safe margins, base font size, and
approved header assets. The editor cannot inject arbitrary layout rules.

## Template lifecycle

1. Create a draft from the active or another existing version.
2. Edit and preview it with the fixed representative `Cântul Vâlvelor` fixture.
3. Save only while its status is `draft`.
4. A `super_admin` activates it. The previously active version is archived in
   the same transaction.
5. Active and archived versions remain immutable. To change them, create a new
   draft version.

Exactly one active template is enforced by a partial unique database index.
Templates referenced by publications and their asset references are retained.

## Activity draft and validation

Each enabled activity has at most one mutable draft with a schema version and
optimistic-concurrency revision. Updates may be partial; arrays replace their
previous values and objects merge recursively. A stale revision returns a
conflict instead of overwriting another save.

The wizard covers activity identity, three branches, branch-specific dates and
ages, transport and pickup, accommodation, activities, water and construction-
only rafts, tools, fire/cooking/blacksmithing, hiking/shelter, first aid,
food/allergies, equipment, conduct, regulations, and Safe from Harm.

Validation returns stable field paths and Romanian messages. Errors block
publication; warnings guide the organizer. The API also compares the mutable
draft to the latest publication snapshot and returns the changed field paths.
Common clauses are not part of the activity draft and therefore cannot be
overridden per event.

## Publication and immutable files

Publication validates the draft, organization identity, active template,
layout, variables, modules, fields, and asset references. It then renders every
enabled branch before changing database state. A transaction verifies the
draft, template, and organization revisions again, archives the previous active
publication, and stores:

- immutable draft, organization, and template snapshots;
- a stable 16-character publication reference printed in the footer;
- one immutable PDF row per branch with exact bytes, size, and SHA-256 checksum.

Exactly one active publication per activity and one document per branch and
publication are enforced in PostgreSQL. A failed render or stale revision
leaves the previous active publication untouched. Download responses include a
safe filename, content type, byte length, cache controls, RFC-compatible
`Digest`, and `X-Checksum-Sha256`.

Audit records contain actor, activity, entity IDs, action, branch/version,
revision, checksums, and changed-path metadata where relevant. Full templates,
drafts, organization snapshots, image bytes, and PDF bytes are not copied into
audit metadata.

## Seed and supplied DOCX sources

The bootstrap seed is idempotent and can be disabled with
`PARENTAL_CONSENT_AUTO_SEED=false`. It creates the singleton Scouts Cluj
identity, the initial active structured template, and the three versioned PNG
assets under `apps/api/src/modules/parental-consent/seed-assets`.

The two supplied parent and leader DOCX files informed the visual identity,
header assets, form-field needs, and organizer questions. Their SHA-256 hashes
and extracted-asset hashes are recorded in the seed-assets README. The seed
never reads from a user's Downloads directory and does not import the old broad
legal wording as authoritative content. The editable starting clauses come
from the approved functional specification.

## API surface

Swagger is available at `/api/docs`. Administrative endpoints live under
`/api/parental-consent/admin` for organization settings, assets, template
versions, activation, and template previews. Activity endpoints live under
`/api/activities/:activityId/parental-consent` for drafts, validation, branch
previews, publication, current metadata, history, and downloads.

## Renderer deployment and operations

Railway uses `Dockerfile.api`, and the AWS workflow uses
`deploy/docker/api.Dockerfile`. Both API runtimes are based on the Playwright
image matching the application's Playwright version. They include Chromium, its
Linux libraries, and DejaVu/Liberation fonts. `railway.api.json` runs the
database migration as a pre-deploy command and checks `/api/health` before
replacing the previous deployment.

The renderer uses Paged.js to split the structured document into Letter pages,
then fills the generated margin cells on every page with the approved header
assets, immutable publication reference, branch, and page counter. Network
requests are blocked during rendering; all images and the pagination script are
loaded from the deployed application.

Local renderer verification:

```bash
pnpm --filter api exec playwright install chromium
pnpm --filter api parental-consent:smoke
```

The smoke PDF is written under `tmp/pdfs/`. Render it to PNG with Poppler and
inspect every page after renderer or CSS changes.

Troubleshooting:

- `Executable doesn't exist`: install the exact Playwright Chromium revision or
  confirm the Docker image tag matches `apps/api/package.json`.
- Missing `.so` library: deploy with `Dockerfile.api`; a vanilla Node image is
  insufficient.
- Missing Romanian glyphs: verify DejaVu/Liberation fonts are installed and
  rerun the smoke render.
- Publish conflict: reload the draft; another save, template activation, or
  organization edit occurred during rendering.
- Rollback: redeploy the prior application image. Database down migrations are
  available, but should only be used when all parental-consent data can be
  discarded; normal template/publication rollback uses version activation and
  immutable history instead.

## Verification

```bash
pnpm verify
pnpm --filter api parental-consent:smoke
pnpm --filter web test:e2e
pnpm exec openspec validate add-parental-consent-generator --strict
```

The browser test is read-only and skipped by default. Run its complete mutating
flow only against a disposable environment by setting
`PLAYWRIGHT_MUTATION_E2E=true`, `PLAYWRIGHT_ADMIN_SESSION_COOKIE`,
`PLAYWRIGHT_ORDINARY_SESSION_COOKIE`, `PLAYWRIGHT_ACTIVITY_ID`, and
`PLAYWRIGHT_TEMPLATE_DRAFT_ID`. Override `PLAYWRIGHT_BASE_URL` when the test
target is not `http://127.0.0.1:5173`.
