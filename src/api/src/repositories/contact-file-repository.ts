/**
 * R2 contact file persistence layer
 */

export async function putOriginalVcf(
  bucket: R2Bucket,
  objectKey: string,
  vcfText: string,
): Promise<void> {
  await bucket.put(objectKey, vcfText, {
    httpMetadata: { contentType: 'text/vcard' },
  });
}

export async function putContactPhoto(
  bucket: R2Bucket,
  objectKey: string,
  photoBytes: Uint8Array,
  mimeType: string,
): Promise<void> {
  await bucket.put(objectKey, photoBytes, {
    httpMetadata: { contentType: mimeType },
  });
}
