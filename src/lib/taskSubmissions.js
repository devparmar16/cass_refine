import { supabase } from './supabase';

/**
 * Create a task submission and update task status to trigger review flow
 */
export async function createTaskSubmission({
  taskId,
  role,
  data = null,
  fileUrl = null,
}) {
  console.log('[createTaskSubmission] Inserting:', { taskId, role, data, fileUrl });

  // 1. Insert the submission
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

  console.log('[createTaskSubmission] Submission created:', res);

  // 2. Get the task to find the review flow
  const { data: task, error: taskError } = await supabase
    .from('tasks_temp')
    .select('flow_template_id, assigned_to')
    .eq('id', taskId)
    .single();

  if (taskError) {
    console.error('[createTaskSubmission] Error fetching task:', taskError);
    throw taskError;
  }

  console.log('[createTaskSubmission] Task found:', task);

  // 3. If task has a review flow, get the first reviewer
  if (task.flow_template_id) {
    const { data: firstStep, error: stepError } = await supabase
      .from('review_flow_steps')
      .select('reviewer_role')
      .eq('template_id', task.flow_template_id)
      .eq('step_order', 0)
      .single();

    if (stepError) {
      console.error('[createTaskSubmission] Error fetching first step:', stepError);
      // Don't throw - continue with status update but no reviewer assignment
    }

    // 4. Update task status and assign to first reviewer
    const updateData = {
      status: 'in_review',
      current_reviewer_role: firstStep?.reviewer_role || null,
    };

    console.log('[createTaskSubmission] Updating task status:', updateData);

    const { error: updateError } = await supabase
      .from('tasks_temp')
      .update(updateData)
      .eq('id', taskId);

    if (updateError) {
      console.error('[createTaskSubmission] Error updating task:', updateError);
      throw updateError;
    }

    console.log('[createTaskSubmission] Task updated to in_review with reviewer:', firstStep?.reviewer_role);
  } else {
    // No review flow - mark as uploaded/completed
    console.log('[createTaskSubmission] No review flow, marking as uploaded');
    
    const { error: updateError } = await supabase
      .from('tasks_temp')
      .update({ status: 'uploaded' })
      .eq('id', taskId);

    if (updateError) {
      console.error('[createTaskSubmission] Error updating task:', updateError);
      throw updateError;
    }
  }

  return res;
}
