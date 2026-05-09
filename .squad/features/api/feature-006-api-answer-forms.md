# Feature: Public — Answer Form

> `POST /v1/forms/:token/answer` — public endpoint that accepts a completed form response, generates an updated contact artifact, and marks the form as completed.

**Status:** Planned  
**Assigned:** Copilot  
**Parent:** SPEC.md -> "User Flow: 2. Recipient Fills the Form" + "User Flow: 3. Exchange Completes"  
**Depends On:** feature-002-api-create-form, feature-005-api-retrieve-form

---

## Goal

Give the recipient a simple, public way to submit updated contact information using the secure form URL.

The system should validate the submission against the form's field configuration, reject expired or already-completed forms, generate a valid `.vcf` from the submitted data, and then mark the form as completed without retaining the submitted response data in D1.

This feature is public-by-token, not admin-authenticated.

---

## Scope

### In

- `POST /v1/forms/:token/answer` endpoint under the existing forms router
- Public access using the secure form `token` in the URL path
- Token validation and form lookup in D1
- Status checks before accepting a submission:
  - form must exist
  - form must still be `pending`
  - form must not be expired
- Request body accepts submitted field values matching the form's `field_config`
- Server-side validation:
  - required fields enforced from `field_config`
  - unknown fields ignored or rejected explicitly
  - optional photo field supported
- Generate a new contact `.vcf` from the submitted values
- Mark form as completed in D1 (`status = completed`, `completed_at = now`)
- Do not persist submitted response payload after processing
- Response returns success metadata only; no sensitive response data echoed back

### Out

- Admin authentication (`x-api-secret`) for answer flow
- Editing a completed submission
- Saving raw submitted response data in D1
- Long-term audit trail of all submitted values
- Email delivery to the owner
- Frontend UI implementation details beyond the API contract

---

## Implementation Plan

### New behavior in existing files

| File | Change |
|------|--------|
| `src/api/src/routes/forms.ts` | Add `POST /:token/answer` public handler with token validation and response mapping |
| `src/api/src/repositories/form-repository.ts` | Add lookup-by-token and mark-completed persistence helpers |
| `src/api/src/lib/` | Add contact generation utility for `.vcf` output |
| `src/api/src/services/` | Add answer-form service to validate, generate contact output, and complete the form |
| `src/shared/src/types/api.ts` | Add answer-form request/response types if the frontend will consume shared contracts |
| `src/shared/src/types/form.ts` | Reuse `FormSubmission`; extend only if richer submission typing is needed |

### Suggested endpoint contract

#### Request

```http
POST /v1/forms/4e0c4d3d8c0b7d8f8d9e1c2a3b4f5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2/answer
Content-Type: application/json

{
  "fields": {
    "full_name": "Jane Doe",
    "work_email": "jane.doe@company.com",
    "cell_phone": "+15551234567"
  },
  "photo": "data:image/jpeg;base64,/9j/4AAQSk..."
}
```

#### Response

```json
{
  "success": true,
  "completedAt": "2026-04-29T11:02:00.000Z"
}
```

### Processing sequence

```text
1. Read `token` from path.
2. Validate token format (64 hex characters).
3. Load form row from D1 by token.
4. Return 404 if token is unknown.
5. Return 410 if form is expired.
6. Return 409 if form is already completed.
7. Parse JSON body into `fields` (+ optional `photo`).
8. Validate submitted keys against `field_config` snapshot stored on the form.
9. Enforce required fields from the template snapshot.
10. Build contact payload from submitted values.
11. Generate `.vcf` text from that payload.
12. Update form row in D1: `status = 'completed'`, `completed_at = now`.
13. Return success payload only.
```

### Validation rules

- `token` must be a 64-character lowercase hex string.
- `fields.full_name` is always required.
- Required/optional behavior comes from the form's stored `field_config` snapshot.
- Submission may include only supported `FieldKey` values.
- `photo`, when present, must be a supported image payload:
  - base64 data URI preferred (e.g., `data:image/jpeg;base64,...`)
  - JPEG or PNG only for MVP
  - Data URI payload limit: **max 55,000 base64 chars** (about 40 KB decoded image bytes)
  - Equivalent raw upload validation limit (before processing): **10 MB** max
  - Server processes to 200×200 JPEG at 80% quality (~10–30 KB output)
  - Base64-encoded result target: ~15–40 KB, embedded in vCard `PHOTO` property
  - Total vCard with photo target: ~20–50 KB (well under 100 KB email/parsing safety target)
- Empty strings for required fields return `422`.

### Response semantics

- `200 OK` on successful submission
- `404 Not Found` when token does not map to a form
- `409 Conflict` when form was already completed
- `410 Gone` when form is expired
- `422 Unprocessable Entity` for invalid payload

### Error responses

| Condition | Status | `error` string |
|-----------|--------|---------------|
| Unknown token | 404 | `"Form not found"` |
| Form already completed | 409 | `"Form has already been submitted"` |
| Form expired | 410 | `"Form has expired"` |
| Invalid token format | 422 | validation error message |
| Missing required field | 422 | validation error message |
| Unsupported field or invalid photo payload | 422 | validation error message |

---

## Acceptance Criteria

- [ ] AC1: `POST /v1/forms/:token/answer` with a valid pending form and valid payload returns `200`
- [ ] AC2: Unknown token returns `404`
- [ ] AC3: Expired form returns `410`
- [ ] AC4: Already-completed form returns `409`
- [ ] AC5: Required fields are enforced using the stored `field_config` snapshot, not the current template row
- [ ] AC6: Successful submission generates a valid `.vcf` artifact from the submitted values
- [ ] AC7: Successful submission returns only success metadata (`success`, `completedAt`)
- [ ] AC8: Successful submission updates the form row to `status = 'completed'` and sets `completed_at`
- [ ] AC9: Submitted response values are not stored in D1 after processing completes
- [ ] AC10: Re-submitting the same token after success returns `409`
- [ ] AC11: Invalid payloads return `422` with a useful validation error message

---

## Suggestions

- Split public form retrieval into its own feature if you want cleaner separation:
  - `GET /v1/forms/:token` to load `FormData`
  - `POST /v1/forms/:token/answer` to submit it
- Add lightweight rate limiting by token + IP to reduce abuse without requiring accounts.
- Add email delivery in a follow-up feature once submission and contact generation are stable.
- Consider returning `204 No Content` instead of `200` if the frontend does not need `completedAt`.
- Consider normalizing phone numbers and birthday format server-side before generating the VCF.

---

## Notes

- The product spec explicitly says form responses are processed and then immediately discarded, so D1 should store only completion metadata, not the raw submitted values.
- Because form access is public-by-token, the token must remain cryptographically unguessable and should be validated before any expensive processing.
- This feature stops at contact generation and completion state; delivery to the requester is intentionally deferred.
- The thank-you page and QR code flow belong to the frontend/app flow; for now this API only needs to return enough success state for the frontend to transition to `/form/[token]/done`.
