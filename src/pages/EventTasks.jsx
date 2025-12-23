import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import AssignTaskModal from '@/pages/chair/AssignTaskModal';
import CopyTasksModal from '@/components/CopyTasksModal';
import { TaskTemplatesProvider } from '@/contexts/TaskTemplatesContext';
import { useAuth } from '@/contexts/AuthContext';
import TaskCard from '@/components/TaskCard';
import { hardDeleteTask } from '@/lib/taskActions';
import { Trash2 } from 'lucide-react';
import { normalizeRole } from '@/lib/roleUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Minimal EventTasks page — shows event title, three tabs, and Assign Task modal for Chair
function EventTasksContent() {
  const { eventId, role: urlRole, section } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [tab, setTab] = useState(section || 'mytasks');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Chair-only: Manage all tasks view
  const [showAllTasksView, setShowAllTasksView] = useState(false);
  const [allTasks, setAllTasks] = useState([]);
  const [allTasksLoading, setAllTasksLoading] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null); // For delete confirmation dialog

  // Convert user role to database format using normalizeRole
  const currentUserRole = normalizeRole(user?.role) || 'chair_person';

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      const { data, error } = await supabase.from('events').select('id,event_name').eq('id', eventId).single();
      if (!error) setEvent(data);
    };
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    setTab(section || 'mytasks');
  }, [section]);

  // Fetch tasks based on current tab
  const fetchTasks = async () => {
    setLoading(true);
    try {
      console.log('[EventTasks] Fetching tasks:', { eventId, currentUserRole, tab });
      
      if (tab === 'uploaded') {
        // /uploaded: Show tasks where user has submissions (regardless of status)
        // OR completed tasks for upload_type='none' (manual tasks)
        
        // First get task IDs where user has submissions
        const { data: submissions } = await supabase
          .from('task_submissions')
          .select('task_id')
          .eq('submitted_by_role', currentUserRole);

        const taskIds = [...new Set(submissions?.map(s => s.task_id) || [])];

        // Also fetch completed 'none' type tasks directly
        const { data: completedNoneTasks } = await supabase
          .from('tasks_temp')
          .select('*')
          .eq('event_id', eventId)
          .eq('assigned_to', currentUserRole)
          .eq('upload_type', 'none')
          .eq('status', 'completed');

        // Fetch tasks with submissions
        let tasksWithSubmissions = [];
        if (taskIds.length > 0) {
          const { data, error } = await supabase
            .from('tasks_temp')
            .select('*')
            .eq('event_id', eventId)
            .eq('assigned_to', currentUserRole)
            .in('id', taskIds)
            .order('created_at', { ascending: true });

          if (error) throw error;
          tasksWithSubmissions = data || [];
        }

        // Merge both lists (avoid duplicates)
        const allUploadedTasks = [...tasksWithSubmissions];
        (completedNoneTasks || []).forEach(t => {
          if (!allUploadedTasks.find(existing => existing.id === t.id)) {
            allUploadedTasks.push(t);
          }
        });

        setTasks(allUploadedTasks);
      } else {
        // /mytasks and /reviews - normal queries
        let query = supabase.from('tasks_temp').select('*').eq('event_id', eventId);

        switch (tab) {
          case 'mytasks':
            // Include 'in_progress' for upload_type='none' manual tasks
            query = query.eq('assigned_to', currentUserRole).in('status', ['assigned', 'pending', 'rejected', 'in_progress']);
            break;
          case 'reviews':
            query = query.eq('current_reviewer_role', currentUserRole).eq('status', 'in_review');
            break;
        }

        const { data, error } = await query.order('created_at', { ascending: true });
        console.log('[EventTasks] Query result:', { data, error });
        
        if (error) throw error;
        setTasks(data || []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId && currentUserRole) {
      fetchTasks();
    }
  }, [eventId, currentUserRole, tab, refreshKey]);

  const handleTaskAssigned = () => {
    setRefreshKey(k => k + 1);
  };

  // Chair-only: Fetch all tasks for this event
  const fetchAllTasks = async () => {
    setAllTasksLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks_temp')
        .select('*')
        .eq('event_id', eventId)
        .order('assigned_to', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAllTasks(data || []);
    } catch (err) {
      console.error('Error fetching all tasks:', err);
      setAllTasks([]);
    } finally {
      setAllTasksLoading(false);
    }
  };

  // Chair-only: Delete task entirely
  const handleDeleteTask = async (task) => {
    setTaskToDelete(task); // Open confirmation dialog
  };

  // Confirm delete action
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;
    
    const task = taskToDelete;
    setTaskToDelete(null); // Close dialog
    setDeletingTaskId(task.id);
    
    try {
      const success = await hardDeleteTask({ task });
      if (success) {
        // Refresh all tasks view
        setAllTasks(prev => prev.filter(t => t.id !== task.id));
        // Also refresh main task list
        setRefreshKey(k => k + 1);
      } else {
        alert('Failed to delete task. Please try again.');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Error deleting task: ' + err.message);
    } finally {
      setDeletingTaskId(null);
    }
  };

  // Toggle all tasks view
  const toggleAllTasksView = () => {
    if (!showAllTasksView) {
      fetchAllTasks();
    }
    setShowAllTasksView(!showAllTasksView);
  };

  // Group tasks by role
  const tasksByRole = allTasks.reduce((acc, task) => {
    const role = task.assigned_to || 'unassigned';
    if (!acc[role]) acc[role] = [];
    acc[role].push(task);
    return acc;
  }, {});

  // Use actual user role from AuthContext, not URL param
  const userRole = user?.role || 'Chair Person';
  const urlRoleParam = urlRole || user?.role?.replace(/\s+/g, '').toLowerCase() || 'chairperson';

  const navigateToTab = (tabName) => {
    navigate(`/event-tasks/${eventId}/${urlRoleParam}/${tabName}`);
  };

  if (!event) return <div className="p-4">Loading event...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={() => navigate('/events')}>Back to Events</Button>
        
        {/* Chair-only: Assign Task button */}
        {/* {user?.role === 'Chair Person' && (
          <Button onClick={() => setShowAssignModal(true)}>
            Assign Task
          </Button>
        )} */}
      </div>

      <h2 className="text-xl font-bold mb-2">{event.event_name}</h2>
      
      {/* Debug info */}
      <div className="bg-yellow-100 p-2 rounded mb-4 text-sm">
        <strong>Debug:</strong> User: "{user?.role}" → DB Role: "{currentUserRole}" | Event: {eventId}
      </div>

      {/* Chair-only: Assign Task Modal */}
      <AssignTaskModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onTaskAssigned={handleTaskAssigned}
      />

      <div className="mb-4 flex items-center gap-2">
        <button 
          className={`px-3 py-1 border rounded ${tab === 'mytasks' ? 'bg-blue-500 text-white' : ''}`} 
          onClick={() => navigateToTab('mytasks')}
        >
          My Tasks
        </button>
        <button 
          className={`px-3 py-1 border rounded ${tab === 'reviews' ? 'bg-blue-500 text-white' : ''}`} 
          onClick={() => navigateToTab('reviews')}
        >
          Reviews
        </button>
        <button 
          className={`px-3 py-1 border rounded ${tab === 'uploaded' ? 'bg-blue-500 text-white' : ''}`} 
          onClick={() => navigateToTab('uploaded')}
        >
          Uploaded
        </button>

        {/* Copy Tasks button - visible on all three tabs */}
        <button
          className="px-3 py-1 ml-auto border rounded bg-orange-600 text-white hover:bg-orange-700"
          onClick={() => setShowCopyModal(true)}
        >
          Copy Tasks
        </button>

        {/* Chair-only: Manage All Tasks button */}
        {userRole === 'Chair Person' && tab === 'mytasks' && (
          <button 
            className={`px-3 py-1 ml-4 border rounded ${showAllTasksView ? 'bg-red-500 text-white' : 'bg-gray-700 text-white'}`}
            onClick={toggleAllTasksView}
          >
            {showAllTasksView ? '✕ Close Manage View' : '⚙ Manage All Tasks'}
          </button>
        )}
      </div>

      {/* Chair-only: All Tasks Management View */}
      {userRole === 'Chair Person' && showAllTasksView && tab === 'mytasks' && (
        <div className="mb-6 p-4 border-2 border-red-300 rounded-lg bg-red-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-red-700">⚠ Task Management (Chair Only)</h3>
            <span className="text-sm text-gray-500">
              Total: {allTasks.length} tasks
            </span>
          </div>

          {allTasksLoading ? (
            <p className="text-gray-500">Loading all tasks...</p>
          ) : allTasks.length === 0 ? (
            <p className="text-gray-500">No tasks found for this event.</p>
          ) : (
            Object.entries(tasksByRole).map(([role, roleTasks]) => (
              <div key={role} className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2 pb-1 border-b">
                  {roleTasks[0]?.assigned_to_label || role} ({roleTasks.length})
                </h4>
                <div className="space-y-2">
                  {roleTasks.map(task => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-3 bg-white rounded border shadow-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.task_name && task.task_name !== task.title && (
                          <p className="text-sm text-gray-600">{task.task_name}</p>
                        )}
                        {task.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{task.description}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                          Status: <span className={`font-medium ${
                            task.status === 'uploaded' ? 'text-green-600' :
                            task.status === 'in_review' ? 'text-blue-600' :
                            task.status === 'rejected' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>{task.status}</span>
                          {task.upload_type && <span className="ml-2">| Type: {task.upload_type}</span>}
                          <span className="ml-2">| ID: {task.id.slice(0, 8)}...</span>
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTask(task)}
                        disabled={deletingTaskId === task.id}
                        className="ml-2"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {deletingTaskId === task.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Task list */}
      <div className="mb-4">
        {loading ? (
          <p className="text-gray-500">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500">No tasks in this section.</p>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              userRole={currentUserRole}
              onRefresh={fetchTasks}
              tab={tab}
            />
          ))
        )}
      </div>

      {/* Delete Task Confirmation Dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">⚠ Permanently Delete Task?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="font-medium text-foreground">"{taskToDelete?.title}"</p>
                <p>This will permanently delete:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>The task itself</li>
                  <li>All submissions</li>
                  <li>All comments</li>
                  <li>All uploaded files</li>
                </ul>
                <p className="text-red-500 font-semibold">This action cannot be undone!</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteTask}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy Tasks Modal */}
      <CopyTasksModal
        open={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        onTasksCopied={handleTaskAssigned}
      />
    </div>
  );
}

// Wrap with TaskTemplatesProvider
export default function EventTasks() {
  return (
    <TaskTemplatesProvider>
      <EventTasksContent />
    </TaskTemplatesProvider>
  );
}
