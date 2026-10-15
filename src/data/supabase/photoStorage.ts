import type { SupabaseClient } from '@supabase/supabase-js';

export const PHOTO_BUCKET = 'entry-photos';

const EXTENSIONS: Record<string, string> = { 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export const isDataUrl = (url: string) => url.startsWith('data:');

/** Upload a data-URL photo to Storage under the user's own folder and return its public URL. */
export async function uploadPhoto(client: SupabaseClient, uid: string, photoId: string, dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const type = blob.type || 'image/jpeg';
  const path = `${uid}/${photoId}.${EXTENSIONS[type] ?? 'jpg'}`;
  const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: type, cacheControl: '31536000' });
  if (error) throw new Error(`Could not upload the photo: ${error.message}`);
  return { path, url: client.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl };
}

/** Best effort: an orphaned file is harmless, so failures are ignored. */
export async function removePhotos(client: SupabaseClient, paths: Array<string | null>) {
  const real = paths.filter((p): p is string => !!p);
  if (real.length) await client.storage.from(PHOTO_BUCKET).remove(real).catch(() => undefined);
}
