# ContactSwap — Product Specification

> Keep your contacts fresh. Exchange contact info without the awkward "what's your new number?" dance.

**Status:** Ready for Development  
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
2. **Frontend** — Next.js with static export, deployed on Cloudflare Pages

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Edge                          │
├─────────────────────────────┬───────────────────────────────┤
│   Frontend (Next.js)        │   API (Worker)                │
│   contactswap.app           │   api.contactswap.app         │
│                             │                               │
│   • Landing page            │   • Form CRUD                 │
│   • Form UI                 │   • Contact parsing           │
│   • Confirmation page       │   • Contact generation        │
│   • Config page             │   • Email delivery            │
│   • Static assets (HTML/JS) │   • QR code generation        │
│                             │                               │
│                             │   ┌─────────┐ ┌─────────┐    │
│                             │   │   D1    │ │   R2    │    │
│                             │   │ (SQLite)│ │ (Files) │    │
│                             │   └─────────┘ └─────────┘    │
└─────────────────────────────┴───────────────────────────────┘
```

### Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API** | Cloudflare Worker | Backend logic, API endpoints |
| **Frontend** | Next.js (Static Export) → Cloudflare Pages | Static web app with React |
| **Database** | Cloudflare D1 (SQLite) | Form and template metadata |
| **File Storage** | Cloudflare R2 | Contacts (.vcf), photos |
| **Email** | MailerSend | Send generated contacts via email |
| **Language** | TypeScript | Both API and frontend |

#### Frontend (Next.js Static Export)

The frontend uses **Next.js** with static export (`output: 'export'`) for deployment to Cloudflare Pages:

- **Framework:** Next.js 14+ with App Router
- **Export mode:** Static (`next.config.js` → `output: 'export'`)
- **Styling:** Tailwind CSS (recommended) or CSS Modules
- **Deployment:** `next build` produces static files in `out/` → deploy to Cloudflare Pages

**Why Next.js Static Export?**
- React-based with excellent DX (file-based routing, TypeScript support)
- Static export = no server required, perfect for Cloudflare Pages free tier
- Built-in image optimization (with static loader)
- Easy to add dynamic features later if needed

**Configuration:**

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true, // Required for static export
  },
};

export default nextConfig;
```

**Build & Deploy:**

```bash
# Build static files
cd frontend
npm run build

# Output in frontend/out/ — deploy to Cloudflare Pages
# Cloudflare Pages build command: npm run build
# Cloudflare Pages output directory: out
```

**Limitations of Static Export:**
- No server-side rendering (SSR) or API routes in Next.js — all API calls go to the Worker
- No `getServerSideProps` — use `getStaticProps` or client-side fetching
- Dynamic routes must use `generateStaticParams` or be handled client-side
- Form pages (`/form/[token]`) fetch data client-side from the API

**Route Handling:**
- Static pages (`/`, `/config`, `/config/templates`) — pre-rendered at build time
- Dynamic pages (`/form/[token]`, `/form/[token]/done`) — shell rendered at build, data fetched client-side


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

### API Authentication (MVP)

ContactSwap uses a simple **API key** for protected endpoints. No user accounts, no OAuth — just a shared secret.

#### How It Works

1. **Server-side secret:** An `API_SECRET` environment variable is set in the Worker
2. **Client sends key:** Frontend includes the key in the `X-API-Key` header for protected requests
3. **Server validates:** Worker compares the header value against `API_SECRET` using constant-time comparison

#### Protected vs Public Endpoints

| Type | Endpoints | Auth Required |
|------|-----------|---------------|
| **Public** | `GET /api/forms/:token`, `POST /api/forms/:token/respond`, `GET /api/forms/:token/qr`, `GET /api/health` | ❌ No |
| **Protected** | `POST /api/forms`, `GET /api/forms`, `DELETE /api/forms/:id`, `GET /api/config`, `PUT /api/config`, `/api/templates/*` | ✅ Yes |

#### Implementation

```typescript
// Middleware for protected routes
function requireAuth(request: Request, env: Env): Response | null {
  const apiKey = request.headers.get('X-API-Key');
  
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Constant-time comparison to prevent timing attacks
  const encoder = new TextEncoder();
  const a = encoder.encode(apiKey);
  const b = encoder.encode(env.API_SECRET);
  
  if (a.length !== b.length || !crypto.subtle.timingSafeEqual(a, b)) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return null; // Auth passed
}

// Usage in route handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Protected route example
    if (url.pathname === '/api/forms' && request.method === 'GET') {
      const authError = requireAuth(request, env);
      if (authError) return authError;
      
      // ... handle request
    }
  }
};
```

#### Frontend Usage

```typescript
// In the frontend, store the API key (e.g., in localStorage after initial setup)
const API_KEY = localStorage.getItem('contactswap_api_key');

// Protected request
const response = await fetch('https://api.contactswap.app/api/forms', {
  headers: {
    'X-API-Key': API_KEY,
  },
});
```

#### Security Notes

- **API key is a shared secret** — treat it like a password
- **HTTPS only** — never send the key over unencrypted connections
- **Don't commit to git** — use environment variables
- **Rotate if compromised** — change `API_SECRET` in Cloudflare dashboard
- **Frontend storage** — localStorage is acceptable for single-user MVP; the key only protects your own data

#### Environment Variables

| Variable | Description |
|----------|-------------|
| `API_SECRET` | The API key that clients must provide for protected endpoints |
| `MAILERSEND_API_KEY` | MailerSend API key for sending emails |
| `OWNER_EMAIL` | Your email address (where contacts are sent) |

### Scheduled Cleanup (Cron)

Expired forms and their associated R2 objects need to be cleaned up to stay within free tier limits and maintain data hygiene.

#### Cleanup Job

A **Cloudflare Worker Cron Trigger** runs daily to:

1. Find forms where `expires_at < now()` and `status != 'expired'`
2. Update their status to `expired`
3. Delete the associated R2 object (original contact VCF)
4. Optionally: Delete form rows older than 90 days (hard delete)

#### Cron Schedule

```toml
# In wrangler.toml
[triggers]
crons = ["0 3 * * *"]  # Run at 3:00 AM UTC daily
```

#### Implementation

```typescript
export default {
  // Regular fetch handler
  async fetch(request: Request, env: Env): Promise<Response> {
    // ... API routes
  },
  
  // Scheduled handler (cron)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const now = new Date().toISOString();
    
    // 1. Find expired forms that haven't been marked yet
    const expiredForms = await env.DB.prepare(`
      SELECT id, original_contact_url 
      FROM forms 
      WHERE expires_at < ? AND status = 'pending'
    `).bind(now).all();
    
    // 2. Mark as expired and delete R2 objects
    for (const form of expiredForms.results) {
      // Delete from R2
      if (form.original_contact_url) {
        await env.R2.delete(form.original_contact_url);
      }
      
      // Update status
      await env.DB.prepare(`
        UPDATE forms SET status = 'expired' WHERE id = ?
      `).bind(form.id).run();
    }
    
    // 3. Hard delete forms older than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await env.DB.prepare(`
      DELETE FROM forms WHERE created_at < ?
    `).bind(ninetyDaysAgo).run();
    
    console.log(`Cleanup complete: ${expiredForms.results.length} forms expired`);
  },
};
```

#### Cleanup Policy

| Age | Action |
|-----|--------|
| 30 days (expires_at) | Mark as `expired`, delete R2 object |
| 90 days | Hard delete form row from D1 |

This keeps the database lean and ensures R2 storage doesn't grow unbounded.

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

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Health check — returns status and version | Public |
| POST | `/api/forms` | Create new form (upload contact + template_id) | 🔒 Protected |
| GET | `/api/forms` | List all forms (with status filter) | 🔒 Protected |
| GET | `/api/forms/:token` | Get form data (for rendering the form) | Public |
| POST | `/api/forms/:token/respond` | Submit form response | Public |
| DELETE | `/api/forms/:id` | Delete a form and its R2 object | 🔒 Protected |
| GET | `/api/forms/:token/qr` | Get your contact as QR code | Public |
| GET | `/api/config` | Get your config | 🔒 Protected |
| PUT | `/api/config` | Update your contact | 🔒 Protected |
| GET | `/api/templates` | List all templates | 🔒 Protected |
| POST | `/api/templates` | Create custom template | 🔒 Protected |
| GET | `/api/templates/:id` | Get template by ID | 🔒 Protected |
| PUT | `/api/templates/:id` | Update template | 🔒 Protected |
| DELETE | `/api/templates/:id` | Delete custom template | 🔒 Protected |

#### Health Check Endpoint

```typescript
// GET /api/health
// Returns service status for monitoring and deployment verification

interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  timestamp: string;
}

// Example response:
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-04-16T12:00:00Z"
}
```

#### List Forms Endpoint

```typescript
// GET /api/forms?status=pending&limit=50&offset=0
// Returns paginated list of forms you've created

interface ListFormsQuery {
  status?: 'pending' | 'completed' | 'expired';  // Filter by status
  limit?: number;   // Default: 50, max: 100
  offset?: number;  // For pagination
}

interface ListFormsResponse {
  forms: {
    id: string;
    token: string;
    original_contact_name: string;
    status: 'pending' | 'completed' | 'expired';
    created_at: string;
    completed_at: string | null;
    expires_at: string;
  }[];
  total: number;
  limit: number;
  offset: number;
}
```

#### Delete Form Endpoint

```typescript
// DELETE /api/forms/:id
// Deletes a form and its associated R2 object

// Success: 204 No Content
// Not found: 404
// Unauthorized: 401/403
```

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
| Log exposure | Don't log tokens; use form IDs for debugging |
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

### Constraints

| Constraint | Limit | Reason |
|------------|-------|--------|
| **vCard file size** | Target < 100KB | Email deliverability, fast parsing |
| **Email attachment** | Max 25MB (MailerSend) | Service limit |
| **R2 storage** | 10GB free tier | Cost control |
| **Original photo** | Often 2-10MB | Phone cameras are high-res |
| **Base64 overhead** | +33% size | Encoding bloat |

### Processing Pipeline

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

### Implementation

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

### Form UI for Photo Upload

On the form, the photo field should:
- Show a circular preview (contact photo style)
- Allow drag-and-drop or click to upload
- Show upload progress
- Display "Photo will be resized to 200x200" hint
- Allow removing/replacing the photo
- Pre-fill with existing photo from uploaded contact (if any)

### Photo in Parsing (Upload)

When you upload a contact that already has a photo:
- **Strip the photo** — Don't pre-fill the form with it
- Reason: The recipient should provide their own current photo
- The original contact's photo is likely outdated (that's why you're asking for updates!)

### Size Budget

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

## Security & Privacy

### Data Privacy

- **No response data retained** — Form submissions are processed in-memory, emailed to you, then immediately discarded. Nothing stored.
- **No accounts required for recipients** — Recipients just fill a form
- **Single-user MVP** — You are the only requester (no auth needed for MVP, or simple API key)
- **Form metadata only** — D1 stores form metadata (token, status, expiry) but never the submitted contact data
- **Original contact deleted on expiry** — After 30 days, the uploaded contact is deleted from R2
- **No tracking** — No analytics cookies, no third-party scripts
- **HTTPS only** — All traffic encrypted
- **Referrer policy** — `no-referrer` to prevent token leakage

### Rate Limiting

Prevent abuse of form creation and submission:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/forms` (create) | 10 requests | per minute |
| `POST /api/forms/:token/respond` (submit) | 3 requests | per form |
| `GET /api/forms/:token` (view) | 30 requests | per minute |

**Implementation:** Use Cloudflare's built-in rate limiting or a simple in-memory counter with D1 for persistence.

### Input Validation

| Field | Validation |
|-------|------------|
| Email | RFC 5322 format, max 254 chars |
| Phone | E.164 format preferred, allow common formats |
| URL | Valid URL format, https preferred |
| Name | Max 200 chars, allow Unicode |
| Address | Max 500 chars per field |
| Notes | Max 2000 chars |
| Photo | Max 10MB, image types only |

### GDPR Considerations

- **Data minimization** — Only collect fields you actually need (templates help here)
- **Right to erasure** — Forms auto-expire and delete after 30 days
- **No tracking** — No cookies, no analytics on form pages
- **Transparency** — Form page shows "Your info will be sent to {your name}"

---

## Error Handling

### User-Facing Errors

| Scenario | Message | HTTP Status |
|----------|---------|-------------|
| Form not found | "This form doesn't exist or has been removed." | 404 |
| Form expired | "This form has expired. Please ask {name} for a new link." | 410 |
| Form already completed | "This form has already been submitted." | 409 |
| Invalid file upload | "Please upload a valid .vcf contact file." | 400 |
| Photo too large | "Photo must be under 10MB." | 400 |
| Rate limited | "Too many requests. Please try again in a minute." | 429 |
| Server error | "Something went wrong. Please try again." | 500 |

### Error Logging

- Log errors to Cloudflare's built-in logging (no external service needed)
- **Never log tokens** — Use form IDs for debugging
- Include request ID for tracing
- Alert on repeated 500 errors (future: integrate with monitoring)

---

## Accessibility

The form UI should meet **WCAG 2.1 AA** standards:

- **Keyboard navigation** — All form fields accessible via Tab
- **Screen reader support** — Proper labels, ARIA attributes
- **Color contrast** — Minimum 4.5:1 ratio for text
- **Focus indicators** — Visible focus states on all interactive elements
- **Error messages** — Associated with form fields, announced to screen readers
- **Mobile-friendly** — Touch targets minimum 44x44px

---

## Internationalization (i18n)

### MVP: English Only

- Form UI in English
- Support international **data** (names, addresses, phone numbers)
- Phone numbers: Accept any format, normalize to E.164 where possible

### Future: Multi-language Forms

- Detect browser language
- Translate form labels and buttons
- Keep field data in original language (don't translate names!)

---

## Testing Strategy

### Unit Tests

| Component | What to Test |
|-----------|--------------|
| VCF Parser | Parse vCard 2.1, 3.0, 4.0 samples |
| VCF Generator | Output valid vCard 3.0, proper escaping |
| Photo Processor | Resize, compress, validate types |
| Token Generator | Cryptographic randomness, format |

### Integration Tests

| Flow | What to Test |
|------|--------------|
| Form Creation | Upload VCF → Create form → Get shareable URL |
| Form Submission | Open form → Fill fields → Submit → Email sent |
| Expiration | Create form → Wait 30 days → Form returns 410 |
| Template CRUD | Create, read, update, delete templates |

### E2E Tests

- Full user flow from upload to email receipt
- Mobile form submission
- QR code scanning (manual test)

---

## Monitoring & Observability

### Metrics to Track

| Metric | Purpose |
|--------|---------|
| Forms created / day | Usage tracking |
| Forms completed / day | Conversion rate |
| Form completion rate | % of forms that get filled |
| Average time to complete | UX quality |
| Email delivery success rate | Reliability |
| Error rate by endpoint | Health monitoring |

### Alerting (Future)

- Email delivery failures > 5% → Alert
- Error rate > 1% → Alert
- Forms created > 1000/day → Investigate (abuse?)

---

## Deployment Checklist

### Before Launch

- [ ] Domain `contactswap.app` registered and configured
- [ ] Cloudflare account set up (Workers, Pages, D1, R2)
- [ ] MailerSend account created, domain verified
- [ ] Environment variables configured:
  - `MAILERSEND_API_KEY`
  - `OWNER_EMAIL`
  - `API_SECRET` (for protected endpoints)
- [ ] D1 database created, schema migrated
- [ ] R2 bucket created
- [ ] CORS configured for `contactswap.app` ↔ `api.contactswap.app`
- [ ] Rate limiting enabled
- [ ] Default templates seeded in database
- [ ] Your contact VCF uploaded to config

### Post-Launch

- [ ] Verify email delivery works
- [ ] Test form creation and submission end-to-end
- [ ] Monitor error rates for first 24 hours
- [ ] Set up basic alerting

---

## Open Questions (Resolved)

All open questions have been resolved:

1. ~~**Authentication for requesters?**~~ — MVP: single user (you). Simple API key or env-based auth.
2. ~~**Form expiration default?**~~ — 30 days. Expired forms show friendly error.
3. ~~**Multiple contacts per form?**~~ — MVP: one contact per form.
4. ~~**Photo handling?**~~ — Accept uploads, resize to 200x200, JPEG 80%, embed as base64.
5. ~~**Delivery method priority?**~~ — Email only via MailerSend. Plain-text with .vcf attachment.
6. ~~**Form customization?**~~ — Template-based: you pick a template at form creation.
7. ~~**Internationalization?**~~ — Support international data. UI in English for MVP.
8. ~~**VCF version?**~~ — Output vCard 3.0 (RFC 2426). Accept 2.1, 3.0, 4.0 on input.

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Form completion rate | > 60% | Forms completed / Forms created |
| Time to complete form | < 2 minutes | Timestamp diff (created → completed) |
| Contact parse success rate | > 95% | Successful parses / Upload attempts |
| Email delivery rate | > 98% | MailerSend delivery reports |
| Error rate | < 1% | 5xx responses / Total requests |
| User satisfaction | Qualitative | Your own experience using it |

---

## Milestones

### M1: Core Flow (Week 1-2)
- [ ] Project setup (Cloudflare Workers, D1, R2)
- [ ] VCF parser (accept 2.1, 3.0, 4.0)
- [ ] VCF generator (output 3.0)
- [ ] Form creation API endpoint
- [ ] Secure token generation
- [ ] Basic form UI (pre-filled fields)

### M2: Delivery & Exchange (Week 2-3)
- [ ] Form submission API endpoint
- [ ] MailerSend integration (email with attachment)
- [ ] QR code generation (MECARD format)
- [ ] Thank you page with QR code
- [ ] Your contact configuration page
- [ ] Photo upload and processing

### M3: Templates & Polish (Week 3-4)
- [ ] Template CRUD API
- [ ] Template management UI
- [ ] Default templates seeded
- [ ] Form expiration handling
- [ ] Error pages (404, 410, etc.)
- [ ] Input validation
- [ ] Rate limiting

### M4: Launch (Week 4+)
- [ ] Domain setup (contactswap.app)
- [ ] Production deployment
- [ ] End-to-end testing
- [ ] Documentation
- [ ] Soft launch (personal use)

---

## Future Considerations

Ideas captured for post-MVP development:

| Idea | Notes |
|------|-------|
| **Bulk upload** | Upload CSV/multiple VCFs, create batch of forms |
| **Reminder emails** | "Hey, you haven't filled this out yet" after 7 days |
| **Contact diff** | Show what changed between original and new contact |
| **Form analytics** | Track opens, completion time, drop-off points |
| **Custom expiration** | Let user set 7/14/30/90 day expiry per form |
| **Webhook delivery** | POST the VCF to a URL instead of email |
| **iOS Shortcut** | Quick action to create form from Contacts app |
| **Browser extension** | Right-click contact → Create ContactSwap form |
| **Multi-user** | Accounts, teams, shared templates |
| **API access** | Public API for integrations |

---

## References

- [vCard 3.0 Specification (RFC 2426)](https://datatracker.ietf.org/doc/html/rfc2426) — ContactSwap output format
- [vCard 4.0 Specification (RFC 6350)](https://datatracker.ietf.org/doc/html/rfc6350) — Accepted for parsing input
- [MECARD Format](https://en.wikipedia.org/wiki/MeCard_(QR_code)) — QR code contact encoding
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [MailerSend API Docs](https://developers.mailersend.com/)
- [E.164 Phone Number Format](https://en.wikipedia.org/wiki/E.164)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
