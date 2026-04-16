# ContactSwap

> Keep your contacts fresh. Exchange contact info without the awkward "what's your new number?" dance.

## Project Structure

This is a monorepo with three packages inside `src/`:

```
src/
├── api/                  # @contactswap/api - Cloudflare Worker
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth, CORS, rate limiting
│   │   ├── lib/          # Utilities (VCF, email, QR)
│   │   └── index.ts      # Worker entry point
│   ├── migrations/       # D1 database migrations
│   └── wrangler.toml     # Cloudflare config
│
├── frontend/             # @contactswap/frontend - Next.js
│   ├── src/
│   │   ├── app/          # Next.js App Router pages
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Frontend utilities
│   └── next.config.ts    # Next.js config
│
└── shared/               # @contactswap/shared - Shared types
    └── src/
        └── types/        # TypeScript types
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| **API** | Cloudflare Worker |
| **Frontend** | Next.js (Static Export) → Cloudflare Pages |
| **Database** | Cloudflare D1 (SQLite) |
| **Storage** | Cloudflare R2 |
| **Email** | MailerSend |
| **Language** | TypeScript |

## Getting Started

```bash
# Install dependencies
npm install

# Start API (port 8787)
npm run dev:api

# Start Frontend (port 3000)
npm run dev

# Start both
npm run dev:all
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend |
| `npm run dev:api` | Start API |
| `npm run dev:all` | Start both |
| `npm run build` | Build all packages |
| `npm run deploy:api` | Deploy API to Cloudflare |
| `npm run typecheck` | Type check all packages |

## Documentation

- [Product Specification](./SPEC.md)
