import { supabase } from './supabase';

/**
 * Create a task submission
 */
export async function createTaskSubmission({
  taskId,
  role,
  data = null,
  fileUrl = null,
}) {
  console.log('[createTaskSubmission] Inserting:', { taskId, role, data, fileUrl });

  const { data: res, error } = await supabase
    .from('task_submissions')
    .insert([
      {
        task_id: taskId,
        submitted_by_role: role,
        data,
        file_url: fileUrl,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('[createTaskSubmission] Error:', error);
    throw error;
  }

  console.log('[createTaskSubmission] Success:', res);
  return res;
}
