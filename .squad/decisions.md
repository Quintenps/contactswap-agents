# Squad Decisions

## Active Decisions

### 2026-04-19: Adopt Hono as API framework for the Worker

- Status: Proposed
- By: Gus (Backend Dev)
- Context: API implementation needs Worker-native routing, typed bindings, scoped middleware, and schema validation.
- Decision: Use Hono as the required framework for API routes.
- Rationale: Predictable route composition, centralized error handling, and clean integration with typed `c.env` plus Zod validation.
- Consequences: Standardized endpoint patterns and improved reviewability/testability.

### 2026-04-22T00:00:00Z: API feature documentation directive

- Status: Active directive
- By: qpeels (via Copilot)
- Decision: When building API features, always create or update matching `.http` files with runnable request examples.
- Why: Preserve executable API examples alongside implementation work.

### 2026-05-10: Index page client component extraction

- Status: Accepted
- By: Jesse
- Feature: `feature-004-frontend-index-page`
- Decision: Keep `src/frontend/src/app/page.tsx` as a Server Component and place the auth-aware button in named export `AdminLink` at `src/frontend/src/app/_components/admin-link.tsx` (`'use client'`).
- Rationale: Maintain SSR for static page content while limiting hydration to the interactive button.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
