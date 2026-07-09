# PRD: Keez Email Handoff For Financial Documents

## Problem Statement

Keez does not currently expose an API for generic accounting document upload. The accountant team confirmed that documents sent by email to the company-CUI Keez mailbox, from the Keez account email, are automatically loaded into Keez under Contabilitate -> Documente.

Resurse already lets users upload `Document financiar` records, but the app needs a dependable way to hand those documents to accounting without tying the workflow to a personal email account or requiring a finance user to download and forward files manually.

## Solution

Resurse will send approved or direct-mode financial documents to accounting by email through the Gmail account `cluj.napoca@scout.ro`. The document email will be sent to the Keez mailbox configured in secrets, one email per financial document, with the file attached under a generated traceable name such as `document-financiar-000123.pdf`.

Regular users will see the destination as `contabilitate`. Finance administrators will see the technical Keez/Gmail details in settings, audit records, and handoff attempts.

The official organization name used in the email body is `ASOCIAŢIA ORGANIZAŢIA NAŢIONALĂ CERCETAŞII ROMÂNIEI FILIALA CLUJ`.

The email subject remains shorter: `Document financiar Resurse Scouts Cluj - #000123`.

## User Stories

1. As a regular user, I want to upload a financial document and understand whether it goes to accounting immediately or after review, so that I know what happens next.
2. As a regular user, I want the app to say `contabilitate` rather than `Keez`, so that the workflow uses familiar language.
3. As a regular user, I do not want to see technical sender or recipient addresses, so that the upload screen stays simple.
4. As a `Responsabil financiar`, I want to choose between review-first and direct-to-accounting handoff, so that the center can match its current finance operating mode.
5. As a `Responsabil financiar`, I want direct mode blocked unless the Gmail/Keez handoff is correctly configured, so that uploads do not silently fail.
6. As a `Responsabil financiar`, I want to approve a document and send it to accounting, so that reviewed documents reach Keez without manual forwarding.
7. As a `Responsabil financiar`, I want a failed send to produce a clear `send_failed` state, so that I can filter and retry it.
8. As a `Responsabil financiar`, I want to retry failed sends, so that transient Gmail/API errors do not require re-uploading the document.
9. As a `Responsabil financiar`, I want to explicitly resend an already sent document, so that I can recover when accounting reports that a file was not received.
10. As a `Responsabil financiar`, I want every send/resend attempt logged with sender, recipient, timestamp, outcome, and provider message id or error, so that the handoff is auditable.
11. As a `Responsabil financiar`, I want the attachment renamed to a simple generated number, so that Keez receives clean filenames while Resurse keeps the original filename for audit.
12. As a `Responsabil financiar`, I want duplicate file checks by checksum, so that exact duplicate documents are not sent automatically by mistake.
13. As a developer, I want the Gmail sender behind an adapter, so that the app can later switch to a real Keez API if Keez adds generic document management.
14. As a developer, I want outbound-only Gmail integration in v1, so that bounces and Keez replies remain manually inspectable in the mailbox until structured inbound processing is justified.

## Implementation Decisions

- Use `cluj.napoca@scout.ro` as the Keez user/sender.
- Use Gmail API send semantics rather than EC2-hosted email or generic SMTP.
- Keep `review_first` and `direct_to_keez` as the existing handoff modes.
- In `review_first`, finance users review the document and trigger sending.
- In `direct_to_keez`, the system attempts to send after upload once automatic checks pass.
- Send one email per document, even when a finance user triggers a bulk operation later.
- Treat `sent` as "Gmail accepted the message", not "Keez processed the document".
- Store provider message id, timestamp, sender, recipient, and errors on handoff attempts.
- Add a distinct `send_failed` document status.
- Allow explicit audited resend for already sent documents.
- Detect exact duplicate uploads by SHA-256 checksum and avoid automatic duplicate sending.
- Keep original filenames in Resurse, but send generated attachment names of the form `document-financiar-000123.ext`.
- Use user-facing copy `contabilitate` for regular users.
- Use `Keez`, the configured company-CUI Keez mailbox, and `cluj.napoca@scout.ro` only in finance/admin surfaces and audit data.
- Keep inbound Keez/Gmail reply processing out of v1.

## Testing Decisions

- Service tests should cover direct-mode upload send success, send failure, review-mode manual send, retry, resend, duplicate checksum blocking, and generated attachment names.
- Adapter tests should mock Gmail token and send responses without calling Google.
- Controller tests should enforce finance-manager permissions on settings, send, retry, and resend endpoints.
- Web route/action tests or type checks should cover user-facing upload warnings and finance admin send actions.
- Tests should assert external behavior and stored audit data, not Gmail implementation details.

## Out of Scope

- Reading Keez confirmations or Gmail bounces automatically.
- Building a full Google OAuth connect UI in the first implementation slice if the deployment can start with server-side credentials.
- Creating accounting entries or transaction links in Keez.
- Replacing Keez with local accounting.
- OCR, automatic metadata extraction, or automatic document-to-transaction matching.
- Sending batches as a single email.

## Further Notes

Configuration must make the expected sender and recipient explicit. `direct_to_keez` must remain unavailable unless the handoff is configured for the expected sender `cluj.napoca@scout.ro` and a non-empty company-CUI Keez recipient.
