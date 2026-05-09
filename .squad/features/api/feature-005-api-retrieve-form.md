# Feature: Public — Retrieve Form

> `GET /v1/forms/:token` — public endpoint that loads the form data needed to render the pre-filled contact form UI.

**Status:** Planned  
**Assigned:** Copilot  
**Parent:** SPEC.md -> "User Flow: 2. Recipient Fills the Form"  
**Depends On:** feature-002-api-create-form

---

## Goal

Give the frontend a single endpoint to load everything needed to render the form page for a given token: the contact name, the field configuration, and any pre-filled values.

The response must not expose internal identifiers or storage keys. The endpoint handles expired and already-completed forms gracefully so the UI can show the right state without an additional check.

This endpoint is public-by-token, not admin-authenticated.

---

## Scope

### In

- `GET /v1/forms/:token` endpoint under the existing forms router
- Public access using the secure form `token` in the URL path
- Token format validation (64 hex characters)
- Form lookup from D1 by token
- Expiry check: forms past `expires_at` return `410`
- Completed check: forms with `status = 'completed'` return `409` with a minimal payload so the UI can show a "already submitted" state
- Success response uses existing `FormData` shape from `@contactswap/shared`:
  - `token`
  - `contactName` (from `original_contact_name`)
  - `fields` (from stored `field_config` snapshot)
  - `prefilled` (from stored `prefilled` JSON column)
  - `status`
  - `expiresAt`
- No sensitive internal fields exposed (`id`, `template_id`, `original_contact_url`)

### Out

- Admin authentication for this endpoint
- Returning full `Form` object with internal keys
- Generating presigned R2 URLs for the original VCF on this endpoint
- Any mutation of the form row

---

## Implementation Plan

### New behavior in existing files

| File | Change |
|------|--------|
| `src/api/src/repositories/form-repository.ts` | Add `getFormByToken` query returning the fields needed for `FormData` |
| `src/api/src/routes/forms.ts` | Add `GET /:token` public handler with token validation and status checks |
| `src/shared/src/types/api.ts` | No new types needed — reuse existing `FormData` from `@contactswap/shared` |

### Request

```http
GET /v1/forms/4e0c4d3d8c0b7d8f8d9e1c2a3b4f5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2
```

### Response (pending form)

```json
{
  "token": "4e0c4d3d8c0b7d8f8d9e1c2a3b4f5d6e7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
  "contactName": "Jane Doe",
  "fields": [
    { "fieldKey": "full_name", "required": true, "order": 1 },
    { "fieldKey": "work_email", "required": false, "order": 2 },
    { "fieldKey": "cell_phone", "required": false, "order": 3 }
  ],
  "prefilled": {
    "full_name": "Jane Doe",
    "work_email": "jane.doe@company.com"
  },
  "status": "pending",
  "expiresAt": "2026-05-29T11:02:00.000Z"
}
```

### Processing sequence

```text
1. Read `token` from path.
2. Validate token format (64 lowercase hex characters) → 422 if invalid.
3. Load form row from D1 by token.
4. Return 404 if token is unknown.
5. Return 410 if form is expired (expiresAt < now).
6. Return 409 if form status is already 'completed'.
7. Map D1 row to FormData shape.
8. Return 200 with FormData payload.
```

### Validation rules

- `token` must be a 64-character lowercase hex string.
- Invalid token format returns `422`.

### Error responses

| Condition | Status | `error` string |
|-----------|--------|---------------|
| Invalid token format | 422 | validation error message |
| Unknown token | 404 | `"Form not found"` |
| Form already completed | 409 | `"Form has already been submitted"` |
| Form expired | 410 | `"Form has expired"` |

---

## Acceptance Criteria

- [ ] AC1: `GET /v1/forms/:token` with a valid pending form returns `200` and a `FormData` payload
- [ ] AC2: Response includes `fields` from the stored `field_config` snapshot, not the current template row
- [ ] AC3: Response includes `prefilled` values from the stored `prefilled` column
- [ ] AC4: Response does not expose `id`, `template_id`, or `original_contact_url`
- [ ] AC5: Unknown token returns `404`
- [ ] AC6: Expired form returns `410`
- [ ] AC7: Already-completed form returns `409`
- [ ] AC8: Invalid token format returns `422`
- [ ] AC9: No `x-api-secret` is required to call this endpoint

---

## Suggestions

- This endpoint is the natural prerequisite for feature-006 (answer form): the frontend calls this to render the form, then calls `POST /:token/answer` on submit.
- Because this endpoint is public and token-based, keep it deliberately minimal — no additional form metadata that could leak internal state.

---

## Notes

- `prefilled` is already stored as a JSON column on the form row from feature-002, so no R2 read is needed to serve this response.
- `field_config` is also already stored as a JSON snapshot — fields reflect what was configured at form creation time, not the current template.
- The expiry check here should be wall-clock based (`expiresAt < now`), not solely rely on `status = 'expired'` in case the cron job has not yet run.
