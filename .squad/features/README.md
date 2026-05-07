# Feature Specs

This folder contains individual feature specifications broken down from the product spec (`SPEC.md`).

## How It Works

1. **Product spec** (`SPEC.md`) defines the overall vision, user flows, and MVP scope
2. **Lead (Walter)** decomposes the product spec into feature specs here
3. **Agents** pick up feature specs and implement them
4. **Completed features** get marked as done in the spec

## Feature Spec Template

Each feature spec should include:

```markdown
# Feature: {Name}

> One-line description

**Status:** Todo | In Progress | Done  
**Assigned:** {Agent name}  
**Parent:** SPEC.md → {Section}  
**Depends On:** {Other features, or "None"}

## Goal

What this feature accomplishes.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Technical Notes

Implementation guidance, API contracts, edge cases.

## Files to Create/Modify

- `src/path/to/file.ts` — description
- `src/path/to/other.ts` — description
```

## Current Features

## Folder Structure

- `api/` — API-related feature specs
- `frontend/` — Frontend-related feature specs

| Feature | Status | Assigned |
|---------|--------|----------|
| (none yet) | — | — |

---

*Run "Walter, decompose the spec" to populate this folder.*

