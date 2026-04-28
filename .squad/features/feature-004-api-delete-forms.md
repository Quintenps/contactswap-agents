# Feature: Admin — Delete Created Forms

> `DELETE /v1/forms/:id` — authenticated endpoint to permanently delete a created form and its related stored files.

**Status:** Planned  
**Assigned:** Copilot  
**Parent:** SPEC.md -> Security Assumptions + Core Features  
**Depends On:** feature-002-api-create-form, feature-003-api-list-forms

---

## Goal

Give the administrator a safe, explicit way to remove previously created forms that should no longer be accessible or retained.

This route is admin-only and must not be publicly callable.

---

## Scope

### In

- `DELETE /v1/forms/:id` endpoint under the existing forms router
- Route is admin-only via existing `requireApiSecret` middleware (`x-api-secret`)
- Path parameter validation:
  - `id` must be a UUID
- Permanent delete behavior:
  - Remove form row from `forms` table
  - Remove related R2 objects under the form prefix (`forms/{token}/...`) when present
- Not-found handling:
  - Return `404` if form does not exist
- No response body on success:
  - Return `204 No Content`
- Keep implementation in repository + route layers

### Out

- Public/self-service delete
- Soft delete in MVP (`deleted_at`)
- Bulk delete endpoint
- Delete by token from this admin endpoint (path uses `id` only)

---

## Implementation Plan

### New behavior in existing files

| File | Change |
|------|--------|
| `src/api/src/repositories/form-repository.ts` | Add lookup + delete helpers (`getFormForDelete`, `deleteFormById`) |
| `src/api/src/routes/forms.ts` | Add `DELETE /:id` handler with UUID validation and response mapping |
| `src/api/src/index.ts` | No routing changes expected (forms router already mounted at `/v1/forms`) |

### Request

```http
DELETE /v1/forms/7f4c8a9e-2d8f-4a79-9f4d-16b7a0f31f72
x-api-secret: <secret>
```

### Response (success)

```http
204 No Content
```

### Deletion semantics

1. Validate `id` as UUID.
2. Query form by `id` and read at least `token` and `original_contact_url`.
3. If no form is found: return `404`.
4. Delete the row from `forms`.
5. Best-effort cleanup in R2 by prefix `forms/{token}/`:
   - remove `original.vcf`
   - remove extracted photo (any extension)
   - remove any future files under this form prefix
6. Return `204`.

### Validation rules

- `id` must be a valid UUID.
- Invalid `id` returns `422`.

### Error responses

| Condition | Status | `error` string |
|-----------|--------|---------------|
| Missing / wrong `x-api-secret` | 401 | `"Unauthorized"` |
| Invalid `id` path param | 422 | validation error message |
| Form not found | 404 | `"Form not found"` |

---

## Acceptance Criteria

- [ ] AC1: `DELETE /v1/forms/:id` with valid admin secret and existing form id returns `204`
- [ ] AC2: Route is protected by `requireApiSecret` middleware; request without secret returns `401`
- [ ] AC3: Invalid UUID in `:id` returns `422`
- [ ] AC4: Unknown form id returns `404`
- [ ] AC5: Deleted form no longer appears in `GET /v1/forms`
- [ ] AC6: Deleted form row is removed from D1 `forms` table
- [ ] AC7: Related R2 objects under `forms/{token}/` are removed (or cleanup is retried/logged if object storage delete fails)
- [ ] AC8: Successful delete response is `204` with empty body

---

## Suggestions

- Add structured audit logging for admin deletes (form id, token prefix, timestamp, actor=api-secret) so deletions are traceable.
- Consider a safety toggle for production:
  - `?confirm=true` required for deletes, or
  - optional soft delete (`deleted_at`) with nightly purge job.
- Consider a future bulk endpoint for maintenance:
  - `DELETE /v1/forms?status=expired&before=...`
- Consider idempotent-success mode (`204` even when not found) if you prefer simpler automation scripts.

---

## Notes

- Using `id` instead of `token` keeps admin operations aligned with list output and avoids exposing token-based identifiers in admin URLs.
- Prefix-based R2 cleanup keeps the design forward-compatible with additional per-form objects.
- Because this is an admin-only route, strict authentication is mandatory and must remain middleware-enforced at router level (`formRoutes.use('*', requireApiSecret)`).
