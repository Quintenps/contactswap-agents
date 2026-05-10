# Improvement: Template Fields Refactor

> Refine template field modeling and display behavior for clarity and maintainability.

**Status:** Todo  
**Assigned:** Unassigned  
**Parent:** Improvements Backlog  
**Depends On:** None

## Goal

Improve how template fields are defined, labeled, and rendered so the system is easier to evolve and less error-prone.

## Scope

- Standardize field label formatting behavior
- Reduce manual mapping where practical
- Keep UI output readable and consistent
- Avoid regressions in form generation and submission

## Acceptance Criteria

- [ ] Field labels are consistently human-readable in config and form flows
- [ ] Address-related field variants render correctly
- [ ] Behavior is covered by tests or fixtures where feasible
- [ ] No TypeScript or lint errors introduced

## Technical Notes

Potential directions:

- Use a centralized field metadata map in shared types
- Add a safe fallback label formatter for unknown keys
- Keep label generation deterministic and backward-compatible

## Files to Create/Modify

- src/shared/src/types/contact.ts — evaluate field metadata ownership
- src/frontend/src/app/config/create-form/page.tsx — template field listing labels
- src/api/src/services/answer-form.ts — ensure field handling stays aligned
- src/api/http/forms.http — add/update fixture coverage where needed

## Open Questions

- Should field labels be fully explicit, generated, or hybrid?
- Should metadata (required/default/grouping) live in shared types?
- Do we want grouping in UI (contact, work, home, media)?
