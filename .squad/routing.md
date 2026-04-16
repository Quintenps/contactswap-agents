# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| TypeScript architecture & implementation | Jesse | Type modeling, tsconfig changes, SDK typing, refactors to stronger types |
| Backend services & integrations | Gus | Workers, D1, KV, R2, Queues, APIs, server logic |
| Email sending & routing | Gus | Cloudflare Email Service, transactional email, email handlers |
| Test strategy & verification | Hank | Write tests, find edge cases, verify fixes, Vitest setup |
| Code review | Walter | Review PRs, check quality, suggest improvements |
| Testing | Hank | Regression checks, test plans, release confidence |
| Scope & priorities | Walter | What to build next, trade-offs, decisions |
| Cloudflare product selection | Walter | Which storage/compute/networking product to use |
| Wrangler config & deployment | Gus | wrangler.jsonc, bindings, deploy commands |
| Session logging | Scribe | Automatic — never needs routing |

## Skill-Aware Routing

When routing work, check if a relevant skill exists in `.squad/skills/`. Include the skill path in the spawn prompt so agents read it before starting.

| Domain | Skill | Agents |
|--------|-------|--------|
| Cloudflare platform decisions | `cloudflare` | Walter, Gus |
| Workers code patterns | `workers-best-practices` | Jesse, Gus, Hank |
| CLI commands & config | `wrangler` | Jesse, Gus, Hank |
| Email features | `cloudflare-email-service` | Gus |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Walter |
| `squad:{name}` | Pick up issue and complete the work | Named member |

### How Issue Assignment Works

1. When a GitHub issue gets the `squad` label, the **Lead** triages it — analyzing content, assigning the right `squad:{member}` label, and commenting with triage notes.
2. When a `squad:{member}` label is applied, that member picks up the issue in their next session.
3. Members can reassign by removing their label and adding another member's label.
4. The `squad` label is the "inbox" — untriaged issues waiting for Lead review.

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for "what port does the server run on?"
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn the tester to write test cases from requirements simultaneously.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. The Lead handles all `squad` (base label) triage.
8. **Skill-aware routing** — before spawning, check `.squad/skills/` for relevant skills and include them in the spawn prompt.
