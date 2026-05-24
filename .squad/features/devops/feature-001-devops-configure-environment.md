# Feature: DevOps - Configure Cloudflare Deployment Environment

> Prepare the API and frontend projects for repeatable Cloudflare deployment.

**Status:** Todo  
**Assigned:** Gus  
**Parent:** SPEC.md -> Scope & Assumptions / Free tier hosting  
**Depends On:** None

## Goal

Define the deployment-preparation work needed to ship both apps on Cloudflare without guessing production values at deploy time. The API should deploy as a Worker with explicit bindings, vars, and secrets. The frontend should have an explicit Cloudflare deployment mode selected and documented before its deployment config is added.

## Acceptance Criteria

- [ ] The API deployment plan is documented from the current `src/api/wrangler.toml` baseline.
- [ ] API environment-specific bindings are identified for each deployment environment, including placeholders for D1 database IDs and R2 bucket names where the repo cannot know them yet.
- [ ] API runtime configuration is split into non-secret vars vs secrets using the names already used in code.
- [ ] Production API deployment does not rely on `DEFAULT_API_SECRET`; a real `API_SECRET` secret is required.
- [ ] The frontend deployment mode is chosen explicitly before implementation: `pages-static` or `workers-next`.
- [ ] Frontend public runtime config includes `NEXT_PUBLIC_API_URL` pointed at the deployed API origin.
- [ ] The spec lists the files likely to change for both apps and the deployment decisions that still need owner input.
- [ ] The remaining missing values are captured as placeholders that can be filled in without re-discovering the architecture.

## Technical Notes

- API current state:
- `src/api/wrangler.toml` already defines a Worker, `nodejs_compat`, local vars, one D1 binding (`D1`), one R2 binding (`R2`), a cron trigger, and a production route for `api.contactswap.app`.
- API code currently expects these runtime values: `PUBLIC_APP_URL`, `API_SECRET`, `DEFAULT_API_SECRET`, `MAILERSEND_API_KEY`, `MAILERSEND_EMAIL_TO`, `MAILERSEND_EMAIL_FROM`, `MAILERSEND_ENABLED`.
- `DEFAULT_API_SECRET` is acceptable for local development convenience but should not be treated as the production auth mechanism.
- Cloudflare Wrangler environments do not inherit bindings like `vars`, `d1_databases`, or `r2_buckets`; each deployed environment must define them explicitly.
- Frontend current state:
- `src/frontend/next.config.ts` only supports optional static export through `NEXT_STATIC_EXPORT=1`.
- `src/frontend/src/lib/api.ts` reads `NEXT_PUBLIC_API_URL` and falls back to `http://localhost:8787`.
- There is no existing frontend Wrangler config, Cloudflare adapter config, or Cloudflare-specific build script yet.
- Deployment decision to make before implementation:
- `pages-static`: keep the frontend fully static, build with static export, and deploy the generated assets to Cloudflare Pages. Use this only if current and near-term routes remain compatible with static export.
- `workers-next`: deploy the Next.js app using Cloudflare's current Next.js-on-Workers path if SSR or other runtime Next features are required. This will need additional Cloudflare-specific tooling/config beyond the current repo state.
- Recommended API preparation work:
- Add explicit `staging` and `production` environment sections in Wrangler config only if both environments will actually be used.
- Keep Wrangler config as the source of truth for routes, bindings, and non-secret vars.
- Add a documented local secret flow using `.dev.vars` and a deployment secret flow for `API_SECRET` and `MAILERSEND_API_KEY`.
- Frontend/API alignment to preserve:
- `PUBLIC_APP_URL` must be the deployed frontend origin because the API uses it for CORS and generated form links.
- `NEXT_PUBLIC_API_URL` must be the browser-reachable API base URL.

## What You Need To Fill In

- `<FRONTEND_DEPLOYMENT_MODE>`: choose `pages-static` or `workers-next`.
- `<FRONTEND_DOMAIN>`: the public frontend hostname, for example the final app URL.
- `<API_DOMAIN>`: the public API hostname if different from the current planned `api.contactswap.app`.
- `<PUBLIC_APP_URL_PRODUCTION>`: the final frontend origin used by the API for CORS and generated links.
- `<NEXT_PUBLIC_API_URL_PRODUCTION>`: the final browser-facing API base URL.
- `<CF_ACCOUNT_ID>`: only if you want to pin account-level config in CI or Wrangler config.
- `<API_D1_DATABASE_ID_PRODUCTION>` and optional `<API_D1_DATABASE_ID_STAGING>`.
- `<API_R2_BUCKET_NAME_PRODUCTION>` and optional `<API_R2_BUCKET_NAME_STAGING>`.
- `<API_SECRET_PRODUCTION>`: the real admin secret to store with Wrangler secrets, not in git.
- `<MAILERSEND_API_KEY>`: secret value for email delivery.
- `<MAILERSEND_EMAIL_FROM>` and `<MAILERSEND_EMAIL_TO>`: verified sender and recipient addresses.
- `<MAILERSEND_ENABLED_PRODUCTION>`: whether production should send mail immediately or stay disabled until email is verified.

## Files to Create/Modify

- `src/api/wrangler.toml` - finalize Worker environments, bindings, routes, vars, and secret expectations
- `src/api/package.json` - add or adjust deploy commands if environment-specific commands are needed
- `src/api/src/types/env.ts` - keep runtime binding types aligned with deployment config
- `src/frontend/next.config.ts` - lock in static export or runtime deployment mode
- `src/frontend/package.json` - add Cloudflare-aware build/deploy scripts for the chosen frontend mode
- `src/frontend/src/lib/api.ts` - confirm production API URL comes only from `NEXT_PUBLIC_API_URL`
- `docs/README.md` or new deployment docs - capture setup steps once the placeholders above are filled

## Suggested Implementation Order

1. Decide whether the frontend is `pages-static` or `workers-next`.
2. Finalize production domains so `PUBLIC_APP_URL` and `NEXT_PUBLIC_API_URL` can be set correctly.
3. Create Cloudflare resources for the API environment: D1 database, R2 bucket, and Worker route/domain.
4. Update API deployment config with real binding identifiers, vars, and required secrets.
5. Add frontend deployment config and scripts for the chosen Cloudflare mode.
6. Run build or dry-run deploy checks for both projects before storing production secrets.