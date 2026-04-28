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

