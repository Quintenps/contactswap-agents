# Feature: API - Total Contact Swaps Metric

> `POST /v1/forms/:token/answer` response includes a `totalContactSwaps` field, reflecting the cumulative count of successfully completed form submissions at the time of response.

**Status:** Planned  
**Assigned:** Copilot  
**Parent:** feature-006-api-answer-forms  
**Depends On:** feature-006-api-answer-forms

---

## Goal

Provide the frontend with the total number of successful contact swaps immediately after a form is answered so the done experience can show live proof of activity.

The number should feel fun and rewarding for users, while also signaling trustworthiness by showing that the product is actively used by real people.

---

## Scope

### In

- `POST /v1/forms/:token/answer` response contract extended with `totalContactSwaps` numeric field
- Durable counter persisted in D1 (for example: a small `app_stats` row keyed by `total_contact_swaps`)
- Service layer integration to increment and return the counter when a form answer is successfully completed
- No query parameters or configuration required to enable this metric

### Out

- Frontend rendering or visualization of the metric
- Analytics dashboards or historical breakdowns by date, requester, or template
- Filtering or segmentation of counts by any criteria
- Webhook or event delivery based on milestone thresholds

---

## Implementation Plan

### New behavior in existing files

| File | Change |
|------|--------|
| `src/api/src/routes/forms.ts` | Keep answer endpoint response mapping aligned with new response field |
| `src/api/src/services/answer-form.ts` | After marking form as completed, increment and read the durable total counter and include it in response |
| `src/api/src/repositories/form-repository.ts` | Add repository helpers to initialize/read/increment the total contact swaps counter |
| `src/api/migrations/` | Add migration for a tiny metrics storage structure (counter row/table) |
| `src/shared/src/types/api.ts` | Update `AnswerFormResponse` to include `totalContactSwaps: number` |

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
  }
}
```

#### Response

```json
{
  "success": true,
  "completedAt": "2026-04-29T11:02:00.000Z",
  "totalContactSwaps": 42
}
```

### Processing sequence

```text
1. Process form submission through the existing answer flow.
2. Mark form as completed in D1.
3. Increment the durable total contact swaps counter in D1.
4. Read the updated counter value as totalContactSwaps.
5. Return 200 OK with the complete response structure.
```

---

## Acceptance Criteria

- [ ] AC1: `POST /v1/forms/:token/answer` with a valid pending form returns `200` with `totalContactSwaps`
- [ ] AC2: `totalContactSwaps` is a non-negative integer
- [ ] AC3: `totalContactSwaps` reflects the durable counter value after this submission commits
- [ ] AC4: No additional query parameters or headers are required to retrieve this metric
- [ ] AC5: Metric is included in every successful answer response
- [ ] AC6: Shared API types include `totalContactSwaps` on `AnswerFormResponse`
- [ ] AC7: Invalid submissions continue to return the existing error statuses and do not include this field
- [ ] AC8: Cleanup of form answer artifacts does not reduce or reset `totalContactSwaps`

---

## Edge Cases and Error Behavior

- Counter reflects committed state only: increment `totalContactSwaps` only after completion is written.
- Global metric: counter is platform-wide, not requester-specific.
- Concurrent submissions: increments must be atomic so values remain monotonic.
- Data cleanup safety: removing old form answer artifacts must not affect the stored counter.
- No extra request shape: endpoint behavior remains unchanged aside from the added success field.

---

## Notes

- This feature uses a durable API-side counter instead of runtime `COUNT(*)` queries.
- This design is resilient to cleanup jobs that remove historical answer artifacts.
- This file is API-only by design; frontend rendering should be tracked in a separate frontend feature file.
