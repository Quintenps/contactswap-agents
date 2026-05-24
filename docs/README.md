# Documentation

Technical documentation for ContactSwap.

## Contents

| Document | Description |
|----------|-------------|
| `architecture.md` | Technical architecture, patterns, and decisions |
| (more as needed) | — |

## Relationship to Specs

- **`SPEC.md`** (root) — Product vision, user flows, what we're building
- **`.squad/features/`** — Individual feature breakdowns (for example: `api/` and `frontend/`)
- **`docs/`** — Technical reference, architecture, conventions

This folder is for **reference documentation** that agents and humans consult during development. It's not task-oriented like feature specs — it's knowledge-oriented.

## Deployment (Cloudflare)

### Frontend (Pages static)

From repo root:

```bash
npm run deploy:frontend
```

This runs a static Next.js export with:

- `NEXT_STATIC_EXPORT=1`
- `NEXT_PUBLIC_API_URL=https://api.contactswap.quinten.dev` (default for deploy builds)

### Deploy API + Frontend

From repo root:

```bash
npm run deploy:all
```

### One-time Pages setup

If the Pages project does not exist yet:

```bash
npx wrangler pages project create contactswap-frontend --production-branch main
```

Bind custom domain:

```bash
npx wrangler pages domain add contactswap.quinten.dev --project-name contactswap-frontend
```

