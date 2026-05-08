# Feature: Frontend Create Form Page

> Build a focused admin page to create a form by dropping a VCF file and selecting a template.

**Status:** In Progress  
**Assigned:** Unassigned  
**Parent:** SPEC.md -> User Flow: "You Upload a Contact"  
**Depends On:** feature-002-api-create-form

## Goal

Create a dedicated frontend page where the admin can create a new form in one clear flow:
1. Upload a contact file (`.vcf`) via drag-and-drop or file picker.
2. Select a form template.
3. Submit and receive the created form URL.

The page should feel polished and intentional, with strong visual hierarchy and clear feedback at each step.

## User Flow

1. Admin opens the create page from config actions.
2. Page shows a two-field form:
   - VCF upload area (dropzone + click-to-select).
   - Template selector.
3. Admin drops a `.vcf` file (or selects it manually).
4. Admin chooses a template.
5. Admin clicks "Create form".
6. Frontend sends `multipart/form-data` to `POST /v1/forms` with:
   - `vcf`
   - `templateId`
7. While request is in flight, submit button shows loading and form is disabled.
8. On success, page shows generated form URL with copy action and quick open action.
9. On validation or API errors, page shows clear inline error feedback without losing selected values.

## Acceptance Criteria

- [ ] `/config/create-form` route exists and renders.
- [ ] Page includes a drag-and-drop VCF upload field.
- [ ] Upload field supports click-to-select as fallback.
- [ ] Upload field only accepts `.vcf` and surfaces a helpful error for invalid file types.
- [ ] Page includes a template selection input bound to a template id.
- [ ] Template selection is required before submit.
- [ ] Create action sends `POST /v1/forms` as `multipart/form-data` with `vcf` and `templateId`.
- [ ] API secret from admin session is used (`x-api-secret` header behavior stays consistent with existing config flow).
- [ ] Loading state is shown during submission and prevents duplicate requests.
- [ ] Success state displays the returned URL and expiration info from API response.
- [ ] Success state includes a copy-link control.
- [ ] Error states handle at least: unauthorized (401), validation (422), template not found (404), and generic failures.
- [ ] Mobile and desktop layouts are both usable and visually clean.

## Out of Scope (for this feature)

- Template CRUD UX.
- Advanced bulk form creation.
- Contact preview/editor before submit.
- Multi-step wizard behavior.

## Technical Notes

- Route target: `src/frontend/src/app/config/create-form/page.tsx`.
- Add API helper in `src/frontend/src/lib/api.ts` for create-form multipart request (if not already present).
- Reuse existing API-secret/session flow from config page local state/localStorage handling.
- Keep upload UX accessible:
  - Visible keyboard focus states.
  - Dropzone is still usable via file picker.
- Validate before request:
  - File present
  - File extension/mime compatible with VCF
  - Template selected
- On success, show:
  - `url`
  - `expiresAt`
  - Optional quick action to start another create flow.

## API Expectations

- Uses `POST /v1/forms`.
- Request is `multipart/form-data` with `vcf` file and `templateId`.
- Request includes the `x-api-secret` header from the authenticated admin session.
- Response shape follows `CreateFormResponse` from shared types.

## Files to Create/Modify

- `src/frontend/src/app/config/create-form/page.tsx` — create-form UI and submit flow
- `src/frontend/src/lib/api.ts` — create-form client helper
- `src/frontend/src/app/config/page.tsx` — ensure action panel links to create-form route
- `src/frontend/src/app/globals.css` — optional styles for dropzone and success state

## Build Scope For First Pass

- Build route and form layout.
- Implement drag/drop + picker upload for VCF.
- Implement template selection input.
- Wire submit to backend create endpoint.
- Implement success and error states.
- Add copy-link action after success.
