# ContactSwap — Product Specification

> Keep your contacts fresh. Exchange contact info without the awkward "what's your new number?" dance.

**Status:** Draft  
**Owner:** Quinten Peels  
**Last Updated:** 2026-04-16

---

## Problem

Contact information goes stale. People change jobs, phone numbers, addresses, and emails — but your phonebook doesn't know. You end up with outdated entries, bounced emails, and wrong numbers. Asking everyone "hey, can you send me your updated contact?" is tedious and often ignored.

## Solution

**ContactSwap** lets you request updated contact information from anyone by sending them a pre-filled form based on what you already have. They update it, you get a fresh contact back, and they get yours in return. Everyone wins.

---

## Domain Language

| Term | Definition |
|------|------------|
| **Contact** | A VCF file containing someone's contact information |
| **Form** | A web form created from an uploaded contact, pre-filled with existing data |
| **Form Response** | The data submitted when someone fills in a form |
| **Generated Contact** | A new VCF file created from a form response |
| **Template** | A saved set of form fields to request (e.g., "Colleagues", "Friends") |
| **Field** | A single piece of contact information (e.g., "Work Email", "Cell Phone") |

### Flow in Domain Terms

```
[Upload Contact] → [Pick Template] → [Create Form] → [Form Response] → [Generated Contact]
     (VCF)          (field set)        (URL)          (submission)         (new VCF)
```

---

## Templates

Templates define which fields appear on a form. You select a template when creating a form — the recipient only sees and fills the fields defined in that template.

### Default Templates

These templates are pre-configured and cannot be deleted (but can be modified):

| Template | Fields | Use Case |
|----------|--------|----------|
| **Colleagues** | Name, Work Email, Work Phone, Company, Job Title | Professional network |
| **Friends & Family** | Name, Personal Email, Cell Phone, Home Address, Birthday | Personal contacts |
| **Full** | All available fields | When you need everything |
| **Minimal** | Name, Email, Phone | Quick updates, low friction |

### Available Fields

Each field has a VCF mapping and can be marked as required or optional per template:

| Field | VCF Property | Notes |
|-------|--------------|-------|
| Full Name | `FN` | Always required (cannot be optional) |
| Work Email | `EMAIL;TYPE=WORK` | |
| Personal Email | `EMAIL;TYPE=HOME` | |
| Work Phone | `TEL;TYPE=WORK` | |
| Cell Phone | `TEL;TYPE=CELL` | |
| Home Phone | `TEL;TYPE=HOME` | |
| Work Address | `ADR;TYPE=WORK` | |
| Home Address | `ADR;TYPE=HOME` | |
| Company | `ORG` | |
| Job Title | `TITLE` | |
| Website | `URL` | |
| Birthday | `BDAY` | Format: YYYY-MM-DD |
| Notes | `NOTE` | Free text |

### Template Data Model

```
Template
├── id (uuid)
├── name (string, unique)
├── description (string, optional)
├── fields (JSON array of field configs)
├── is_default (boolean — true for built-in templates)
├── created_at
└── updated_at

Field Config (within fields array):
├── field_key (e.g., "work_email", "cell_phone")
├── required (boolean)
└── order (integer — display order on form)
```

### Template Management

- **View templates:** `/config/templates` — list all templates
- **Create template:** Pick fields, set required/optional, name it
- **Edit template:** Modify fields or requirements (default templates can be edited but not deleted)
- **Delete template:** Remove custom templates (forms using deleted template continue to work — template config is copied at form creation)

### Template Selection at Form Creation

When you upload a contact to create a form:

1. Contact is parsed, all available fields extracted
2. You see a template picker (dropdown or cards)
3. Selected template determines which fields appear on the form
4. Fields are pre-filled from the uploaded contact where data exists
5. Form is created with the template's field configuration **copied** (not referenced — so template changes don't affect existing forms)

### Form ↔ Template Relationship

**Important:** Forms store a **snapshot** of the template configuration at creation time. This means:
- Editing a template does NOT change existing forms
- Deleting a template does NOT break existing forms
- Each form is self-contained with its own field configuration


---

## Scope & Assumptions

### MVP Scope

- **Single requester** — You (Quinten) are always the requester. No multi-user support needed for MVP.
- **Your contact is pre-configured** — Your VCF is stored once, not uploaded per form.
- **One form per contact** — Each unique URL is for one person to update their info.
- **30-day form expiration** — Forms expire 30 days after creation. Expired forms show a friendly error.
- **International support** — Support non-Latin names, international phone formats, and addresses.
- **Free tier hosting** — Everything runs on Cloudflare's free tier. Zero hosting cost.
- **No response data retained** — Form responses are processed, emailed to you, then immediately discarded. Nothing stored on server after submission.
- **Template-based forms** — Choose which fields to request using saved templates (e.g., "Colleagues" vs "Friends").

### Cost Assumptions

Target: **$0/month** using Cloudflare free tiers.

| Service | Free Tier Limit | Expected Usage | Fits? |
|---------|-----------------|----------------|-------|
| **Workers** | 100k requests/day | ~100 forms/month | ✅ |
| **Pages** | Unlimited requests | Static frontend | ✅ |
| **D1** | 5M rows read/day, 100k writes/day | Minimal DB ops | ✅ |
| **R2** | 10GB storage, 10M reads/month | Small VCF files (~1KB each) | ✅ |
| **Email Sending** | 100 emails/day | ~100 forms/month | ✅ |

**Design for free tier:**
- Keep VCF files small (strip large photos if needed)
- Minimize D1 queries per request
- No heavy background processing
- Delete expired data to stay under storage limits

### Security Assumptions

- **URLs contain sensitive data** — If a form URL is exposed, the contact's information is exposed.
- **URLs must be cryptographically unguessable** — Brute-force and enumeration attacks must be infeasible.

---

## User Flow

### 1. You Upload a Contact

```
[You] → Upload contact (.vcf) → [ContactSwap]
                                      ↓
                              Parse contact, extract fields
                                      ↓
                              Create form with secure URL
                                      ↓
                              Return shareable link
```

**Inputs:**
- Contact file (.vcf) of the person you want updated info from

**Outputs:**
- Secure unique URL to share (e.g., `https://contactswap.app/form/{secure-token}`)

**Your contact:** Pre-configured in the system (uploaded once, used for all exchanges).

### 2. Recipient Fills the Form

```
[Recipient] → Opens form URL → [ContactSwap]
                                    ↓
                            Pre-filled form with existing data
                            (name, phone, email, address, etc.)
                                    ↓
                            Recipient reviews/updates fields
                                    ↓
                            Submit (creates form response)
```

**Form Fields (pre-filled from uploaded contact):**
- Full name
- Phone number(s)
- Email address(es)
- Physical address
- Company / Job title
- Website
- Notes
- Photo (optional)

### 3. Exchange Completes

```
[Form response submitted] → [ContactSwap]
                                  ↓
                          Generate contact from response
                                  ↓
                          Send email to you (with generated .vcf attached)
                                  ↓
                          Show thank you page to recipient
                                  ↓
                          Display QR code of your contact (desktop)
                                  ↓
                          [Recipient scans QR → phone prompts to add contact]
```

**Outputs:**
- **You receive:** Simple email notification with generated contact (.vcf) attached
- **Recipient sees:** Thank you page with QR code of your contact

#### Email to You

Minimal notification email when a form is submitted:

```
Subject: ContactSwap: {Contact Name} updated their info

{Contact Name} has filled in their contact form.

Their updated contact file is attached.

—
ContactSwap
```

- **Attachment:** `{contact-name}.vcf` — the generated contact from form response
- **No HTML** — plain text only, minimal
- **No links** — just the attachment

#### Thank You, Page (Recipient)

After submitting the form, the recipient sees:

- **Heading:** "Thanks! Your info has been sent."
- **QR Code:** Your contact encoded as scannable QR
  - On mobile: phone camera recognizes it as contact, prompts "Add to Contacts"
  - On desktop: recipient can scan with their phone
- **Fallback:** "Can't scan? [Download contact]" link (downloads your .vcf)
- **No tracking, no cookies** — just a static thank you

---

## Core Features

### MVP (v1.0)

| Feature | Description | Priority |
|---------|-------------|----------|
| Contact Upload | Parse uploaded .vcf file, extract fields | P0 |
| Form Creation | Create pre-filled web form from contact data | P0 |
| Secure URLs | Generate cryptographically secure, unguessable form URLs | P0 |
| Form Expiration | Forms expire after 30 days; show friendly error for expired forms | P0 |
| Form Submission | Validate and accept form response | P0 |
| Contact Generation | Generate valid .vcf from form response | P0 |
| Email Delivery | Send generated contact to you via email | P0 |
| QR Code Display | Show your contact as scannable QR code on confirmation | P0 |
| Your Contact Config | Store your contact info once, use for all exchanges | P0 |
| International Support | Handle non-Latin names, international phone formats (E.164), global addresses | P0 |
| Template-Based Forms | Choose fields to request using saved templates | P0 |

### Future (v1.x+)

| Feature | Description | Priority |
|---------|-------------|----------|
| Bulk Upload | Upload multiple contacts, create batch of forms | P1 |
| Configurable Expiration | Allow custom expiration per form (not just 30 days) | P1 |
| Reminder Emails | Send reminder if form hasn't been filled | P2 |
| Contact Diff | Show you what changed between original and generated contact | P2 |
| Multi-user | Support multiple requesters with accounts | P2 |
| Webhook Delivery | Send generated contact via webhook instead of email | P3 |
| SMS Delivery | Send form link via SMS | P3 |
| Custom Branding | White-label forms with custom logo/colors | P3 |

---

## Technical Architecture

### Overview

ContactSwap is split into two deployable units:

1. **API** — Cloudflare Worker handling all backend logic
2. **Frontend** — Cloudflare Pages serving the web application

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Edge                          │
├─────────────────────────────┬───────────────────────────────┤
│   Frontend (Pages)          │   API (Worker)                │
│   contactswap.app           │   api.contactswap.app         │
│                             │                               │
│   • Landing page            │   • Form CRUD                 │
│   • Form UI                 │   • Contact parsing           │
│   • Confirmation page       │   • Contact generation        │
│   • Config page             │   • Email delivery            │
│                             │   • QR code generation        │
│                             │                               │
│   Static assets (HTML/JS)   │   ┌─────────┐ ┌─────────┐    │
│                             │   │   D1    │ │   R2    │    │
│                             │   │ (SQLite)│ │ (Files) │    │
│                             │   └─────────┘ └─────────┘    │
└─────────────────────────────┴───────────────────────────────┘
```

### Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API** | Cloudflare Worker | Backend logic, API endpoints |
| **Frontend** | Cloudflare Pages | Static web app (SPA or SSR) |
| **Database** | Cloudflare D1 (SQLite) | Form and response metadata |
| **File Storage** | Cloudflare R2 | Contacts (.vcf), photos |
| **Email** | Cloudflare Email Service | Send generated contacts |
| **Language** | TypeScript | Both API and frontend |

### Deployment

| Unit | Domain | Deployment |
|------|--------|------------|
| Frontend | `contactswap.app` | Cloudflare Pages (Git integration) |
| API | `api.contactswap.app` | Cloudflare Worker (`wrangler deploy`) |

### API ↔ Frontend Communication

- Frontend calls API via `fetch()` to `api.contactswap.app`
- API returns JSON responses
- CORS configured to allow `contactswap.app` origin
- Protected endpoints (config) use API key in header

### Data Model

```
Config (single row for MVP)
├── id (1)
├── owner_email (your email)
├── owner_contact_url (R2 path to your .vcf)
└── updated_at

Template
├── id (uuid)
├── name (string, unique)
├── description (string, optional)
├── fields (JSON array of field configs)
├── is_default (boolean — true for built-in templates)
├── created_at
└── updated_at

Form
├── id (uuid)
├── token (secure random token, 32+ chars)
├── template_id (uuid, nullable — reference to template used)
├── field_config (JSON — snapshot of template fields at creation time)
├── original_contact_url (R2 path to uploaded .vcf)
├── original_contact_name (for your reference)
├── status (pending | completed | expired)
├── created_at
├── completed_at
└── expires_at
```

**Note:** `field_config` is a snapshot — forms don't break if templates are edited/deleted later.

**Note:** No `FormResponse` table. Form responses are:
1. Received by the API
2. Converted to VCF
3. Emailed to you with attachment
4. Immediately discarded

The only record of a submission is the `status: completed` flag on the Form (no response data stored).

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/forms` | Create new form (upload contact + template_id) |
| GET | `/api/forms/:token` | Get form data (for rendering the form) |
| POST | `/api/forms/:token/respond` | Submit form response |
| GET | `/api/forms/:token/qr` | Get your contact as QR code |
| GET | `/api/config` | Get your config (protected) |
| PUT | `/api/config` | Update your contact (protected) |
| GET | `/api/templates` | List all templates (protected) |
| POST | `/api/templates` | Create custom template (protected) |
| GET | `/api/templates/:id` | Get template by ID (protected) |
| PUT | `/api/templates/:id` | Update template (protected) |
| DELETE | `/api/templates/:id` | Delete custom template (protected) |

### Pages

| Path | Description |
|------|-------------|
| `/` | Landing page — upload contact, pick template, create form |
| `/form/:token` | Form page (pre-filled, for recipient) |
| `/form/:token/done` | Confirmation + QR code |
| `/config` | Your contact management (protected) |
| `/config/templates` | Template management (protected) |

---

## URL Security

### Requirements

URLs are the **only access control** for form data. They must be:

1. **Cryptographically random** — Use `crypto.randomUUID()` or `crypto.getRandomValues()` (never `Math.random()`)
2. **Sufficient entropy** — Minimum 128 bits (e.g., 32 hex chars or UUID v4)
3. **Not enumerable** — No sequential IDs, no predictable patterns
4. **Not logged** — Tokens should not appear in server logs or analytics

### Token Format

```
Format: UUID v4 (36 chars) or hex string (32 chars)
Example: 7f3a9c2e-4b1d-4f8a-9e6c-3d2a1b0c9e8f
Example: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6

URL: https://contactswap.app/form/7f3a9c2e-4b1d-4f8a-9e6c-3d2a1b0c9e8f
```

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Brute-force guessing | 128-bit tokens = 2^128 possibilities (infeasible) |
| URL enumeration | No sequential IDs, no patterns |
| Shoulder surfing | Tokens are long, hard to memorize |
| Log exposure | Don't log tokens; use form IDs internally |
| Referer leakage | Set `Referrer-Policy: no-referrer` |

### Implementation

```typescript
// ✅ Correct: cryptographically secure
const token = crypto.randomUUID();

// ❌ Wrong: predictable
const token = Math.random().toString(36);
const token = Date.now().toString();
const token = autoIncrementId.toString();
```

---

## Contact Handling (VCF)

### Parsing (Upload)

Extract these fields from uploaded contact (.vcf):
- `FN` — Full name
- `N` — Structured name (last;first;middle;prefix;suffix)
- `TEL` — Phone numbers (with type: cell, work, home)
- `EMAIL` — Email addresses (with type)
- `ADR` — Addresses (with type)
- `ORG` — Organization
- `TITLE` — Job title
- `URL` — Website
- `NOTE` — Notes
- `PHOTO` — Photo (base64 or URL)

### Generation (from Form Response)

Generate valid VCF 3.0 format from form response. Ensure:
- Proper escaping of special characters
- Multi-value fields (multiple phones, emails)
- Photo encoding (base64 inline or URL reference)

### QR Code

- Encode your contact as QR code
- Use `MECARD` or direct VCF format depending on size
- If contact too large for QR, encode a download URL instead

---

## Security & Privacy

- **No response data retained** — Form submissions are processed in-memory, emailed to you, then immediately discarded. Nothing stored.
- **No accounts required for recipients** — Recipients just fill a form
- **Single-user MVP** — You are the only requester (no auth needed for MVP, or simple API key)
- **Cryptographically secure URLs** — 128-bit minimum entropy (see URL Security section)
- **Form metadata only** — D1 stores form metadata (token, status, expiry) but never the submitted contact data
- **Original contact deleted on expiry** — After 30 days, the uploaded contact is deleted from R2
- **No tracking** — No analytics cookies, no third-party scripts
- **HTTPS only** — All traffic encrypted
- **Rate limiting** — Prevent abuse of form creation and submission
- **Referrer policy** — `no-referrer` to prevent token leakage

---

## Open Questions

> Refine these as you develop the spec further.

1. ~~**Authentication for requesters?**~~ — MVP: single user (you). Simple API key or env-based auth.
2. ~~**Form expiration default?**~~ — 30 days. Expired forms show friendly error.
3. ~~**Multiple contacts per form?**~~ — MVP: one contact per form.
4. ~~**Photo handling?**~~ — Strip photos from VCFs to keep files small and stay within free tier.
5. ~~**Delivery method priority?**~~ — Email only. Simple plain-text email with .vcf attachment. No download link fallback needed.
6. ~~**Form customization?**~~ — Yes. Template-based: you pick a template at form creation, recipient sees only those fields. See Templates section.
7. ~~**Internationalization?**~~ — Yes. Support non-Latin names, E.164 phone formats, global addresses.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Form completion rate | > 60% of opened forms result in response |
| Time to complete form | < 2 minutes average |
| Contact parse success rate | > 95% of uploaded contacts parse correctly |
| Email delivery rate | > 98% of generated contacts delivered successfully |

---

## Milestones

### M1: Core Flow (Week 1-2)
- [ ] Contact parsing (upload → extract fields)
- [ ] Form creation (fields → pre-filled form)
- [ ] Form response handling (response → contact generation)
- [ ] Secure URL generation (128-bit tokens)

### M2: Delivery (Week 2-3)
- [ ] Email delivery of generated contact
- [ ] QR code generation for your contact
- [ ] Confirmation page with QR display
- [ ] Your contact configuration page

### M3: Polish (Week 3-4)
- [ ] Landing page UI
- [ ] Form UI/UX refinement
- [ ] Error handling and validation
- [ ] Rate limiting and security hardening

### M4: Launch (Week 4+)
- [ ] Deploy to production
- [ ] Domain setup (contactswap.app or similar)
- [ ] Monitoring and alerting
- [ ] Documentation

---

## References

- [VCF/vCard Specification (RFC 6350)](https://datatracker.ietf.org/doc/html/rfc6350)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare Email Service](https://developers.cloudflare.com/email-routing/)
