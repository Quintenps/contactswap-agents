# Feature: Frontend Download VCF From Completed Form Answer

> Add a Download button to the admin board that allows downloading the VCF contact file for forms that have been completed and answered.

**Status:** Todo  
**Assigned:** Jesse  
**Parent:** feature-006-frontend-admin-board  
**Depends On:** feature-004-api-answer-form

## Goal

The admin board should provide a convenient download action for contact data submitted through completed forms. Recipients can download their exchanged contact information as a VCF file directly from the admin dashboard, alongside existing View and Delete actions.

This improves the admin experience by offering direct access to contact data without requiring form re-submission or separate API queries.

## User Flow Placement

1. Admin navigates to the admin board to review submitted forms.
2. For each form row, if the form has been completed/answered, a "Download" button appears alongside View and Delete buttons.
3. Admin clicks Download on a completed form row.
4. Frontend initiates a VCF file download containing the contact data from that form submission.
5. Browser handles file save dialog for the downloaded `.vcf` file.

Placement constraint:
- Download button is visible only for completed/answered forms.
- Download button is hidden or disabled for pending/unanswered forms.

## Scope

### In (Frontend Only)

- Admin board UI update to conditionally render Download button in action column.
- Button visibility logic: show only when form status indicates completion/answered state.
- Frontend integration with download endpoint to fetch and trigger VCF file download.
- Download filename generation (e.g., `contact-{formId}-{timestamp}.vcf`).
- Safe error handling when download request fails or returns invalid data.
- Responsive button layout and styling matching existing View/Delete actions.

### Out

- VCF file generation or backend storage implementation.
- Backend download endpoint creation or authentication.
- Form status tracking or completion state logic beyond current admin-board state consumption.
- Analytics or audit logging for download events.

## Implementation Notes

- Primary touchpoints:
  - `src/frontend/src/app/config/page.tsx` (admin board form list) for button row rendering and conditional visibility.
  - Button rendering logic to check form completion/answered state before displaying Download action.
  - Trigger mechanism for file download (likely using `fetch()` to backend download endpoint + `<a href>` blob/data URL or direct file stream).
- Conditional rendering approach:
  - Check form's answered/completed status or presence of answer data in admin-board state.
  - Only render Download button when form has been answered; hide or disable otherwise.
- Download handling:
  - Assume backend provides a download endpoint (e.g., `GET /v1/forms/:token/download-vcf` or similar).
  - Frontend constructs the appropriate URL and triggers download via temporary link or blob response.
  - Attach a sensible filename to the download (e.g., using Content-Disposition or frontend-side filename assignment).
- Error resilience:
  - Display user-friendly toast/notification if download fails (network error, unauthorized, etc.).
  - Do not interrupt admin board view; keep error localized to the specific download attempt.

## Acceptance Criteria

- [ ] Admin board displays Download button for completed/answered forms in the action column.
- [ ] Download button is not visible or is disabled for pending/unanswered forms.
- [ ] Clicking Download initiates a VCF file download to user's device.
- [ ] Downloaded VCF file contains the correct contact data from the form submission.
- [ ] Download action uses a consistent, readable filename (includes form ID or timestamp for disambiguation).
- [ ] If download fails, user receives a clear error notification without disrupting the admin board.
- [ ] Button styling and layout are consistent with existing View and Delete buttons.
- [ ] Feature works on both mobile and desktop admin board layouts.
- [ ] No console errors or unhandled promise rejections during download attempt.

## Dependencies

- `feature-006-frontend-admin-board` provides the admin board UI and form list state.
- Backend download endpoint must exist and return valid VCF content (scope/implementation outside this feature).
- Form completion/answered state must be available in admin-board data model.

## Out of Scope

- Batch download of multiple VCF files.
- Email delivery of VCF files to admins.
- VCF template customization or field selection by admin.
- Historical archival or backup of downloaded files.
- Download history tracking or audit trail in frontend.
