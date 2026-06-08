# Feature: API - Retrieve Form Answer

> Provide an API endpoint to retrieve the persisted answer VCF for a completed form by using the `answer_vcf_key` stored in D1.

**Status:** In Progress  
**Assigned:** Gus  
**Parent:** feature-006-api-answer-forms  
**Depends On:** feature-011-api-save-form-answer

---

## Goal

Feature 011 made answer persistence durable by storing the generated VCF in R2 and saving its object key in `forms.answer_vcf_key`. This feature exposes that persisted file through an API endpoint so the owner can retrieve the submitted contact even if email delivery failed or the attachment is unavailable.

This endpoint is intentionally owner-only and aligns with existing admin route behavior (`x-api-secret`). It is not part of the public recipient flow.

---

## Scope

### In

- New admin endpoint to download the answer VCF for a form token
- Read `answer_vcf_key` from D1 using a repository function
- Read VCF bytes from R2 using a repository function
- Return `text/vcard` response with download-friendly `Content-Disposition`
- Explicit error handling for missing form, unanswered form, missing key, and missing R2 object

### Out

- Any changes to form submission flow (`POST /v1/forms/:token/answer`)
- New public retrieval path for recipients
- Backfilling old completed forms that predate `answer_vcf_key`
- Bulk export/listing of answer files

---

## API Design

### Endpoint

- **Method:** `GET`
- **Path:** `/v1/forms/:token/answer`
- **Auth:** Required (`x-api-secret`, via existing `requireApiSecret` middleware)
- **Response Content-Type:** `text/vcard`
- **Response Body:** raw VCF file contents

### Route behavior

1. Validate `:token` with the existing token schema (`64` lowercase hex).
2. Fetch answer file metadata by token from D1 (`id`, `token`, `status`, `answer_vcf_key`, `original_contact_name`).
3. If no form row exists, return `404`.
4. If form is still `pending`, return `409` (`Form has not been submitted yet`).
5. If form is `completed` but `answer_vcf_key` is null/empty (legacy row), return `404` (`Saved answer file not found`).
6. Read object from R2 using `answer_vcf_key`.
7. If object is missing in R2, return `404` (`Saved answer file not found`).
8. Return streamed response with headers:
   - `Content-Type: text/vcard`
   - `Content-Disposition: attachment; filename="{safe-name}-answer.vcf"`
   - `Cache-Control: no-store`

### Error conditions

| Status | Condition | Error message |
|------|-----------|---------------|
| 422 | Invalid token format | `This link is not valid. Please use the full link from the original message.` |
| 404 | Form token does not exist | `Form not found` |
| 409 | Form exists but not completed | `Form has not been submitted yet` |
| 404 | Completed form with no `answer_vcf_key` (legacy) | `Saved answer file not found` |
| 404 | `answer_vcf_key` exists but R2 object missing | `Saved answer file not found` |
| 500 | Unexpected failure | existing global error handler response |

### Why this route shape

- Reuses the existing forms token namespace and route conventions.
- Keeps owner-only retrieval aligned with current admin auth model.
- Avoids introducing a second token type or public download link for sensitive submitted contact data.

---

## Implementation Plan

### New behavior in existing files

| File | Change |
|------|--------|
| `src/api/src/routes/forms.ts` | Add admin route `GET /:token/answer` with `requireApiSecret`, token validation, repository calls, and VCF streaming response |
| `src/api/src/repositories/form-repository.ts` | Add read model/query to fetch answer retrieval metadata by token (including `status` and `answer_vcf_key`) |
| `src/api/src/repositories/contact-file-repository.ts` | Add `getAnswerVcf(bucket, key)` helper returning `R2ObjectBody \| null` |
| `src/api/src/services/answer-form.ts` | No flow change required; relies on existing persisted key from feature 011 |
| `src/api/src/index.ts` | No route mounting change required (`formRoutes` already mounted at `/v1/forms`) |

### Repository contracts

**`form-repository.ts`**

```ts
export interface FormAnswerFileRecord {
  token: string;
  status: FormStatus;
  answerVcfKey: string | null;
  originalContactName: string;
}

export async function getFormAnswerFileRecordByToken(
  db: D1Database,
  token: string,
): Promise<FormAnswerFileRecord | null>
```

SQL shape:

```sql
SELECT token, status, answer_vcf_key, original_contact_name
FROM forms
WHERE token = ?1
```

**`contact-file-repository.ts`**

```ts
export async function getAnswerVcf(
  bucket: R2Bucket,
  key: string,
): Promise<R2ObjectBody | null>
```

### Suggested handler sketch

```ts
formRoutes.get('/:token/answer', requireApiSecret, async (c) => {
  // token parse
  // load form answer metadata
  // enforce completed + key present
  // read R2 object
  // stream text/vcard response
});
```

---

## Security & Data Handling

- Retrieval remains behind `x-api-secret`; no public download endpoint is introduced.
- Response uses `Cache-Control: no-store` to reduce persistence in intermediaries.
- `answer_vcf_key` remains internal and is never returned as JSON.
- Endpoint returns VCF bytes only; no additional PII fields are exposed in API payloads.

---

## Acceptance Criteria

- [ ] AC1: `GET /v1/forms/:token/answer` requires a valid `x-api-secret`; unauthorized requests are rejected by existing middleware behavior
- [ ] AC2: For a completed form with valid `answer_vcf_key` and existing R2 object, endpoint returns `200` with `text/vcard` and downloadable filename
- [ ] AC3: For unknown token, endpoint returns `404` with `Form not found`
- [ ] AC4: For pending form (not yet answered), endpoint returns `409` with `Form has not been submitted yet`
- [ ] AC5: For completed legacy row with `answer_vcf_key = NULL`, endpoint returns `404` with `Saved answer file not found`
- [ ] AC6: For completed row with key present but missing R2 object, endpoint returns `404` with `Saved answer file not found`
- [ ] AC7: Endpoint does not modify form state and does not alter existing answer submission behavior

---

## Notes

- This feature is intentionally read-only and depends on feature 011 persistence semantics.
- If later needed, a separate feature can add owner-facing UI integration in the admin area to trigger downloads from this endpoint.
