# Project Context

- **Owner:** Quinten Peels
- **Project:** contactswap-agents
- **Project Description:** Repo scaffold initialized; team setup in progress.
- **Stack:** TypeScript emphasis requested; broader stack not specified yet.
- **Created:** 2026-04-16T14:12:21Z

## Learnings

- Initialized as backend specialist for services and integrations.
- Recast from Matrix universe (Morpheus) to Breaking Bad universe.
- Standardized API framework to Hono for Cloudflare Worker runtime.
- Established Worker entry pattern: `export default app` with centralized `app.onError()` and `app.notFound()`.
- Route composition pattern fixed to `src/api/src/routes/*` mounted via `app.route()`.
- Request validation pattern fixed to `@hono/zod-validator` + Zod schemas.
- Binding access pattern fixed to typed `c.env` using `Env` from `src/api/src/types/env.ts`.
- Deployment prep baseline: API Cloudflare config currently lives in `src/api/wrangler.toml`; frontend has no Cloudflare deployment config yet and only conditional static export in `src/frontend/next.config.ts`.
- Runtime config contract for deployment prep: API expects `PUBLIC_APP_URL`, `API_SECRET`, `DEFAULT_API_SECRET`, `MAILERSEND_API_KEY`, `MAILERSEND_EMAIL_TO`, `MAILERSEND_EMAIL_FROM`, `MAILERSEND_ENABLED`; frontend expects `NEXT_PUBLIC_API_URL` in `src/frontend/src/lib/api.ts`.
- Frontend Cloudflare deployment must stay an explicit choice between static Pages-style export and Next.js runtime deployment on Workers until the owner selects one.
- 📌 Team update (2026-05-19): Deployment choices are now set to frontend `pages-static` at `contactswap.quinten.dev` and API Worker production route `api.contactswap.quinten.dev`; production deploy/secrets scripts and root deploy orchestration were added.
- Team update (2026-06-02): CORS baseline should use explicit `FRONTEND_APP_URL` instead of deriving from `PUBLIC_APP_URL`; optional `CORS_ALLOWED_ORIGINS` can extend exact-origin allow-list, while wildcard origin support remains deferred.
- Team update (2026-06-02): Create-form API responses must emit user-facing form links from `FRONTEND_APP_URL` (not `API_APP_URL`) while keeping `token` in the payload so clients can construct/share stable frontend links.

