/**
 * VCF / vCard generator
 *
 * Builds a vCard 3.0 string from a Contact record and optional photo.
 * Mirrors the field mapping used by vcf-parser.ts (same FieldKey set).
 */

import type { Contact } from '@contactswap/shared';

/**
 * Fold long lines per RFC 6350 §3.2: lines longer than 75 octets are folded
 * by inserting CRLF followed by a single space at the 75-octet boundary.
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(' ' + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join('\r\n');
}

/**
 * Encode an address ADR value.
 * Order: PO Box;Extended;Street;City;Region;Postal Code;Country
 * We only fill Street for simplicity — the full string is passed as the street component.
 */
function encodeAdr(address: string): string {
  // Escape special characters in address value
  const safe = address.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  // ;; PO Box ; Extended ; Street ; City ; Region ; Postal ; Country
  return `;;${safe};;;;`;
}

function escapePropValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

export interface GenerateVcfOptions {
  contact: Contact;
  /** Base64-encoded photo payload (without data URI prefix). */
  photoBase64?: string | null;
  /** MIME type of the photo, e.g. 'image/jpeg'. */
  photoMimeType?: string | null;
}

/**
 * Generate a vCard 3.0 string from a Contact record.
 * Returns the complete VCF text with CRLF line endings.
 */
export function generateVcf(options: GenerateVcfOptions): string {
  const { contact, photoBase64, photoMimeType } = options;
  const lines: string[] = [];

  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');

  // FN (always present — required field)
  lines.push(fold(`FN:${escapePropValue(contact.fullName)}`));

  // N — Family;Given;Additional;Prefix;Suffix
  const lastName = escapePropValue(contact.lastName ?? '');
  const firstName = escapePropValue(contact.firstName ?? '');
  lines.push(fold(`N:${lastName};${firstName};;;`));

  if (contact.workEmail) {
    lines.push(fold(`EMAIL;TYPE=WORK:${escapePropValue(contact.workEmail)}`));
  }
  if (contact.personalEmail) {
    lines.push(fold(`EMAIL;TYPE=HOME:${escapePropValue(contact.personalEmail)}`));
  }
  if (contact.workPhone) {
    lines.push(fold(`TEL;TYPE=WORK:${escapePropValue(contact.workPhone)}`));
  }
  if (contact.cellPhone) {
    lines.push(fold(`TEL;TYPE=CELL:${escapePropValue(contact.cellPhone)}`));
  }
  if (contact.homePhone) {
    lines.push(fold(`TEL;TYPE=HOME:${escapePropValue(contact.homePhone)}`));
  }
  if (contact.workAddress) {
    lines.push(fold(`ADR;TYPE=WORK:${encodeAdr(contact.workAddress)}`));
  }
  if (contact.homeAddress) {
    lines.push(fold(`ADR;TYPE=HOME:${encodeAdr(contact.homeAddress)}`));
  }
  if (contact.company) {
    lines.push(fold(`ORG:${escapePropValue(contact.company)}`));
  }
  if (contact.jobTitle) {
    lines.push(fold(`TITLE:${escapePropValue(contact.jobTitle)}`));
  }
  if (contact.website) {
    lines.push(fold(`URL:${escapePropValue(contact.website)}`));
  }
  if (contact.birthday) {
    lines.push(fold(`BDAY:${escapePropValue(contact.birthday)}`));
  }
  if (contact.notes) {
    lines.push(fold(`NOTE:${escapePropValue(contact.notes)}`));
  }

  // PHOTO — vCard 3.0 format: PHOTO;ENCODING=b;TYPE=JPEG:<base64>
  if (photoBase64 && photoMimeType) {
    const typeParam = photoMimeType.split('/')[1]?.toUpperCase() ?? 'JPEG';
    // Photo lines must also be folded; fold() handles that via the 75-char rule
    const photoLine = `PHOTO;ENCODING=b;TYPE=${typeParam}:${photoBase64}`;
    lines.push(fold(photoLine));
  }

  lines.push('END:VCARD');

  return lines.join('\r\n') + '\r\n';
}

/**
 * Derive a safe filename from a contact name.
 * e.g. "Jane Doe" → "jane-doe.vcf"
 */
export function vcfFilename(fullName: string): string {
  const slug = fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'contact'}.vcf`;
}
