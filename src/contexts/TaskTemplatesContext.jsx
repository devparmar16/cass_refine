import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const TaskTemplatesContext = createContext();

export const useTaskTemplates = () => {
  const context = useContext(TaskTemplatesContext);
  if (!context) {
    throw new Error('useTaskTemplates must be used within TaskTemplatesProvider');
  }
  return context;
};

export const TaskTemplatesProvider = ({ children }) => {
  const [templates, setTemplates] = useState([]); // All tasks from all events
  const [groupedByRole, setGroupedByRole] = useState({}); // Tasks grouped by assigned_to role
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);

  // Fetch all tasks from all events
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks_temp')
        .select('id, task_name, task_desc, assigned_to, assigned_to_label, event_id, upload_type, form_schema, flow_template_id, created_at')
        .order('task_name', { ascending: true });

      if (error) throw error;

      setTemplates(data || []);
      
      // Group by assigned_to role
      const grouped = {};
      (data || []).forEach(task => {
        const role = task.assigned_to;
        if (!grouped[role]) {
          grouped[role] = {
            label: task.assigned_to_label,
            tasks: []
          };
        }
        grouped[role].tasks.push(task);
      });

      setGroupedByRole(grouped);
      setLastFetch(new Date());
    } catch (err) {
      console.error('Error fetching task templates:', err);
      setTemplates([]);
      setGroupedByRole({});
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Copy selected tasks to a specific event
  const copyTasksToEvent = useCallback(async (taskIds, targetEventId) => {
    try {
      // Fetch the tasks to be copied
      const { data: tasksToCopy, error: fetchError } = await supabase
        .from('tasks_temp')
        .select('*')
        .in('id', taskIds);

      if (fetchError) throw fetchError;

      // Prepare new tasks (without id, created_at, updated_at, and with new event_id)
      const newTasks = tasksToCopy.map(task => {
        const { id, created_at, updated_at, ...taskData } = task;
        return {
          ...taskData,
          event_id: targetEventId,
          status: 'assigned', // Reset status to assigned
          current_step: task.upload_type === 'none' ? null : 0,
          current_reviewer_role: null,
        };
      });

      // Insert new tasks
      const { data: insertedTasks, error: insertError } = await supabase
        .from('tasks_temp')
        .insert(newTasks)
        .select();

      if (insertError) throw insertError;

      // Refresh templates cache
      await fetchTemplates();

      return { success: true, insertedTasks };
    } catch (err) {
      console.error('Error copying tasks:', err);
      return { success: false, error: err.message };
    }
  }, [fetchTemplates]);

  // Add a new task to cache (call this after creating a task)
  const addTaskToCache = useCallback((newTask) => {
    setTemplates(prev => [...prev, newTask].sort((a, b) => a.task_name.localeCompare(b.task_name)));
    
    setGroupedByRole(prev => {
      const role = newTask.assigned_to;
      const updated = { ...prev };
      if (!updated[role]) {
        updated[role] = {
          label: newTask.assigned_to_label,
          tasks: []
        };
      }
      updated[role].tasks.push(newTask);
      return updated;
    });
  }, []);

  // Check if a task already exists in cache
  const taskExistsInCache = useCallback((taskName, eventId) => {
    return templates.some(t => t.task_name === taskName && t.event_id === eventId);
  }, [templates]);

  const value = {
    templates,
    groupedByRole,
    loading,
    lastFetch,
    fetchTemplates,
    copyTasksToEvent,
    addTaskToCache,
    taskExistsInCache,
  };

  return (
    <TaskTemplatesContext.Provider value={value}>
      {children}
    </TaskTemplatesContext.Provider>
  );
};
