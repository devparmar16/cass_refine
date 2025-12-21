import { supabase } from './supabaseClient';

/**
 * Upload file to role bucket with event/task hierarchy
 */
export async function uploadTaskFile({
  file,
  role,
  eventId,
  taskId,
}) {
  const bucket = roleBucketMap(role);

  const filePath = `event_${eventId}/task_${taskId}/${Date.now()}_${file.name}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      upsert: true,
    });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}

function roleBucketMap(role) {
  // Keys use normalized role values (e.g., "chair_person", "vice_chairperson")
  const map = {
    'chair_person': 'chair',
    'vice_chairperson': 'vice',
    'secretary': 'sec',
    'event_coordinator': 'event',
    'treasurer': 'treasurer',
    'technical_coordinator': 'tech',
    'social_media_promotion_manager': 'social',
    'social_media_manager': 'social',
  };

  return map[role];
}
