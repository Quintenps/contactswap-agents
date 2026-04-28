/**
 * VCF / vCard parser
 *
 * Supports vCard 3.0 and 4.0. Handles:
 *  - CRLF and LF line endings
 *  - Folded lines (RFC 6350 §3.2)
 *  - Case-insensitive property names and type parameters
 *  - PHOTO in vCard 3.0 format: PHOTO;ENCODING=b;TYPE=JPEG:<base64>
 *  - PHOTO in vCard 4.0 format: PHOTO:data:image/jpeg;base64,<data>
 */

import type { Contact } from '@contactswap/shared';

export interface ParsedVcf {
  contact: Contact;
  photoBase64: string | null;
  photoMimeType: string | null;
}

/**
 * Unfold continuation lines per RFC 6350 §3.2.
 * A folded line starts with a single SPACE or TAB character.
 */
function unfold(raw: string): string {
  return raw.replace(/\r\n([ \t])/g, '$1').replace(/\n([ \t])/g, '$1');
}

/**
 * Split a vCard property line into its name (with parameters) and value parts.
 * Only splits on the first unquoted colon.
 */
function splitLine(line: string): { nameWithParams: string; value: string } | null {
  const idx = line.indexOf(':');
  if (idx === -1) return null;
  return {
    nameWithParams: line.slice(0, idx).toUpperCase(),
    value: line.slice(idx + 1),
  };
}

function hasParam(nameWithParams: string, param: string): boolean {
  return nameWithParams.includes(param.toUpperCase());
}

/**
 * Decode a vCard ADR value (semicolon-delimited components) into a readable string.
 * Order: PO Box, Extended, Street, City, Region, Postal Code, Country
 */
function decodeAdr(value: string): string {
  return value
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * Extract MIME type from a vCard 4.0 data URI photo value.
 * e.g. "data:image/jpeg;base64,/9j/..."
 */
function mimeFromDataUri(value: string): string | null {
  const match = value.match(/^data:([^;]+);base64,/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Extract base64 payload from a vCard 4.0 data URI photo value.
 */
function base64FromDataUri(value: string): string | null {
  const match = value.match(/^data:[^;]+;base64,(.+)$/is);
  return match ? match[1].replace(/\s/g, '') : null;
}

/**
 * Detect MIME type from vCard 3.0 PHOTO TYPE parameter.
 * e.g. "PHOTO;ENCODING=b;TYPE=JPEG" → "image/jpeg"
 */
function mimeFromTypeParam(nameWithParams: string): string | null {
  const match = nameWithParams.match(/TYPE=([A-Z0-9]+)/i);
  if (!match) return null;
  const type = match[1].toLowerCase();
  const map: Record<string, string> = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return map[type] ?? `image/${type}`;
}

export function parseVcf(raw: string): ParsedVcf {
  const unfolded = unfold(raw);
  const lines = unfolded.split(/\r?\n/);

  const contact: Contact = { fullName: '' };
  let photoBase64: string | null = null;
  let photoMimeType: string | null = null;

  // Track whether we've already assigned a personal email (first bare EMAIL)
  let hasPersonalEmail = false;

  for (const line of lines) {
    if (!line || line.startsWith('BEGIN:') || line.startsWith('END:') || line.startsWith('VERSION:')) {
      continue;
    }

    const parsed = splitLine(line);
    if (!parsed) continue;

    const { nameWithParams, value } = parsed;
    const trimmedValue = value.trim();
    if (!trimmedValue) continue;

    // FN — Full Name
    if (nameWithParams === 'FN') {
      contact.fullName = trimmedValue;
      continue;
    }

    // N — Structured name (Family;Given;Additional;Prefix;Suffix)
    if (nameWithParams === 'N') {
      const parts = trimmedValue.split(';');
      if (parts[0]) contact.lastName = parts[0].trim();
      if (parts[1]) contact.firstName = parts[1].trim();
      continue;
    }

    // EMAIL
    if (nameWithParams.startsWith('EMAIL')) {
      if (hasParam(nameWithParams, 'TYPE=WORK')) {
        if (!contact.workEmail) contact.workEmail = trimmedValue;
      } else if (hasParam(nameWithParams, 'TYPE=HOME')) {
        if (!contact.personalEmail) contact.personalEmail = trimmedValue;
      } else if (!hasPersonalEmail) {
        // Bare EMAIL — treat as personal
        contact.personalEmail = trimmedValue;
        hasPersonalEmail = true;
      }
      continue;
    }

    // TEL
    if (nameWithParams.startsWith('TEL')) {
      if (hasParam(nameWithParams, 'TYPE=WORK')) {
        if (!contact.workPhone) contact.workPhone = trimmedValue;
      } else if (hasParam(nameWithParams, 'TYPE=CELL') || hasParam(nameWithParams, 'TYPE=MOBILE')) {
        if (!contact.cellPhone) contact.cellPhone = trimmedValue;
      } else if (hasParam(nameWithParams, 'TYPE=HOME')) {
        if (!contact.homePhone) contact.homePhone = trimmedValue;
      }
      continue;
    }

    // ADR
    if (nameWithParams.startsWith('ADR')) {
      const decoded = decodeAdr(trimmedValue);
      if (!decoded) continue;
      if (hasParam(nameWithParams, 'TYPE=WORK')) {
        if (!contact.workAddress) contact.workAddress = decoded;
      } else if (hasParam(nameWithParams, 'TYPE=HOME')) {
        if (!contact.homeAddress) contact.homeAddress = decoded;
      }
      continue;
    }

    // ORG
    if (nameWithParams === 'ORG') {
      // ORG can be semicolon-delimited: CompanyName;Department
      contact.company = trimmedValue.split(';')[0].trim();
      continue;
    }

    // TITLE
    if (nameWithParams === 'TITLE') {
      contact.jobTitle = trimmedValue;
      continue;
    }

    // URL
    if (nameWithParams === 'URL' || nameWithParams.startsWith('URL;')) {
      contact.website = trimmedValue;
      continue;
    }

    // BDAY
    if (nameWithParams === 'BDAY') {
      // Normalise to YYYY-MM-DD if possible
      const raw = trimmedValue.replace(/[^\d-]/g, '');
      if (raw.length === 8 && !raw.includes('-')) {
        // YYYYMMDD → YYYY-MM-DD
        contact.birthday = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
      } else {
        contact.birthday = trimmedValue;
      }
      continue;
    }

    // NOTE
    if (nameWithParams === 'NOTE') {
      contact.notes = trimmedValue;
      continue;
    }

    // PHOTO — vCard 4.0 data URI
    if (nameWithParams === 'PHOTO' && trimmedValue.startsWith('data:')) {
      photoMimeType = mimeFromDataUri(trimmedValue) ?? 'image/jpeg';
      photoBase64 = base64FromDataUri(trimmedValue);
      continue;
    }

    // PHOTO — vCard 3.0 (ENCODING=b or ENCODING=BASE64)
    if (nameWithParams.startsWith('PHOTO') && (hasParam(nameWithParams, 'ENCODING=B') || hasParam(nameWithParams, 'ENCODING=BASE64'))) {
      photoMimeType = mimeFromTypeParam(nameWithParams) ?? 'image/jpeg';
      photoBase64 = trimmedValue.replace(/\s/g, '');
      continue;
    }
  }

  return { contact, photoBase64, photoMimeType };
}

/**
 * Map a MIME type to a file extension.
 */
export function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[mimeType.toLowerCase()] ?? 'bin';
}
