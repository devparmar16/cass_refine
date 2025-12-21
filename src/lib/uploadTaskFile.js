import { supabase } from '@/lib/supabase';

/**
 * SINGLE storage helper - all uploads go through here
 * Bucket selection based on role
 * Path: {event_id}/{task_id}/{timestamp}_{filename}
 * 
 * Keys use normalized role values (e.g., "chair_person", "vice_chairperson")
 */
const ROLE_BUCKETS = {
  chair_person: 'chair',
  vice_chairperson: 'vice',
  secretary: 'sec',
  treasurer: 'treasurer',
  technical_coordinator: 'tech',
  event_coordinator: 'event',
  social_media_promotion_manager: 'social',
  social_media_manager: 'social',
};

export async function uploadTaskFile({ file, role, eventId, taskId }) {
  const bucket = ROLE_BUCKETS[role];
  if (!bucket) throw new Error(`Invalid role for storage: ${role}`);

  const path = `${eventId}/${taskId}/${Date.now()}_${file.name}`;

  console.log('[uploadTaskFile] Uploading to bucket:', bucket, 'path:', path);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file);

  if (error) {
    console.error('[uploadTaskFile] Upload error:', error);
    throw error;
  }

  // Get public URL
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  console.log('[uploadTaskFile] Public URL:', data.publicUrl);

  return data.publicUrl;
}
