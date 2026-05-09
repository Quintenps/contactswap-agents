# Feature: API — Email Admin on Form Answer

> After a successful form submission, email the generated `.vcf` as an attachment to the configured admin recipient.

**Status:** Planned  
**Assigned:** Copilot  
**Parent:** SPEC.md -> "User Flow: 3. Exchange Completes"  
**Depends On:** feature-006-api-answer-forms

---

## Goal

When a recipient submits a valid form answer and the backend generates the contact `.vcf`, the API should send that `.vcf` file as an email attachment to the admin/owner address.

This feature adds post-submission delivery. It should not change the public answer endpoint contract unless needed for robust error handling and observability.

---

## Scope

### In

- Add email delivery step after successful form answer processing
- Attach generated `.vcf` file to the outgoing email
- Send to configured admin recipient address from environment/config
- Include useful email metadata:
  - subject indicating form completion
  - basic body with form token/id and completion timestamp
- Ensure idempotent behavior for already-completed forms (no duplicate sends from repeat submissions)
- Add structured logging for delivery attempts and outcomes
- Define failure handling policy (sync failure response vs async retry path)

### Out

- Rich HTML email templates
- End-user notifications
- Multi-recipient routing logic
- Webhook/event bus integration (future enhancement)
- Full background job system unless explicitly required by infra constraints

---

## Implementation Plan

### New behavior in existing files

| File | Change |
|------|--------|
| `src/api/src/services/answer-form.ts` | Extend flow to trigger email delivery with generated VCF after successful completion logic |
| `src/api/src/routes/forms.ts` | Map delivery failures to defined API response semantics (if handled synchronously) |
| `src/api/src/types/env.ts` | Add required env vars for email provider credentials and admin recipient |
| `src/api/src/constants/http.ts` | Add new error identifiers/messages for delivery failures if needed |

### New files (suggested)

| File | Purpose |
|------|---------|
| `src/api/src/services/send-form-answer-email.ts` | MailerSend email sending service |
| `src/api/src/lib/mailersend.ts` | Thin wrapper around the MailerSend HTTP API (`fetch`-based, no SDK) |

### Proposed processing sequence

```text
1. `POST /v1/forms/:token/answer` validates and processes submission (feature-006).
2. Generate `.vcf` payload from submitted values.
3. Mark form as completed in D1.
4. Build email payload with `.vcf` attachment (filename like `contact.vcf`).
5. Send email to configured admin recipient.
6. If send succeeds, return success response.
7. If send fails, apply chosen policy:
   - Option A (strict): return 502/500 and do not mark completion, or
   - Option B (resilient): keep completion, log error, and return success with warning/async retry.
```

### Delivery policy recommendation

Prefer **Option B (resilient)** for MVP:

- Keep form completion authoritative once submission is valid and VCF generation succeeds.
- Attempt email send immediately.
- If send fails, log structured error with token/form id and provider response code.
- Return success to the submitter to avoid duplicate re-submission loops.
- Add retry/backfill mechanism in a follow-up feature.

---

## Configuration

Environment variables are already established in `src/api/src/types/env.ts` per SPEC.md. No new vars are needed:

| Variable | Purpose |
|----------|---------|
| `MAILERSEND_API_KEY` | MailerSend API key for HTTP authorization |
| `OWNER_EMAIL` | Destination address (admin recipient) |

The sender address (`from`) must be a MailerSend-verified domain address. Configure it as a constant or add a `MAIL_FROM` binding if it differs per environment.

### MailerSend HTTP API (Required Approach)

Cloudflare Workers cannot use Node.js SDKs. All MailerSend calls must use `fetch` against the MailerSend REST API directly.

**Base URL:** `https://api.mailersend.com/v1`  
**Auth:** `Authorization: Bearer ${MAILERSEND_API_KEY}`  
**Endpoint:** `POST /v1/email`

Minimal request payload:

```json
{
  "from": { "email": "contactswap@yourdomain.com" },
  "to": [{ "email": "owner@example.com" }],
  "subject": "ContactSwap: Jane Doe updated their info",
  "text": "Jane Doe has filled in their contact form.\n\nTheir updated contact file is attached.\n\n—\nContactSwap",
  "attachments": [
    {
      "filename": "jane-doe.vcf",
      "content": "<base64-encoded VCF string>",
      "disposition": "attachment"
    }
  ]
}
```

Validation requirements:

- Missing `MAILERSEND_API_KEY` or `OWNER_EMAIL` must log a clear error and not attempt delivery.
- Non-2xx responses from MailerSend must be logged with status code and response body before applying failure policy.

---

## API Contract Impact

No required request payload changes for:

- `POST /v1/forms/:token/answer`

Response options:

- Keep current success response unchanged (`200` + existing payload), while logging email failures internally.
- Optionally add non-breaking metadata later (for admin/internal clients only).

---

## Acceptance Criteria

- [ ] AC1: Successful form answer triggers an email send attempt to configured admin recipient
- [ ] AC2: Email includes generated `.vcf` as an attachment with valid `text/vcard` or equivalent MIME type
- [ ] AC3: Attachment content matches the generated VCF for that submission
- [ ] AC4: Missing/invalid email configuration produces clear operational error logs
- [ ] AC5: Duplicate submission attempts for already-completed forms do not send duplicate emails
- [ ] AC6: Delivery attempts and outcomes are logged with correlation identifiers (token/form id)
- [ ] AC7: Feature behavior under provider failure follows documented policy consistently
- [ ] AC8: Existing answer-form validation and completion behaviors from feature-006 remain intact

---

## Suggestions

- Mock MailerSend at the `fetch` boundary in tests (intercept outbound `POST https://api.mailersend.com/v1/email`).
- Keep `src/api/src/lib/mailersend.ts` focused: accept typed inputs, return a typed result, throw on unrecoverable errors. Keep no business logic there.
- Add a dead-letter/retry strategy in a dedicated follow-up feature if delivery reliability becomes critical.
- Confirm sender domain is verified in MailerSend before deployment, otherwise sends will silently fail or be rejected.

---

## Notes

- This feature should be implemented after feature-006 is stable because it depends on successful VCF generation.
- MailerSend free tier allows 3,000 emails/month — well above the expected usage (~100 forms/month per SPEC.md).
- Cloudflare Workers do not support Node.js `net`/`tls`/`smtp` modules. Email must go through the MailerSend HTTP REST API only.
- Keep sensitive provider responses (API keys, full error bodies) out of client-facing errors; include details only in server logs.
- Consider adding a lightweight idempotency guard keyed by `form.id` to prevent accidental duplicate sends during retries or race conditions.
