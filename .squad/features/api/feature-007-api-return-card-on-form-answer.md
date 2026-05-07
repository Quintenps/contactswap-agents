
# Feature: Public Exchange — Return Admin Card After Form Answer + Owner Card Upload

> Admin can upload their own contact card once via a protected endpoint. After a successful public form submission, the recipient retrieves that card via a short-lived exchange token.

**Status:** Planned  
**Assigned:** Copilot  
**Parent:** SPEC.md -> "User Flow: 3. Exchange Completes"  
**Depends On:** feature-006-api-answer-forms

---

## Goal

Complete the "contact swap" promise:

- Admin uploads their own card once via a protected config endpoint.
- Recipient submits their details.
- Admin receives recipient card (already covered by answer flow output).
- Recipient receives admin card in return.

To keep this safe, card retrieval must be protected by a short-lived token (30 minutes), scoped to the successful submission event.

---

## Scope

### In

- `PUT /v1/config/owner-card` protected admin endpoint to upload owner `.vcf`, stored in R2 as `owner/card.vcf`.
- `GET /v1/config/owner-card` protected admin endpoint to verify a card is currently stored.
- Extend answer flow to issue a short-lived retrieval token when submission succeeds.
- Add endpoint to redeem retrieval token and download admin `.vcf`.
- Add dedicated endpoint to return QR code SVG that encodes the return-card download URL.
- Token TTL: 30 minutes from issuance.
- Frontend decides desktop vs mobile behavior by calling different endpoints (no API user-agent branching).
- Unlimited downloads within the 30-minute window; only expiry enforced.

### Out

- Native app deep links.
- Any delivery channel for the admin card (email, SMS, etc.) — out of scope for now.
- Long-term recipient account/session.
- Multi-device persistent exchange history.
- **Frontend changes of any kind** — the API returns all necessary data in the response; frontend implementation is handled separately.

---

## User-Facing Flow

```
Recipient fills form
  → POST /v1/forms/:token/answer
  ← 200 OK + exchange block (retrieveToken, expiresAt)

Frontend navigates to done page
  → Done page uses exchange block from answer response
  → Desktop: calls GET /v1/forms/:token/return-card-qr?rt=<retrieveToken> and renders SVG
  → Mobile: calls GET /v1/forms/:token/return-card?rt=<retrieveToken> for direct download

Recipient scans QR (desktop) or taps download (mobile)
  → GET /v1/forms/:token/return-card?rt=<retrieveToken>
  ← Admin .vcf file served as attachment
```

The done page is responsible for calling the answer endpoint and consuming the exchange block — no background push, no separate trigger. The retrieval token is short-lived (30 min) so the window exists during the natural done-page session.

---

## Implementation Plan

### New behavior in existing files

| File | Change |
|------|--------|
| `src/api/src/routes/config.ts` | New route file: `PUT /v1/config/owner-card` and `GET /v1/config/owner-card` behind `requireApiSecret` |
| `src/api/src/index.ts` | Mount `configRoutes` at `/v1/config` |
| `src/api/src/services/answer-form.ts` | On success, create exchange token metadata (expires at now + 30 min) |
| `src/api/src/routes/forms.ts` | Extend `POST /:token/answer` response and add `GET /:token/return-card` + `GET /:token/return-card-qr` endpoints |
| `src/api/src/repositories/form-repository.ts` | Add persistence for exchange tokens (create, lookup active) |
| `src/api/src/repositories/contact-file-repository.ts` | Add `putOwnerVcf(bucket, text)` and `getOwnerVcf(bucket)` helpers for `owner/card.vcf` in R2 |
| `src/shared/src/types/api.ts` | Add answer response + return-card response contract updates |

### Data model addition (D1)

Add exchange token storage so tokens can expire and be invalidated independently of form token.

Suggested table:

```sql
CREATE TABLE form_exchange_tokens (
  id TEXT PRIMARY KEY,
  form_id TEXT NOT NULL,
  exchange_token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
);
```

Notes:

- Store token hash, never raw token.
- Only expiry is enforced at redemption time (`expires_at > now`).

### Suggested API contract

#### 0) Owner card upload (admin, protected)

```http
PUT /v1/config/owner-card
x-api-secret: <secret>
Content-Type: text/vcard

BEGIN:VCARD\r\nVERSION:3.0\r\n...
```

Success response:

```json
{ "success": true }
```

```http
GET /v1/config/owner-card
x-api-secret: <secret>
```

Success response:

```json
{ "configured": true, "updatedAt": "2026-05-03T10:00:00.000Z" }
```

Returns `{ "configured": false }` when no card is stored yet.

#### 1) Extend answer response

```http
POST /v1/forms/:token/answer
Content-Type: application/json
```

Success response:

```json
{
  "success": true,
  "completedAt": "2026-05-02T12:00:00.000Z",
  "exchange": {
    "retrieveToken": "<opaque-short-lived-token>",
    "expiresAt": "2026-05-02T12:30:00.000Z"
  }
}
```

Implementation detail:

- Frontend constructs/calls endpoint URLs and decides which experience to show.

#### 2) Add return-card retrieval endpoint (mobile/direct)

```http
GET /v1/forms/:token/return-card?rt=<retrieveToken>
```

Success behavior:

- Valid token: return admin vCard with headers:
  - `Content-Type: text/vcard; charset=utf-8`
  - `Content-Disposition: attachment; filename="contactswap-admin.vcf"`
  - `Cache-Control: no-store`
- Invalid/expired token: reject with explicit error.

#### 3) Add return-card QR endpoint (desktop)

```http
GET /v1/forms/:token/return-card-qr?rt=<retrieveToken>
```

Success behavior:

- Valid token: return SVG QR image that encodes the absolute download URL to `GET /v1/forms/:token/return-card?rt=<retrieveToken>`.
  - `Content-Type: image/svg+xml; charset=utf-8`
  - `Cache-Control: no-store`
- Invalid/expired token: reject with explicit error.

### Processing sequence

```text
1. Recipient submits POST /:token/answer.
2. Existing answer flow validates token + form status + payload.
3. Form is marked completed.
4. Service issues random retrieval token (high entropy, opaque).
5. Persist hashed retrieval token with 30-minute expiry.
6. Return exchange metadata (retrieveToken, expiresAt).
7. Frontend decides which endpoint to call:
  - Desktop: `GET /:token/return-card-qr?rt=...`
  - Mobile/direct: `GET /:token/return-card?rt=...`
8. API validates: token exists, is bound to the form token, and is not expired.
9. For download: API reads `owner/card.vcf` from R2 and streams it as vCard attachment.
10. For desktop: API returns SVG QR code for the same download URL.
```
---

## Validation and Security Rules

- Retrieval token must be cryptographically random and unguessable.
- Never store or log the raw retrieval token.
- Token TTL fixed at 30 minutes for MVP.
- Token is bound to form completion event and specific form.
- Return-card endpoint must set `Cache-Control: no-store` to reduce leakage.
- Rate-limit redemption attempts per IP + token hash.
- Errors should not leak whether form token was valid beyond necessary semantics.

---

## Response Semantics

- `PUT /v1/config/owner-card`
  - `200 OK` on successful upload
  - `400` body is not valid vCard text
  - `401/403` missing or invalid `x-api-secret`

- `GET /v1/config/owner-card`
  - `200 OK` with `{ configured: true/false }`
  - `401/403` missing or invalid `x-api-secret`

- `POST /answer`
  - `200 OK` with exchange metadata on success
  - `404` unknown form token
  - `409` already completed
  - `410` form expired
  - `422` invalid payload

- `GET /return-card`
  - `200 OK` with vCard payload (repeatable within the 30-minute window)
  - `401/403` invalid retrieval token
  - `410` retrieval token expired
  - `503 Service Unavailable` owner card not yet uploaded to R2

- `GET /return-card-qr`
  - `200 OK` with SVG payload (repeatable within the 30-minute window)
  - `401/403` invalid retrieval token
  - `410` retrieval token expired

---

## Acceptance Criteria

- [ ] AC1: `PUT /v1/config/owner-card` with valid vCard body and correct secret stores the card in R2 as `owner/card.vcf` and returns `200`.
- [ ] AC2: `GET /v1/config/owner-card` returns `{ configured: false }` before upload and `{ configured: true }` after.
- [ ] AC3: Both config endpoints reject requests without a valid `x-api-secret`.
- [ ] AC4: Successful form answer returns exchange block with `retrieveToken` and `expiresAt` set to ~30 minutes in the future.
- [ ] AC5: Return-card endpoint serves a valid admin `.vcf` when token is active.
- [ ] AC6: Expired retrieval token is rejected with `410`.
- [ ] AC7: Desktop flow can call `GET /return-card-qr` and render SVG QR that redeems successfully.
- [ ] AC8: Token can be redeemed multiple times within the 30-minute window.
- [ ] AC9: Mobile flow can use `GET /return-card` for direct download without scanning.
- [ ] AC10: Raw retrieval tokens are not stored in D1, only hashes.
- [ ] AC11: Return-card responses include `Content-Disposition` attachment filename and `no-store` cache directive.
- [ ] AC12: Return-card endpoint returns `503` when `owner/card.vcf` is not present in R2.

---

## Suggested Enhancements

- Add a grace refresh flow: if token expires but answer happened recently (for example within 2 hours), allow issuing one replacement token from done page with abuse controls.
- Include optional download signature (`sig`) in URL to harden against token tampering in query strings.
- Consider returning a short HTML fallback page at retrieval endpoint when `Accept: text/html` so non-technical users can tap "Download contact".
- Add anti-automation checks (simple proof-of-work or challenge after repeated failures) if abuse appears.
- Add telemetry fields: token issued, redeemed, expired, consumed twice attempted.

---

## Owner Card Storage

The admin (owner) card is stored in R2 under the fixed key `owner/card.vcf`. It is uploaded once via `PUT /v1/config/owner-card` (also in this feature). The return-card endpoint reads this key at request time and streams it directly — no on-the-fly generation, no D1 lookup.

If the key does not exist in R2 (owner card not yet configured), the endpoint returns `503 Service Unavailable` rather than silently failing.

---

## Notes

- This feature intentionally keeps admin data exposure narrow: only after valid submission and only with short-lived retrieval authorization.
- Keeping QR and direct download as separate endpoints avoids brittle server-side device detection; frontend can choose best UX and keep a fallback path.
- This is a natural continuation of the exchange promise in the product name: contact swap is complete only when both sides can obtain each other's card.
