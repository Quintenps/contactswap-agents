# Project Context

- **Owner:** Quinten Peels
- **Project:** contactswap-agents
- **Project Description:** Repo scaffold initialized; team setup in progress.
- **Stack:** TypeScript emphasis requested; broader stack not specified yet.
- **Created:** 2026-04-16T14:12:21Z

## Learnings

- Initialized as TypeScript specialist responsible for type-safe implementation and architecture.
- Recast from Matrix universe (Trinity) to Breaking Bad universe.
- **feature-004 (2026-05-10):** In Next.js App Router you cannot mix server and `'use client'` exports in the same file. When a page must be a Server Component but needs client-side localStorage access, extract the client logic into a separate file under `_components/` and import it into the page. The page itself stays directive-free (Server Component by default).
- **feature-004:** Used a three-state enum (`'pending' | 'authenticated' | 'unauthenticated'`) for auth state so the button slot renders `null` during the in-flight check, preventing any flash of the admin button on unauthenticated users.

