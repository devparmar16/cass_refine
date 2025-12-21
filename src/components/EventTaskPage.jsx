import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TaskCard from './TaskCard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeRole } from '@/lib/roleUtils';

const FILTERS = ['mytasks', 'review', 'uploaded', 'all'];

const EventTasksPage = () => {
  const { eventId } = useParams();
  const { user } = useAuth();
  const [filter, setFilter] = useState('mytasks'); // default focus
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Convert user role to database format using normalizeRole
  const currentUserRole = normalizeRole(user?.role) || 'chair_person';

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Debug: log what we're querying
      console.log('[EventTasksPage] Fetching tasks with:', {
        eventId,
        currentUserRole,
        userRole: user?.role,
        filter
      });

      let query = supabase.from('tasks_temp').select('*');
      
      // Only filter by event_id if it exists
      if (eventId) {
        query = query.eq('event_id', eventId);
      }

      switch (filter) {
        case 'mytasks':
          query = query.eq('assigned_to', currentUserRole).in('status', ['assigned', 'pending']);
          break;
        case 'review':
          query = query.eq('current_reviewer_role', currentUserRole).eq('status', 'in_review');
          break;
        case 'uploaded':
          query = query.eq('assigned_to', currentUserRole).eq('status', 'uploaded');
          break;
        case 'all':
          // No additional filters - show all tasks for this event (debug mode)
          break;
      }

      const { data, error } = await query.order('created_at', { ascending: true });
      
      // Debug: log results
      console.log('[EventTasksPage] Query result:', { data, error });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch tasks even without eventId for debugging
    if (currentUserRole) {
      fetchTasks();
    }
  }, [filter, eventId, currentUserRole]);

  const handleUpload = async (task) => {
    try {
      const { error } = await supabase
        .from('tasks_temp')
        .update({ status: 'uploaded', current_reviewer_role: null })
        .eq('id', task.id);

      if (error) throw error;
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Event Tasks</h2>
      
      {/* Debug info */}
      <div className="bg-yellow-100 p-3 rounded mb-4 text-sm">
        <strong>Debug:</strong> User Role: "{user?.role}" → DB Role: "{currentUserRole}" | Event ID: {eventId || 'none'}
      </div>

      <div className="flex gap-4 mb-4">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div>Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div>No tasks in this section.</div>
      ) : (
        tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            userRole={currentUserRole}
            onUpload={handleUpload}
          />
        ))
      )}
    </div>
  );
};

export default EventTasksPage;
