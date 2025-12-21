import { supabase } from '@/lib/supabase';

/**
 * STEP-5 CORE
 * Converts form data → JSON file → uploads to storage
 */
export async function uploadFormAsFile({
  task,
  eventId,
  userRole,
  bucketName,
  formData
}) {
  // 1. Serialize form data
  const jsonString = JSON.stringify(formData, null, 2);

  // 2. Convert to Blob
  const blob = new Blob([jsonString], {
    type: 'application/json',
  });

  // 3. Create File object
  const fileName = `form_${Date.now()}.json`;
  const file = new File([blob], fileName, {
    type: 'application/json',
  });

  // 4. Storage path
  const storagePath = `${eventId}/${task.id}/form/${fileName}`;

  // 5. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(storagePath, file);

  if (uploadError) {
    console.error(uploadError);
    throw new Error('Form upload failed');
  }

  // 6. Insert submission record
  const { error: insertError } = await supabase
    .from('task_submissions')
    .insert({
      task_id: task.id,
      submitted_by_role: userRole,
      data: formData,        // raw JSON for UI
      file_url: storagePath // stored file
    });

  if (insertError) {
    console.error(insertError);
    throw new Error('Failed to record form submission');
  }

  return storagePath;
}
