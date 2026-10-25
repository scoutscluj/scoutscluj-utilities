# Documente adulți

Every active member aged at least 18, including beneficiaries, has an annual
behavioural integrity certificate (CIC) dossier. Age comes from the local Orgo
member record's date of birth, evaluated using Europe/Bucharest dates. Missing
birth dates are reported for correction; category alone never establishes age.
Criminal record certificates are not requested or accepted by this module.

## Member workflow

Open **Profil → Documente adulți → Deschide dosarul**. Choose a scouting year
(September 1–August 31), upload the CIC as an original PDF or readable JPEG/PNG
of at most 10 MiB, and follow its status. The current year is selected initially.
Older years and replaced versions remain available to the owner.

Uploads start **În verificare**. A central administrator can mark the current
version **Validat** or **Respins**; rejection requires an owner-visible reason.
A validated current version completes that year's dossier. Replacing it creates
a new pending version without changing the old version's history. The annual
coverage is an internal dossier rule, not an extension of issuer validity.
Missing/pending/rejected documents do not block other application functions.

The modal includes the user-provided guidance: free HUB MAI CIC service with
Ghișeul.ro account validation (approximately 10 minutes), paid alternatives
roghiseul.ro/caziere.ro, and Secția de Poliție nr. 1, Str. Decebal nr. 26,
Cluj-Napoca, regardless of residence county. The official online service is
https://hub.mai.gov.ro/serviciu/view?id=90.

## Administration and privacy

**Admin → Documente adulți** lists active adult members from both structures,
with year selection, name search, status filters, sorting and pagination. Open
a member's dossier to upload on their behalf, download original versions or
review the current CIC. An administrator can validate their own on-behalf upload.

Access requires an enabled account with `centralMemberAdmin`, an explicit
`admin` or `super_admin` role, and an active primary member affiliation in Cluj.
Council membership or finance/unit/structure authority alone is insufficient.
Every API operation rechecks account privileges and ownership from persisted
identity, rather than trusting client flags. Members can access only their own
dossier; guessed member/file identifiers do not grant access.

File bytes live in `adult_document_files`, separately from version metadata in
`adult_documents`, and never appear in list/dossier JSON or a public URL.
Authenticated downloads use `private, no-store`, attachment disposition and
`nosniff`. The web proxy forwards only allowed operations and rejects
cross-origin writes. The service worker bypasses document requests and refuses
to restore cached profile/admin-dossier pages offline.

Upload, replacement, review, administrator dossier/list access and administrator
downloads enter the central audit journal. Metadata contains identifiers, year,
kind and version, without file contents, filenames or rejection free text.
Uploads and reviews share a member-scoped transaction lock; stale reviews return
409, and audit-write failures roll back document metadata and bytes together.

## Setup and verification

Apply `Migration20261025000100` using the normal API migration process before
serving the new feature. No new secrets or storage service are required. The
existing web `BODY_SIZE_LIMIT=16M` supports the base64 JSON upload payload for
a 10 MiB file; the API uses the existing 25 MB document request limit.

Relevant checks:

- API typecheck/build, changed-file ESLint, and
  `adult-documents.rules.spec.ts`/`adult-documents.http.spec.ts`.
- `node --import tsx test/adult-documents-postgres.smoke.ts` from `apps/api`.
  It creates/drops only its own unique local database. Configure
  `ADULT_DOCUMENTS_TEST_ADMIN_URL` for local Postgres if needed; the default
  uses port 55432. Covers the real migration up/down and ORM schema match,
  concurrent uploads/reviews, original bytes, history and audit rollback.
- Web typecheck/build, changed-file ESLint, `service-worker.spec.ts`, and
  `playwright.adult-documents.config.ts` for synthetic owner/admin/mobile flows,
  max-size upload and local membership-banner regressions. No production
  mutation is used for verification.

Verified for this change: 8 API tests, 6 service-worker tests, 21 browser
scenarios, API/web builds and typechecks, changed-file lint/format, OpenSpec
validation, and the real PostgreSQL smoke test. The restricted Windows runner
timed out when Playwright stopped its managed web servers; the final identical
browser suite passed with independently managed synthetic servers (exit code 0).
Production rollout applies the migration through the normal deployment workflow.

The profile payment banner now uses only the local current-period membership
obligation and its recorded paid amount. It shows payment due for an outstanding
balance, no warning for a settled balance, and a neutral unavailable state when
the local balance cannot be identified or loaded. Orgo fee dates remain profile
reference information and cannot override the banner.
