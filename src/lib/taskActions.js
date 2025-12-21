import { supabase } from '@/lib/supabase';

/**
 * Role to bucket mapping
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

/**
 * Extract storage path from a public URL
 * URL format: https://xxx.supabase.co/storage/v1/object/public/{bucket}/{path}
 */
function extractStoragePath(url, bucket) {
  if (!url) return null;
  try {
    const marker = `/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length);
  } catch (e) {
    console.error('[extractStoragePath] Error:', e);
    return null;
  }
}

/**
 * Delete files from storage using actual URLs from task_submissions
 */
export async function deleteTaskFilesFromSubmissions({ taskId, role }) {
  console.log('[deleteTaskFilesFromSubmissions] Fetching submissions for task:', taskId);

  // Get all submissions for this task
  const { data: submissions, error } = await supabase
    .from('task_submissions')
    .select('file_url, submitted_by_role')
    .eq('task_id', taskId);

  if (error) {
    console.error('[deleteTaskFilesFromSubmissions] Fetch error:', error);
    return;
  }

  if (!submissions || submissions.length === 0) {
    console.log('[deleteTaskFilesFromSubmissions] No submissions found');
    return;
  }

  console.log('[deleteTaskFilesFromSubmissions] Found', submissions.length, 'submissions');

  // Group by bucket (role)
  const bucketFiles = {};

  for (const sub of submissions) {
    // If role is provided, only delete files from that role's bucket
    const subRole = sub.submitted_by_role;
    if (role && subRole !== role) continue;

    const bucket = ROLE_BUCKETS[subRole];
    if (!bucket) {
      console.warn('[deleteTaskFilesFromSubmissions] Unknown role:', subRole);
      continue;
    }

    const path = extractStoragePath(sub.file_url, bucket);
    if (!path) {
      console.warn('[deleteTaskFilesFromSubmissions] Could not extract path from:', sub.file_url);
      continue;
    }

    if (!bucketFiles[bucket]) bucketFiles[bucket] = [];
    bucketFiles[bucket].push(path);
  }

  // Delete from each bucket
  for (const [bucket, paths] of Object.entries(bucketFiles)) {
    console.log('[deleteTaskFilesFromSubmissions] Deleting from bucket:', bucket, 'paths:', paths);

    const { error: deleteError } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (deleteError) {
      console.error('[deleteTaskFilesFromSubmissions] Delete error for bucket', bucket, ':', deleteError);
    } else {
      console.log('[deleteTaskFilesFromSubmissions] Deleted', paths.length, 'files from', bucket);
    }
  }
}

/**
 * ASSIGNED ROLE: Remove Upload (soft reset)
 * - Delete files from storage (using actual URLs from DB)
 * - Delete task_submissions
 * - ❌ DO NOT delete comments (comments persist forever per spec)
 * - Reset task to 'assigned' status
 */
export async function removeUpload({ task, role }) {
  console.log('[removeUpload] Starting reset for task:', task.id);

  // 1. Delete storage files using actual URLs from submissions
  await deleteTaskFilesFromSubmissions({
    taskId: task.id,
    role, // Only delete files submitted by this role
  });

  // 2. Delete task_submissions for this role
  const { error: subError } = await supabase
    .from('task_submissions')
    .delete()
    .eq('task_id', task.id)
    .eq('submitted_by_role', role);

  if (subError) console.error('[removeUpload] Submissions delete error:', subError);

  // 3. DO NOT delete comments - they persist across review cycles per spec
  // Comments are append-only and never reset

  // 4. Reset task state
  const { error: updateError } = await supabase
    .from('tasks_temp')
    .update({
      status: 'assigned',
      current_step: 0,
      current_reviewer_role: null,
    })
    .eq('id', task.id);

  if (updateError) {
    console.error('[removeUpload] Task update error:', updateError);
    return false;
  }

  console.log('[removeUpload] Reset complete');
  return true;
}

/**
 * CHAIR ONLY: Hard delete task
 * - Delete files from storage (all submissions)
 * - Delete task_submissions
 * - Delete task_comments
 * - Delete the task itself
 */
export async function hardDeleteTask({ task }) {
  console.log('[hardDeleteTask] Starting hard delete for task:', task.id);

  // 1. Delete storage files from all submissions (no role filter)
  await deleteTaskFilesFromSubmissions({
    taskId: task.id,
    role: null, // Delete ALL files regardless of role
  });

  // 2. Delete task_submissions
  const { error: subError } = await supabase
    .from('task_submissions')
    .delete()
    .eq('task_id', task.id);

  if (subError) console.error('[hardDeleteTask] Submissions delete error:', subError);

  // 3. Delete task_comments
  const { error: commentError } = await supabase
    .from('task_comments')
    .delete()
    .eq('task_id', task.id);

  if (commentError) console.error('[hardDeleteTask] Comments delete error:', commentError);

  // 4. Delete the task itself
  const { error: deleteError } = await supabase
    .from('tasks_temp')
    .delete()
    .eq('id', task.id);

  if (deleteError) {
    console.error('[hardDeleteTask] Task delete error:', deleteError);
    return false;
  }

  console.log('[hardDeleteTask] Hard delete complete');
  return true;
}
