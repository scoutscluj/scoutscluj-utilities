# Change: Add Adult Documents And Use Local Membership Evidence In Profile

## Why

Every member aged 18 or older, including beneficiaries, must provide a
behavioural integrity certificate (CIC) for each scouting
year. Members need clear instructions and a private upload workflow; central
administrators need a single place to validate documents and follow omissions.
The profile fee banner also incorrectly lets an Orgo profile date override
locally recorded membership payments.

## What Changes

- Add an accessible `Documente adulți` dialog launched from `/profile`, with a
  current-year CIC summary, status, rejection reasons, and
  historical scouting-year selection.
- Require only the CIC for all members aged at least 18 on the current date
  in Europe/Bucharest, independently of category or responsibilities. Do not
  infer age from category; unknown dates of birth require correction rather
  than silently marking the obligation fulfilled.
- Use September 1 through August 31, matching the existing scouting-year rule.
  Default uploads to the current scouting year; allow existing historical
  years to be viewed and historical dossiers to be added explicitly.
- Treat a validated document as covering its selected scouting year for this
  internal workflow. Do not request an issue date or calculate legal expiry.
- Validate each uploaded certificate: `În verificare`, `Validat`, or
  `Respins`; an empty slot reads `Lipsește`. Rejection requires a reason visible
  to the owner. A dossier is complete when its current CIC version is
  validated. Replacing a certificate resets its validation.
- Retain historical years and replaced file versions, including their upload
  and validation history. Existing application functions remain accessible
  regardless of dossier completeness.
- Permit only the owner and explicit central administrators to read or
  download files. Council membership and structure/unit responsibilities alone
  grant no access. Enforce authorization in the API for every operation.
- Let central administrators upload on behalf of members and validate those
  uploads, recording both actions with the actual actor.
- Add the central-administrator page `Documente adulți` with scouting-year,
  member search, and missing/pending/validated/rejected filters. Open the same
  dossier dialog for upload, download, and review.
- Use private file storage and authenticated downloads, with no public file
  URLs or service-worker caching. Accept PDF, JPEG and PNG files up to 10 MiB,
  checking content, type and size on the server and preserving original PDFs.
- Record upload, replacement, validation, rejection, and administrator dossier
  access/download in the central audit journal without document contents,
  rejection text, private storage keys, or identity-document data in metadata.
- Include the user's Romanian CIC instructions: online through HUB MAI with
  Ghișeul.ro account validation (free, approximately 10 minutes), paid alternatives
  roghiseul.ro and caziere.ro, and in person at Secția de Poliție nr. 1,
  Str. Decebal nr. 26, Cluj-Napoca, regardless of residence county. No automated email
  or push notifications in this version; status and feedback appear in profile
  and the dialog.
- Derive the profile fee banner exclusively from the local current-period
  obligation and its payments. An outstanding balance prompts payment; settled
  obligations show no debt warning; unavailable local data shows a neutral
  message and a link to `/cotizatie`. Orgo fee dates cannot override this.

## Impact

- New capability: `adult-documents`.
- Extended capability: `app-shell`.
- API: authenticated adult-dossier list, owner view, upload, download and
  administrator validation; reuse existing identity, audit and private-file
  conventions without exposing these files through finance/member-profile APIs.
- Database: versioned adult-document metadata, file persistence and migration.
- Web: shared dossier dialog, profile summary, admin page, navigation gating,
  local-only fee state and regression coverage.
- No production deployment, remote push or data migration execution is included
  without a separate request.

## Official Guidance Sources

Checked October 25, 2026:

- Behavioural integrity: https://hub.mai.gov.ro/serviciu/view?id=90
- HUB account validation: https://hub.mai.gov.ro/site/despre-validare-cont

The internal annual dossier rule must not be described as extending the
certificate issuer's legal validity period.

## Approval Status

Approved by the user on October 25, 2026, with `da` after reviewing the assembled
proposal, including file formats, size limit and retained replacement versions.
The user subsequently narrowed the requirement to CIC only and supplied the
obtainment instructions during implementation on the same date.
