# Feature: API - CORS Origin Configuration Fixes

> Fix cross-origin behavior by separating frontend and API origins, then introducing a safe, explicit CORS origin policy for Cloudflare Workers.

**Status:** In Progress (Option A selected)  
**Assigned:** Walter  
**Parent:** feature-006-api-answer-forms  
**Depends On:** feature-006-api-answer-forms

---

## Goal

Resolve current CORS failures caused by using `API_APP_URL` for both:

1. Frontend URL generation and links.
2. API CORS allow-origin checks.

For this feature, assume:
- Frontend URL: `https://app.example.com`
- API URL: `https://app-api.example.com`

The API must allow browser requests from the frontend origin, not from its own API origin.

---

## Current Problem

### Existing behavior

The API CORS middleware currently builds its allow-list from:
- Local dev origins (`http://localhost:3000`, `http://127.0.0.1:3000`)
- `new URL(c.env.API_APP_URL).origin`

Current configuration has `API_APP_URL` effectively set to the API URL (`https://app-api.example.com`).

### Why this breaks

Browser requests originate from the frontend origin (`https://app.example.com`).
Because that origin is not in the current allow-list, CORS denies the request.

Typical failure path:
1. Browser sends preflight `OPTIONS` (or main request with `Origin: https://app.example.com`).
2. API does not echo an allowed `Access-Control-Allow-Origin` for that origin.
3. Browser blocks response access.

### Root cause

One environment variable is overloaded for two separate concerns:
- Public frontend base URL
- CORS allow-list source

These must be configured independently.

---

## Proposed Solution

### Option A: Explicit `FRONTEND_APP_URL` env var (selected implementation path)

Add a dedicated env var for allowed frontend origin:
- `FRONTEND_APP_URL=https://app.example.com`

Keep `API_APP_URL` for public link generation behavior only.

CORS decision flow:
1. Parse `FRONTEND_APP_URL` origin.
2. Union with local dev origins.
3. If incoming `Origin` matches one of those origins, echo that exact origin.
4. Otherwise, return no CORS allow-origin.

Pros:
- Clear ownership of responsibility.
- Minimal complexity.
- Strong default security posture (single explicit production origin).

Cons:
- Requires config updates per environment.

### Option B: Allow-list multiple origins via comma-separated env var (deferred alternative)

Introduce a multi-origin env var:
- `CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com`

Behavior:
- Parse, trim, normalize to origins.
- Ignore invalid entries safely.
- Match exact origin only.

Pros:
- Supports multiple trusted frontends/environments.
- Explicit and auditable.

Cons:
- Higher configuration complexity.
- Easy to misconfigure if parsing/validation is weak.

### Option C: Controlled wildcard subdomain support (deferred alternative)

Support constrained patterns such as:
- `https://*.example.com`

Security constraints required:
- Wildcard only in left-most subdomain label.
- Require explicit scheme (`https://`).
- Reject broad patterns (`*`, `*.com`, scheme-less inputs).
- Never combine wildcard with credentials unless origin reflection is strict and validated.
- Preserve exact-match priority over wildcard fallback.

Pros:
- Useful for preview deployments and tenant subdomains.

Cons:
- Highest risk if matching logic is lax.
- More complex to reason about and test.

---

## Decision

The team has explicitly chosen Option A and is moving forward with implementation now.

Option B and Option C remain documented as future/deferred alternatives and are not part of the current implementation scope.

Phased follow-up (if future needs require it):

1. Baseline now: implement Option A.
2. Extension if needed: add Option B for explicit multi-origin support.
3. Defer Option C until there is a validated product need.

Rationale:
- Option A fixes the production issue immediately with minimal risk.
- Option B covers common growth scenarios without pattern-matching risk.
- Option C should be opt-in only after clear operational need and additional tests.

Security tradeoff summary:
- Option A: lowest attack surface.
- Option B: moderate attack surface, still explicit.
- Option C: broadest surface, requires strict guardrails.

## Implementation Kickoff

Kickoff date: 2026-06-02.

Implementation is now in progress for Option A.
Immediate next steps:
1. Add `FRONTEND_APP_URL` binding and wire CORS matching to this origin.
2. Preserve local dev origins and strict origin normalization.
3. Validate preflight behavior and `Vary: Origin` handling through API test coverage and `.http` scenarios.

---

## Cloudflare Workers CORS Specifics

This implementation should align with Workers and browser CORS behavior:

1. `Origin` must be treated as request input, not trusted config.
2. Preflight `OPTIONS` should return CORS headers only when origin and requested method/headers are allowed.
3. With `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Origin` cannot be `*`; it must be a specific origin.
4. When origin can vary per request, include `Vary: Origin` to avoid cache mix-ups.
5. If preflight checks fail, return a non-allowing response (no permissive CORS headers).

---

## Implementation Plan

### Target files

| File | Planned change |
|------|----------------|
| `src/api/src/index.ts` | Refactor CORS origin resolver to use dedicated frontend/CORS env vars and explicit matching rules. |
| `src/api/src/types/env.ts` | Add typed bindings for new vars (`FRONTEND_APP_URL`, optional `CORS_ALLOWED_ORIGINS`, optional wildcard mode flag if adopted). |
| `src/api/wrangler.toml` | Define env vars for local/staging/production defaults and examples. |
| `src/api/src/constants/http.ts` | Optional: centralize CORS header names/constants for consistency. |
| `src/api/http/*.http` | Add or update runnable examples for allowed origin, blocked origin, and preflight flows (per API doc directive). |
| `src/api/README.md` (if present) | Document CORS env configuration and safe defaults. |

### Step-by-step

1. Introduce `FRONTEND_APP_URL` and wire CORS to it.
2. Keep local dev origins enabled for `localhost` and `127.0.0.1`.
3. Add strict origin parser/normalizer (no path/query fragments in origin comparisons).
4. Add optional `CORS_ALLOWED_ORIGINS` parser (Option B), disabled by default.
5. Keep wildcard support out of baseline implementation; design and tests first if activated later.
6. Ensure responses add `Vary: Origin` whenever origin is conditionally echoed.
7. Ensure preflight `OPTIONS` behavior is explicit and test-covered.

---

## Acceptance Criteria

- [ ] AC1: Requests from `https://app.example.com` receive valid CORS allow-origin behavior.
- [ ] AC2: Requests from `https://app-api.example.com` are not auto-allowed unless explicitly configured.
- [ ] AC3: Requests from untrusted origins (for example `https://evil.example.net`) are blocked by CORS policy.
- [ ] AC4: Preflight `OPTIONS` responds correctly for allowed origin + allowed method/headers.
- [ ] AC5: Preflight from blocked origin does not return permissive CORS headers.
- [ ] AC6: If credentials are enabled, API never emits `Access-Control-Allow-Origin: *`.
- [ ] AC7: Responses that vary by origin include `Vary: Origin`.
- [ ] AC8: Local dev origins (`http://localhost:3000`, `http://127.0.0.1:3000`) continue to work.
- [ ] AC9: Misconfigured env var values fail safe (invalid entries ignored, policy remains restrictive).

---

## Testing Plan

### Automated tests (API level)

1. Allowed origin success:
- `Origin: https://app.example.com`
- Expect explicit matching `Access-Control-Allow-Origin`.

2. Blocked origin:
- `Origin: https://evil.example.net`
- Expect no permissive allow-origin header.

3. Preflight allowed:
- `OPTIONS` with `Origin`, `Access-Control-Request-Method`, and `Access-Control-Request-Headers`.
- Expect method/header allow list and correct origin response.

4. Preflight blocked:
- Same preflight shape from blocked origin.
- Expect no permissive CORS grant.

5. Credentials behavior:
- When credentials are configured, verify allow-origin is explicit and never `*`.

6. Local dev origins:
- Validate both `localhost` and `127.0.0.1` paths.

7. Env parsing safety:
- Invalid URLs in env vars do not crash request handling and do not broaden allowed origins.

### Manual verification via `.http` examples

- Allowed frontend origin request.
- Blocked external origin request.
- Allowed preflight and blocked preflight.
- Local development origin request.

---

## Rollout Notes

1. Set production values explicitly:
- `FRONTEND_APP_URL=https://app.example.com`
- API remains hosted at `https://app-api.example.com`

2. Deploy behind staging first, validate with browser devtools network panel:
- Verify `Origin`, `Access-Control-Allow-Origin`, `Vary`, and preflight response headers.

3. Promote to production after CORS matrix passes.

---

## Open Questions

1. Do we need multiple first-party frontend origins in the next quarter (Option B trigger)?
2. Is wildcard subdomain support a hard requirement, or can preview environments use explicit entries?
3. Should credentials be enabled for all routes, or only specific authenticated endpoints?
