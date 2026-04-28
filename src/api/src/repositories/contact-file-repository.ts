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

export async function deleteObjectsByPrefix(bucket: R2Bucket, prefix: string): Promise<number> {
  let cursor: string | undefined;
  let deletedCount = 0;

  do {
    const page = await bucket.list({
      prefix,
      cursor,
      limit: 1000,
    });

    const keys = page.objects.map((obj) => obj.key);
    if (keys.length > 0) {
      await bucket.delete(keys);
      deletedCount += keys.length;
    }

    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return deletedCount;
}
