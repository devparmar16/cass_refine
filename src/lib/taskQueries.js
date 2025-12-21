import { supabase } from './supabase';
import { normalizeRole } from './roleUtils';

/**
 * Get tasks assigned to a role which are not yet uploaded
 * @param {string} role - The role (will be normalized before querying)
 */
export async function getMyTasks(role) {
  const normalizedRole = normalizeRole(role);
  const { data, error } = await supabase
    .from('tasks_temp')
    .select('*')
    .eq('assigned_to', normalizedRole)
    .in('status', ['assigned', 'pending', 'in_review'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}


export const getTaskComments = async (taskId) => {
  console.log('[getTaskComments] Fetching for task_id:', taskId);
  const { data, error } = await supabase
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('[getTaskComments] Error:', error);
    throw error;
  }
  
  console.log('[getTaskComments] Found', data?.length || 0, 'comments');
  return data || [];
};


/**
 * Get tasks uploaded by assigned_to role
 * @param {string} role - The role (will be normalized before querying)
 */
export async function getUploadedTasks(role) {
  const normalizedRole = normalizeRole(role);
  const { data, error } = await supabase
    .from('tasks_temp')
    .select('*')
    .eq('assigned_to', normalizedRole)
    .in('status', ['uploaded'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get tasks currently assigned for review to a role
 * status: in_review
 * @param {string} role - The role (will be normalized before querying)
 */
export async function getReviewTasks(role) {
  const normalizedRole = normalizeRole(role);
  const { data, error } = await supabase
    .from('tasks_temp')
    .select('*')
    .eq('current_reviewer_role', normalizedRole)
    .eq('status', 'in_review')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get tasks for a specific filter type
 * @param {string} role - The role (will be normalized before querying)
 * @param {string} filterType - The filter type: mytasks, uploaded, review
 */
export async function getTasksForFilter(role, filterType) {
  const normalizedRole = normalizeRole(role);
  let query = supabase.from('tasks_temp').select('*');

  switch (filterType) {
    case 'mytasks':
      // Include 'rejected' so assignee can see and re-upload rejected tasks
      query = query.eq('assigned_to', normalizedRole).in('status', ['assigned', 'pending', 'rejected']);
      break;
    case 'uploaded':
      query = query.eq('assigned_to', normalizedRole).eq('status', 'uploaded');
      break;
    case 'review':
      query = query.eq('current_reviewer_role', normalizedRole).eq('status', 'in_review');
      break;
    default:
      throw new Error('Invalid filter type');
  }

  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}