# Feature: Admin — Create Form via VCF Upload

> `POST /v1/forms` — authenticated endpoint that accepts a VCF file, parses its fields, optionally uploads a photo to R2, and creates a pre-filled form record.

**Status:** Planned  
**Assigned:** Copilot  
**Parent:** SPEC.md → "User Flow: 1. You Upload a Contact"  
**Depends On:** feature-001-api-health (Hono bootstrap exists)

---

## Goal

Give the administrator (single requester) an endpoint to create a new form by uploading an existing contact card. The system parses the VCF, extracts all known fields as pre-fill values, strips and stores any embedded photo in R2, stores the original VCF in R2, snapshots the chosen template's field config, inserts a form row in D1, and returns the shareable form URL.

---

## Scope

### In

- `POST /v1/forms` endpoint, protected by `x-api-secret` header middleware
- `multipart/form-data` request body with two fields:
  - `vcf` — the uploaded `.vcf` file (binary/text)
  - `templateId` — UUID of the template to use
- VCF parser (`src/api/src/lib/vcf-parser.ts`) mapping VCF properties to the `FieldKey` set defined in `@contactswap/shared`
- Photo extraction: if the VCF contains a `PHOTO` property (base64 encoded), detect its MIME type from the VCF declaration (`TYPE=JPEG`, `TYPE=PNG`, or data URI prefix), decode it, and upload to R2 as `forms/{token}/photo.{ext}` with the correct `contentType`; strip it from the stored VCF
- Original VCF (with photo stripped) stored at `forms/{token}/original.vcf` in R2
- Template existence validated against D1 before proceeding
- Template seed data initialized in D1 so at least one usable template exists in fresh environments (local + production)
- Template `fields` JSON column snapshotted into `field_config` on the new form row (changes to the template must not affect existing forms)
- Extracted contact fields serialized as a `prefilled` JSON column (`Record<string, string>`) on the form row — avoids R2 read + re-parse on every form page load
- D1 migration `0002_add_prefilled_column.sql` adds `prefilled TEXT NOT NULL DEFAULT '{}'` to the `forms` table
- Secure token generated with `crypto.getRandomValues` (32 random bytes, hex-encoded → 64-char string)
- Form `id` generated as a UUID via `crypto.randomUUID()`
- `expires_at` set to `createdAt + 30 days`
- Response: `201 Created` with `CreateFormResponse` shape (already defined in `@contactswap/shared`)
- `requireApiSecret` middleware created in `src/api/src/middleware/require-api-secret.ts` and applied to the forms router
- Forms router mounted in `src/api/src/index.ts` as `app.route('/v1/forms', formRoutes)`
- `src/api/src/index.ts` updated to the full pattern shown in SPEC.md (logger, cors, notFound, onError, versioned routes)

### Out

- Template CRUD endpoints (separate feature)
- Parsing fields beyond the 14 known `FieldKey` values — unknown VCF lines are silently ignored
- Photo resizing/re-encoding (that belongs to the submission flow; here we only extract and store what's in the VCF as-is)
- Form listing / retrieval endpoints
- Any frontend changes

---

## Implementation Plan

### New files

| File | Purpose |
|------|---------|
| `src/api/src/lib/vcf-parser.ts` | Pure function: `parseVcf(raw: string): { contact: Contact; photoBase64: string \| null; photoMimeType: string \| null }` |
| `src/api/src/routes/forms.ts` | Hono sub-app with `POST /` handler |
| `src/api/src/middleware/require-api-secret.ts` | `MiddlewareHandler` that checks `x-api-secret` against `c.env.API_SECRET` |
| `src/api/migrations/0002_add_prefilled_column.sql` | Adds `prefilled TEXT NOT NULL DEFAULT '{}'` to `forms` |
| `src/api/migrations/0003_seed_templates.sql` | Inserts baseline template rows using idempotent SQL (`INSERT ... ON CONFLICT DO UPDATE`) |

### Modified files

| File | Change |
|------|--------|
| `src/api/src/index.ts` | Full update per SPEC.md pattern: logger, cors, notFound, onError, mount `formRoutes` at `/v1/forms` |

### VCF field mapping

| VCF property / pattern | `FieldKey` |
|------------------------|-----------|
| `FN` | `full_name` |
| `EMAIL;TYPE=WORK` or `EMAIL;type=work` | `work_email` |
| `EMAIL;TYPE=HOME` or bare `EMAIL` (first occurrence without WORK) | `personal_email` |
| `TEL;TYPE=WORK` | `work_phone` |
| `TEL;TYPE=CELL` | `cell_phone` |
| `TEL;TYPE=HOME` | `home_phone` |
| `ADR;TYPE=WORK` | `work_address` |
| `ADR;TYPE=HOME` | `home_address` |
| `ORG` | `company` |
| `TITLE` | `job_title` |
| `URL` | `website` |
| `BDAY` | `birthday` |
| `NOTE` | `notes` |
| `PHOTO` | extracted separately, not put in prefilled map |

Address (`ADR`) values are semicolon-delimited per vCard spec; join non-empty parts with `, ` for the prefilled string.

### Request shape

```
POST /v1/forms
Content-Type: multipart/form-data
x-api-secret: <secret>

--boundary
Content-Disposition: form-data; name="vcf"; filename="contact.vcf"
Content-Type: text/vcard

BEGIN:VCARD
...
END:VCARD
--boundary
Content-Disposition: form-data; name="templateId"

550e8400-e29b-41d4-a716-446655440000
--boundary--
```

### Processing sequence

```
1. requireApiSecret middleware → 401 if missing/wrong
2. Parse multipart body → extract vcf text + templateId string
3. Validate templateId: zValidator on form fields (templateId: z.string().uuid())
4. Ensure template seed migration has been applied (baseline templates exist in DB)
5. Load template from D1 → 404 if not found
6. parseVcf(vcfText) → { contact, photoBase64, photoMimeType }
7. Generate token = hex(crypto.getRandomValues(new Uint8Array(32)))
8. Generate id = crypto.randomUUID()
9. If photoBase64:
     ext = mimeTypeToExt(photoMimeType)  // e.g. 'image/jpeg' → 'jpg', 'image/png' → 'png'
     decode base64 → Uint8Array
     R2.put(`forms/${token}/photo.${ext}`, bytes, { httpMetadata: { contentType: photoMimeType } })
10. R2.put(`forms/${token}/original.vcf`, vcfText, { httpMetadata: { contentType: 'text/vcard' } })
11. Build prefilled: Record<string, string> from Contact fields that are present
12. Build field_config: JSON.stringify(template.fields)  ← snapshot
13. Insert into forms (D1):
      id, token, template_id, field_config, prefilled, original_contact_url, original_contact_name,
      status='pending', expires_at=now+30d
    prefilled = JSON.stringify(prefilledMap)
    original_contact_url = `forms/${token}/original.vcf`  (R2 key, not a public URL)
    original_contact_name = contact.fullName
14. Return 201:
    { id, token, url: `https://contactswap.app/form/${token}`, expiresAt }
```

### Template seed requirements

- Seed data is managed through D1 migrations, not ad-hoc runtime inserts.
- Seed migration must be idempotent so it can run safely in local, staging, and production.
- At minimum, one default template row must exist (`is_default = 1`) with valid `fields` JSON matching shared `FieldKey` values.
- If a seeded template row already exists (same `id` or unique `name`), migration should update mutable fields (`description`, `fields`, `is_default`, `updated_at`) and preserve stable identity.
- Local setup (`npm run db:migrate:api:local`) and production rollout (`npm run db:migrate:api`) both initialize the same baseline template set.

### Error responses

| Condition | Status | `error` string |
|-----------|--------|---------------|
| Missing / wrong `x-api-secret` | 401 | `"Unauthorized"` |
| `templateId` not a valid UUID | 422 | Zod validation error details |
| `vcf` field missing or empty | 422 | `"vcf field is required"` |
| Template not found in DB | 404 | `"Template not found"` |
| VCF has no `FN` / empty name | 422 | `"VCF must contain a full name (FN)"` |

---

## Acceptance Criteria

- [ ] AC1: `POST /v1/forms` with a valid VCF and a known `templateId` returns `201` with `{ id, token, url, expiresAt }`
- [ ] AC2: The token in the returned URL is 64 hex characters (32 bytes)
- [ ] AC3: A row is present in `forms` with `status = 'pending'` and `expires_at` ~30 days from now
- [ ] AC4: The original VCF text is stored in R2 at `forms/{token}/original.vcf`
- [ ] AC5: When the VCF contains a `PHOTO;TYPE=JPEG` property, the file stored in R2 has `contentType: image/jpeg`; when it's `TYPE=PNG`, it has `contentType: image/png`
- [ ] AC6: The `field_config` on the form row matches the template's `fields` at creation time (snapshot, not a live reference)
- [ ] AC7: The `prefilled` column on the form row contains a JSON object with the parsed contact fields — no R2 read required to render the form
- [ ] AC8: `POST /v1/forms` without the `x-api-secret` header returns `401`
- [ ] AC9: `POST /v1/forms` with an unknown `templateId` UUID returns `404`
- [ ] AC10: `POST /v1/forms` with a VCF missing `FN` returns `422`
- [ ] AC11: The `index.ts` entry point uses the full SPEC.md pattern (logger, cors, notFound, onError)
- [ ] AC12: On a fresh DB, running migrations creates at least one template row with `is_default = 1`
- [ ] AC13: Re-running migrations does not create duplicate template rows (idempotent seed behavior)

---

## Notes

- VCF parsing must be tolerant of both `CRLF` and `LF` line endings and case-insensitive property names — real-world VCF files vary.
- `PHOTO` in vCard 3.0 is `PHOTO;ENCODING=b;TYPE=JPEG:<base64>` and in vCard 4.0 is `PHOTO:data:image/jpeg;base64,<data>` — handle both formats.
- Folded lines (continuation lines starting with a space or tab per RFC 6350) must be unfolded before parsing.
- The prefilled map **is** stored as a `prefilled` JSON column in D1. The VCF in R2 remains the archival source of truth for generating the final contact on submission, but the pre-fill data is cheap to store and avoids a R2 round-trip on every form page view.
- `original_contact_url` stores the R2 object key (not a signed URL); the form-read endpoint will generate a presigned URL when needed.
- MIME type detection order for photos: check `TYPE=` parameter on the `PHOTO` property first; if absent, check data URI prefix (`data:image/...;base64,...`); fall back to `image/jpeg` if neither is present.
