import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useTaskComments(task_uuid, _review_stat, task_id = null, event_id = null, task_name = null, role = null) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchComments = useCallback(async () => {
    if (!task_uuid && !task_id && !task_name) return;
    setLoading(true);
    setError(null);
    try {
      let data = [];
      let error = null;

      // Strategy 1: Fetch by task_uuid (most specific)
      if (task_uuid) {
        const res = await supabase
          .from('comments')
          .select('*')
          .eq('task_uuid', task_uuid)
          .order('created_at', { ascending: false });
        data = res.data;
        error = res.error;
        console.log('[useTaskComments] Strategy 1 - by task_uuid:', { task_uuid, commentsFound: data?.length });
      }

      // Strategy 2: If no comments found, try by task_id + event_id
      if ((!data || data.length === 0) && task_id && event_id) {
        const res2 = await supabase
          .from('comments')
          .select('*')
          .eq('task_id', task_id)
          .eq('event_id', event_id)
          .order('created_at', { ascending: false });
        if (!res2.error) {
          data = res2.data;
        }
        console.log('[useTaskComments] Strategy 2 - by task_id + event_id:', { task_id, event_id, commentsFound: data?.length });
      }

      // Strategy 3: If still no comments, try by task_name + event_id
      if ((!data || data.length === 0) && task_name && event_id) {
        const res3 = await supabase
          .from('comments')
          .select('*')
          .eq('task_name', task_name)
          .eq('event_id', event_id)
          .order('created_at', { ascending: false });
        if (!res3.error) {
          data = res3.data;
        }
        console.log('[useTaskComments] Strategy 3 - by task_name + event_id:', { task_name, event_id, commentsFound: data?.length });
      }

      // Strategy 4: If still no comments, try by task_name + role (for role-specific tasks)
      if ((!data || data.length === 0) && task_name && role) {
        const res4 = await supabase
          .from('comments')
          .select('*')
          .eq('task_name', task_name)
          .eq('commenter_role', role)
          .order('created_at', { ascending: false });
        if (!res4.error) {
          data = res4.data;
        }
        console.log('[useTaskComments] Strategy 4 - by task_name + role:', { task_name, role, commentsFound: data?.length });
      }

      // Strategy 5: Last resort - try by task_name only
      if ((!data || data.length === 0) && task_name) {
        const res5 = await supabase
          .from('comments')
          .select('*')
          .eq('task_name', task_name)
          .order('created_at', { ascending: false });
        if (!res5.error) {
          data = res5.data;
        }
        console.log('[useTaskComments] Strategy 5 - by task_name only:', { task_name, commentsFound: data?.length });
      }

      // Parse comment_type if it's a JSON string
      if (data && data.length > 0) {
        data = data.map(comment => {
          if (comment.comment_type && typeof comment.comment_type === 'string') {
            try {
              comment.comment_type = JSON.parse(comment.comment_type);
            } catch (e) {
              console.warn('[useTaskComments] Failed to parse comment_type:', comment.comment_type);
            }
          }
          return comment;
        });
      }
      
      setComments(data || []);
      if (error) throw error;
    } catch (err) {
      console.error('[useTaskComments] Error fetching comments:', err);
      setError(err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [task_uuid, task_id, event_id, task_name, role]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return { comments, loading, error, refetch: fetchComments };
} 