# Feature: Admin — List Created Forms

> `GET /v1/forms` — authenticated endpoint to list created forms with pagination and optional status filtering.

**Status:** Planned  
**Assigned:** Copilot  
**Parent:** SPEC.md -> Route Organization (versioned forms routes)  
**Depends On:** feature-002-api-create-form

---

## Goal

Give the administrator a reliable, authenticated endpoint to view created forms, newest first, with lightweight pagination so the list remains stable as data grows.

This feature is API-only.

---

## Scope

### In

- `GET /v1/forms` endpoint under the existing forms router
- Route is admin-only via existing `requireApiSecret` middleware (`x-api-secret`)
- Query parameters:
  - `limit` (optional, integer)
  - `offset` (optional, integer)
  - `status` (optional; one of `pending | completed | expired`)
- Response shape uses existing shared type contract:
  - `forms[]` with summary fields only
  - `total`, `limit`, `offset`
- Sort order: `created_at DESC` (newest first)
- Validation and safe defaults:
  - default `limit = 20`
  - max `limit = 100`
  - default `offset = 0`
- Include `total` count that respects the active filter (same `status` constraint as list query)
- Keep implementation in repository + route layers (no business logic in route handler)

### Out

- Public access to list forms
- Cursor pagination (future enhancement)
- Full form detail payloads (field config, prefilled JSON, storage keys)
- Any frontend/admin UI work

---

## Implementation Plan

### New behavior in existing files

| File | Change |
|------|--------|
| `src/api/src/repositories/form-repository.ts` | Add list query function with `limit`, `offset`, optional `status`, and total count query |
| `src/api/src/routes/forms.ts` | Add `GET /` handler with query validation and response mapping |
| `src/api/src/index.ts` | No routing changes expected (forms router already mounted at `/v1/forms`) |

### Request

```http
GET /v1/forms?limit=20&offset=0&status=pending
x-api-secret: <secret>
```

### Response

```json
{
  "forms": [
    {
      "id": "7f4c8a9e-2d8f-4a79-9f4d-16b7a0f31f72",
      "token": "<token>",
      "originalContactName": "Ada Lovelace",
      "status": "pending",
      "createdAt": "2026-04-28T11:02:00.000Z",
      "completedAt": null,
      "expiresAt": "2026-05-28T11:02:00.000Z"
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### Query semantics

- Base list query:
  - `SELECT ... FROM forms ORDER BY created_at DESC LIMIT ? OFFSET ?`
- Optional status filter:
  - `WHERE status = ?`
- Total query:
  - `SELECT COUNT(*) FROM forms` (+ same optional `WHERE status = ?`)

### Validation rules

- `limit` must be an integer in range `1..100`
- `offset` must be an integer `>= 0`
- `status` must be one of `pending | completed | expired`
- Invalid query params return `422`

### Error responses

| Condition | Status | `error` string |
|-----------|--------|---------------|
| Missing / wrong `x-api-secret` | 401 | `"Unauthorized"` |
| Invalid `limit`, `offset`, or `status` query | 422 | validation error message |

---

## Acceptance Criteria

- [ ] AC1: `GET /v1/forms` with valid admin secret returns `200` and `ListFormsResponse` shape
- [ ] AC2: Route is protected by `requireApiSecret` middleware; request without secret returns `401`
- [ ] AC3: Results are sorted by `created_at DESC`
- [ ] AC4: Default pagination is applied when query params are omitted (`limit=20`, `offset=0`)
- [ ] AC5: `limit` is capped at `100`
- [ ] AC6: Optional `status` filter returns only matching rows and `total` reflects that same filter
- [ ] AC7: Invalid pagination/status query params return `422`
- [ ] AC8: Only summary fields are returned (no `field_config`, `prefilled`, or storage object keys)

---

## Suggestions

- Add DB index for list ordering/filtering if list traffic grows:
  - `CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at DESC);`
  - If status filtering becomes common, consider: `CREATE INDEX IF NOT EXISTS idx_forms_status_created_at ON forms(status, created_at DESC);`
- Keep offset pagination now (simple and sufficient), but consider cursor pagination later for better consistency on very large datasets.
- Optional quality-of-life enhancement: support `limit=0` as metadata-only mode (`forms: []`, with `total`) for lightweight admin dashboards.

---

## Notes

- Shared API types already include `ListFormsQuery` and `ListFormsResponse`, so this feature aligns with existing contracts.
- Existing `forms` table indexes already include `status`; adding `created_at` index is a targeted optimization, not required for initial delivery.
