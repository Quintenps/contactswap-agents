# Feature: API - Persist Form Answer

> When a form is answered, the generated VCF (including any photo) is stored in R2 and the object key is saved to the `forms` table so the answer can be retrieved at any time, independent of email delivery.

**Status:** In Progress  
**Assigned:** Gus  
**Parent:** feature-006-api-answer-forms  
**Depends On:** feature-006-api-answer-forms

---

## Goal

Email delivery is unreliable. If the email sent by `send-form-answer-email` fails or is lost, the submitted contact information is currently unrecoverable. Storing the generated VCF in R2 and recording its key in D1 ensures the answer is always retrievable, regardless of email delivery outcome. The VCF is the canonical representation of the answer — it already includes all fields and any photo — so no additional serialisation is needed.

Storing the file in R2 (rather than inline in D1) keeps base64-encoded photo data out of the database entirely, consistent with how the rest of the codebase handles binary contact content.

---

## Scope

### In

- New nullable `answer_vcf_key` column (text) added to the `forms` table via a D1 migration — stores the R2 object key of the answer VCF
- The generated VCF is written to R2 at key `forms/{token}/answer.vcf` before `markFormCompleted` is called
- `markFormCompleted` is extended to accept the R2 key and write it atomically in the same `UPDATE` statement
- A new `putAnswerVcf` helper added to `contact-file-repository.ts` (mirrors the existing `putOriginalVcf`)

### Out

- A new endpoint to retrieve the saved answer — this is a separate concern
- Any changes to existing response contracts
- Exposing the saved answer to the form submitter (the person filling in the form)
- Storing raw field values as JSON in D1

---

## Implementation Plan

### New behavior in existing files

| File | Change |
|------|--------|
| `src/api/migrations/` | Add `0013_add_answer_vcf_key_to_forms.sql` — `ALTER TABLE forms ADD COLUMN answer_vcf_key TEXT` |
| `src/api/src/repositories/contact-file-repository.ts` | Add `putAnswerVcf(bucket, token, vcfText)` — writes to `forms/{token}/answer.vcf` |
| `src/api/src/repositories/form-repository.ts` | Extend `markFormCompleted` to accept `answerVcfKey` and write it in the same `UPDATE` statement |
| `src/api/src/services/answer-form.ts` | Store the VCF in R2 before calling `markFormCompleted`; pass the R2 key to it |

### Migration

```sql
-- Store the R2 key of the submitted answer VCF so it can be retrieved independently of email delivery
ALTER TABLE forms ADD COLUMN answer_vcf_key TEXT;
```

The column is nullable to preserve compatibility with existing rows completed before this migration.

### R2 key convention

```
forms/{token}/answer.vcf
```

This is consistent with the existing pattern for per-form R2 objects and makes it easy to scope deletions by token prefix if a form is ever cleaned up.

### Repository changes

**`contact-file-repository.ts`** — new helper:

```ts
export async function putAnswerVcf(
  bucket: R2Bucket,
  token: string,
  vcfText: string,
): Promise<string> {
  const key = `forms/${token}/answer.vcf`;
  await bucket.put(key, vcfText, {
    httpMetadata: { contentType: 'text/vcard' },
  });
  return key;
}
```

**`form-repository.ts`** — extended `markFormCompleted` signature:

```ts
export async function markFormCompleted(
  db: D1Database,
  token: string,
  completedAt: string,
  answerVcfKey: string,
): Promise<boolean>
```

The `UPDATE` statement becomes:

```sql
UPDATE forms
SET status = 'completed', completed_at = ?1, answer_vcf_key = ?2
WHERE token = ?3 AND status = 'pending' AND expires_at > ?4
```

### Processing sequence

```text
1. Validate submitted fields (existing flow).
2. Generate VCF from submitted fields and photo (existing flow — already happens before markFormCompleted).
3. Write the VCF to R2 at forms/{token}/answer.vcf → receive the key.
4. Call markFormCompleted with completedAt and the R2 key.
5. If markFormCompleted returns false, the form was already completed — throw 409 (existing behaviour).
   Note: the R2 write in step 3 is a no-op to clean up; it is overwritten or can be left as an orphan
   since the form row is not updated.
6. Continue with email send, exchange token creation (existing flow).
```

---

## Acceptance Criteria

- [ ] AC1: After a successful `POST /v1/forms/:token/answer`, the `answer_vcf_key` column in `forms` contains the R2 object key of the answer VCF
- [ ] AC2: The R2 object at the stored key is a valid vCard 3.0 file containing the submitted fields and photo (if provided)
- [ ] AC3: Existing rows completed before the migration retain `answer_vcf_key = NULL` without error
- [ ] AC4: If `markFormCompleted` returns false (race condition / already completed), no key is written to the form row and the existing 409 response is returned
- [ ] AC5: Email delivery failure does not prevent or undo the persisted VCF or the stored key
- [ ] AC6: The answer VCF key is not exposed in any existing response contract
- [ ] AC7: No base64-encoded photo data is stored in D1

---
