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
| Photo | `PHOTO` | Resized to 200x200, JPEG, base64 encoded |

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

Target: **$0/month** using free tiers.

| Service | Free Tier Limit | Expected Usage | Fits? |
|---------|-----------------|----------------|-------|
| **Cloudflare Workers** | 100k requests/day | ~100 forms/month | ✅ |
| **Cloudflare Pages** | Unlimited requests | Static frontend | ✅ |
| **Cloudflare D1** | 5M rows read/day, 100k writes/day | Minimal DB ops | ✅ |
| **Cloudflare R2** | 10GB storage, 10M reads/month | Small VCF files (~1KB each) | ✅ |
| **MailerSend (email)** | 3,000 emails/month | ~100 forms/month | ✅ |

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
| **Database** | Cloudflare D1 (SQLite) | Form and template metadata |
| **File Storage** | Cloudflare R2 | Contacts (.vcf), photos |
| **Email** | MailerSend | Send generated contacts via email |
| **Language** | TypeScript | Both API and frontend |

#### Email Delivery (MailerSend)

For outbound email from Workers, we use **MailerSend**:

- **Free tier:** 3,000 emails/month (fits ~100 forms/month target)
- **Workers-compatible:** Simple HTTP API, works in edge runtime
- **Attachments supported:** Can attach .vcf files directly (base64 encoded)
- **Setup:** Create account at mailersend.com, verify domain, get API key

**Implementation in Worker:**

```typescript
// In the form response handler
const response = await fetch('https://api.mailersend.com/v1/email', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.MAILERSEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: {
      email: 'noreply@contactswap.app',
      name: 'ContactSwap',
    },
    to: [
      {
        email: env.OWNER_EMAIL,
      },
    ],
    subject: `ContactSwap: ${contactName} updated their info`,
    text: `${contactName} has filled in their contact form.\n\nTheir updated contact file is attached.\n\n—\nContactSwap`,
    attachments: [
      {
        filename: `${contactName}.vcf`,
        content: vcfBase64, // Base64-encoded VCF content
        disposition: 'attachment',
      },
    ],
  }),
});
```

**Environment variables needed:**
- `MAILERSEND_API_KEY` — API key from MailerSend dashboard
- `OWNER_EMAIL` — Your email address (where contacts are sent)

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

### VCF Standard: vCard 3.0 (RFC 2426)

ContactSwap uses **vCard 3.0** as the standard format for all contact files. This version offers the best balance of compatibility and features:

| Consideration | vCard 3.0 |
|---------------|-----------|
| **Compatibility** | Universal — iOS, Android, macOS, Windows, Outlook, Gmail |
| **Encoding** | UTF-8 (international names supported) |
| **File size** | Compact (QR-code friendly) |
| **Specification** | RFC 2426 (stable, well-documented) |

**Why not vCard 4.0?** While newer, vCard 4.0 has inconsistent support across platforms (iOS quirks, some Android apps don't fully parse it). The added features aren't needed for ContactSwap's use case.

**Example vCard 3.0 output:**

```
BEGIN:VCARD
VERSION:3.0
FN:Jane Doe
N:Doe;Jane;;;
TEL;TYPE=CELL:+1-555-123-4567
TEL;TYPE=WORK:+1-555-987-6543
EMAIL;TYPE=HOME:jane@example.com
EMAIL;TYPE=WORK:jane.doe@company.com
ADR;TYPE=HOME:;;123 Main St;Springfield;IL;62701;USA
ORG:Acme Corp
TITLE:Software Engineer
URL:https://janedoe.com
BDAY:1990-05-15
NOTE:Met at conference 2024
END:VCARD
```

### Parsing (Upload)

When parsing uploaded contacts, accept **vCard 2.1, 3.0, and 4.0** for maximum compatibility — users may export from various sources. Normalize all input to our internal field model.

Extract these fields from uploaded contact (.vcf):
- `FN` — Full name (required)
- `N` — Structured name (last;first;middle;prefix;suffix)
- `TEL` — Phone numbers (with type: CELL, WORK, HOME)
- `EMAIL` — Email addresses (with type: HOME, WORK)
- `ADR` — Addresses (with type: HOME, WORK)
- `ORG` — Organization/Company
- `TITLE` — Job title
- `URL` — Website
- `BDAY` — Birthday (normalize to YYYY-MM-DD)
- `NOTE` — Notes
- `PHOTO` — Photo (strip on import to keep files small)

**Parsing rules:**
- Handle both `TYPE=WORK` (3.0) and `TYPE=work` (case-insensitive)
- Handle both `TEL;TYPE=CELL` and `TEL;CELL` (2.1 style)
- Decode quoted-printable encoding (common in 2.1)
- Normalize line endings (CRLF per spec, but accept LF)
- Skip unknown/unsupported properties gracefully

### Generation (from Form Response)

Always generate **vCard 3.0** format. Ensure:

- **Line folding:** Lines > 75 chars must be folded (space continuation)
- **Escaping:** Escape commas, semicolons, backslashes in values
- **UTF-8:** Use UTF-8 encoding (no quoted-printable needed in 3.0)
- **Line endings:** CRLF (`\r\n`) per RFC
- **Required fields:** `BEGIN`, `VERSION`, `FN`, `N`, `END`

**Generation template:**

```typescript
function generateVCard(contact: Contact): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escape(contact.fullName)}`,
    `N:${escape(contact.lastName)};${escape(contact.firstName)};;;`,
  ];
  
  // Add optional fields if present
  if (contact.cellPhone) lines.push(`TEL;TYPE=CELL:${contact.cellPhone}`);
  if (contact.workPhone) lines.push(`TEL;TYPE=WORK:${contact.workPhone}`);
  if (contact.homePhone) lines.push(`TEL;TYPE=HOME:${contact.homePhone}`);
  if (contact.personalEmail) lines.push(`EMAIL;TYPE=HOME:${escape(contact.personalEmail)}`);
  if (contact.workEmail) lines.push(`EMAIL;TYPE=WORK:${escape(contact.workEmail)}`);
  if (contact.homeAddress) lines.push(`ADR;TYPE=HOME:;;${escapeAddress(contact.homeAddress)}`);
  if (contact.workAddress) lines.push(`ADR;TYPE=WORK:;;${escapeAddress(contact.workAddress)}`);
  if (contact.company) lines.push(`ORG:${escape(contact.company)}`);
  if (contact.jobTitle) lines.push(`TITLE:${escape(contact.jobTitle)}`);
  if (contact.website) lines.push(`URL:${contact.website}`);
  if (contact.birthday) lines.push(`BDAY:${contact.birthday}`); // YYYY-MM-DD
  if (contact.notes) lines.push(`NOTE:${escape(contact.notes)}`);
  
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

function escape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
```

---

## Photo Handling

Photos require special handling because vCard embeds them as base64-encoded data, which can make files very large.

#### Constraints

| Constraint | Limit | Reason |
|------------|-------|--------|
| **vCard file size** | Target < 100KB | Email deliverability, fast parsing |
| **Email attachment** | Max 25MB (MailerSend) | Service limit |
| **R2 storage** | 10GB free tier | Cost control |
| **Original photo** | Often 2-10MB | Phone cameras are high-res |
| **Base64 overhead** | +33% size | Encoding bloat |

#### Processing Pipeline

When a form responder uploads a photo:

```
[Upload Photo] → [Validate] → [Resize] → [Compress] → [Base64 Encode] → [Embed in VCF]
   (any size)     (type check)  (200x200)   (JPEG 80%)    (~30KB base64)     (PHOTO property)
```

**Step 1: Validate**
- Accept: JPEG, PNG, WebP, HEIC
- Reject: Files > 10MB (prevent abuse)
- Reject: Non-image files

**Step 2: Resize**
- Max dimensions: **200x200 pixels** (square, cover crop)
- Maintain aspect ratio, crop to square from center
- This is standard contact photo size (matches iOS/Android contact thumbnails)

**Step 3: Compress**
- Output format: **JPEG** (best compatibility)
- Quality: **80%** (good balance of quality vs size)
- Strip EXIF metadata (privacy + smaller file)
- Target output: **10-30KB** after compression

**Step 4: Base64 Encode**
- Encode compressed JPEG as base64
- ~30KB image → ~40KB base64 string
- This keeps total VCF size reasonable

**Step 5: Embed in vCard**
- Use vCard 3.0 `PHOTO` property with inline base64:

```
PHOTO;ENCODING=b;TYPE=JPEG:/9j/4AAQSkZJRgABAQEASABIAAD/4gIc...
```

#### Implementation

Photo processing happens **server-side in the Worker** using Cloudflare's Image Resizing or a WASM-based library:

```typescript
async function processPhoto(file: File): Promise<string | null> {
  // Validate
  if (file.size > 10 * 1024 * 1024) return null; // 10MB limit
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.type)) {
    return null;
  }
  
  // Resize and compress using Cloudflare Image Resizing
  // or a WASM library like squoosh/libvips
  const resized = await resizeImage(file, {
    width: 200,
    height: 200,
    fit: 'cover',
    format: 'jpeg',
    quality: 80,
  });
  
  // Convert to base64
  const buffer = await resized.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  
  return base64;
}

// In vCard generation
if (contact.photoBase64) {
  // Line folding required for long base64 strings (75 char lines)
  const foldedPhoto = foldLine(`PHOTO;ENCODING=b;TYPE=JPEG:${contact.photoBase64}`);
  lines.push(foldedPhoto);
}

function foldLine(line: string, maxLength = 75): string {
  if (line.length <= maxLength) return line;
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += maxLength) {
    chunks.push(line.slice(i, i + maxLength));
  }
  return chunks.join('\r\n '); // Space prefix for continuation lines
}
```

#### Form UI for Photo Upload

On the form, the photo field should:
- Show a circular preview (contact photo style)
- Allow drag-and-drop or click to upload
- Show upload progress
- Display "Photo will be resized to 200x200" hint
- Allow removing/replacing the photo
- Pre-fill with existing photo from uploaded contact (if any)

#### Photo in Parsing (Upload)

When you upload a contact that already has a photo:
- **Strip the photo** — Don't pre-fill the form with it
- Reason: The recipient should provide their own current photo
- The original contact's photo is likely outdated (that's why you're asking for updates!)

#### Size Budget

| Component | Size |
|-----------|------|
| vCard without photo | ~1-2KB |
| Photo (200x200 JPEG 80%) | ~10-30KB |
| Photo base64 encoded | ~15-40KB |
| **Total vCard with photo** | **~20-50KB** ✅ |

This keeps the VCF well under email attachment limits and fast to parse.

### QR Code

- Encode your contact as QR code using **MECARD format** (more compact than vCard)
- MECARD is widely supported by phone cameras for contact recognition
- If contact data exceeds QR capacity (~2KB), encode a download URL instead

**MECARD format example:**
```
MECARD:N:Doe,Jane;TEL:+15551234567;EMAIL:jane@example.com;URL:https://janedoe.com;;
```

**QR code decision logic:**
1. Try MECARD with essential fields (name, phone, email)
2. If fits in QR (version ≤ 10, ~300 chars) → use MECARD
3. If too large → encode download URL: `https://contactswap.app/api/config/contact.vcf`

---

## References

- [vCard 3.0 Specification (RFC 2426)](https://datatracker.ietf.org/doc/html/rfc2426) — ContactSwap output format
- [vCard 4.0 Specification (RFC 6350)](https://datatracker.ietf.org/doc/html/rfc6350) — Accepted for parsing input
- [MECARD Format](https://en.wikipedia.org/wiki/MeCard_(QR_code)) — QR code contact encoding
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [MailerSend API Docs](https://developers.mailersend.com/)
