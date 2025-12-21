// --- CHAIR PERSON PAGE ---
// Supports:
// 1. View events created by chair
// 2. View tasks in mytasks/review/uploaded tabs with TaskCard component
// 3. Assign tasks via AssignTaskModal

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import TaskCard from '@/components/TaskCard';
import AssignTaskModal from './AssignTaskModal';
import { normalizeRole } from '@/lib/roleUtils';

// --- Event List Component ---
const ChairEventsList = ({ onSelectEvent }) => {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('created_by_role', 'Chair Person');
      if (!error) setEvents(data || []);
    };
    fetchEvents();
  }, []);
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Events Created by Chair</h2>
      <ul className="space-y-2">
        {events.map(event => (
          <li key={event.id}>
            <button
              onClick={() => onSelectEvent(event)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {event.event_name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

// --- Event View Component with Task Fetching ---
const EventView = ({ event, onBack, userRole }) => {
  const [tab, setTab] = useState('mytasks');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let query = supabase.from('tasks_temp').select('*').eq('event_id', event.id);

      switch (tab) {
        case 'mytasks':
          query = query.eq('assigned_to', userRole).in('status', ['assigned', 'pending']);
          break;
        case 'review':
          query = query.eq('current_reviewer_role', userRole).eq('status', 'in_review');
          break;
        case 'uploaded':
          query = query.eq('assigned_to', userRole).eq('status', 'uploaded');
          break;
      }

      const { data, error } = await query.order('created_at', { ascending: true });
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
    if (event?.id && userRole) {
      fetchTasks();
    }
  }, [tab, event?.id, userRole]);

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

  const FILTERS = ['mytasks', 'review', 'uploaded'];

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">
          Back to Events
        </button>
        <button
          onClick={() => setAssignModalOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Assign Task
        </button>
      </div>
      <h3 className="text-lg font-bold mb-4">Event: {event.event_name}</h3>

      <div className="flex gap-4 mb-4">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setTab(f)}
            className={`px-4 py-2 rounded ${
              tab === f ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'
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
            userRole={userRole}
            onUpload={handleUpload}
          />
        ))
      )}

      <AssignTaskModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onTaskAssigned={fetchTasks}
      />
    </div>
  );
};

// --- Main ChairPerson Page ---
const ChairPerson = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Convert user role to database format using normalizeRole
  const currentUserRole = normalizeRole(user?.role) || 'chair_person';

  useEffect(() => {
    // Redirect to Dashboard since role-based routing was removed
    navigate('/dashboard');
  }, [navigate]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Chair Person Events Page</h1>
      {!selectedEvent ? (
        <ChairEventsList onSelectEvent={setSelectedEvent} />
      ) : (
        <EventView
          event={selectedEvent}
          onBack={() => setSelectedEvent(null)}
          userRole={currentUserRole}
        />
      )}
    </div>
  );
};

export default ChairPerson;
