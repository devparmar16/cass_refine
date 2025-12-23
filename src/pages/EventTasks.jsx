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
import { Trash2, ArrowLeft, ClipboardList, CheckSquare, Upload, Copy, Settings, X } from 'lucide-react';
import { normalizeRole } from '@/lib/roleUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  
  // Chair-only: Manage all tasks view
  const [showAllTasksView, setShowAllTasksView] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [allTasks, setAllTasks] = useState([]);

  // Convert user role to database format using normalizeRole
  const currentUserRole = normalizeRole(user?.role) || 'chair_person';

  // Fetch event details
  useEffect(() => {
    if (!eventId) return;
    
    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, event_name, event_desc, event_date, status')
        .eq('id', eventId)
        .single();
      
      if (data) setEvent(data);
    };
    
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    setTab(section || 'mytasks');
  }, [section]);

  // Fetch tasks based on current tab
  useEffect(() => {
    if (!eventId || !currentUserRole) return;

    const fetchTasks = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('tasks_temp')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });

        let fetchedTasks = [];

        if (tab === 'mytasks') {
          // Tasks assigned to me with specific statuses
          const { data, error } = await query
            .eq('assigned_to', currentUserRole)
            .in('status', ['assigned', 'pending', 'rejected', 'in_progress']);
          
          if (error) throw error;
          fetchedTasks = data || [];

        } else if (tab === 'reviews') {
          // Tasks where I'm the current reviewer and status is in_review
          const { data, error } = await query
            .eq('current_reviewer_role', currentUserRole)
            .eq('status', 'in_review');
          
          if (error) throw error;
          fetchedTasks = data || [];

        } else if (tab === 'uploaded') {
          // Tasks I uploaded - check submissions
          const { data: submissions, error: subError } = await supabase
            .from('task_submissions')
            .select('task_id')
            .eq('submitted_by_role', currentUserRole);

          if (subError) throw subError;

          const taskIds = (submissions || []).map(s => s.task_id);

          // Get tasks that are either uploaded status OR have my submissions
          const { data: uploadedTasks, error: tasksError } = await supabase
            .from('tasks_temp')
            .select('*')
            .eq('event_id', eventId)
            .eq('assigned_to', currentUserRole);

          if (tasksError) throw tasksError;

          // Filter: status='uploaded' OR task_id in submission list
          fetchedTasks = (uploadedTasks || []).filter(t => 
            t.status === 'uploaded' || taskIds.includes(t.id)
          );
        }

        setTasks(fetchedTasks);
      } catch (err) {
        console.error('[EventTasks] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [eventId, tab, currentUserRole, refreshKey]);

  const handleTaskAssigned = () => {
    setRefreshKey(k => k + 1);
  };

  const onRefresh = () => {
    setRefreshKey(k => k + 1);
  };

  // Fetch all tasks for chair view
  useEffect(() => {
    if (!eventId || !showAllTasksView) return;

    const fetchAllTasks = async () => {
      const { data, error } = await supabase
        .from('tasks_temp')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (data) setAllTasks(data);
    };

    fetchAllTasks();
  }, [eventId, showAllTasksView, refreshKey]);

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

  // Toggle all tasks view - using context data
  const toggleAllTasksView = () => {
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

  if (!event) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500">Loading event...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/events')}
              className="flex items-center gap-2 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Events</span>
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{event.event_name}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Chair-only: Assign Task Modal */}
      <AssignTaskModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onTaskAssigned={handleTaskAssigned}
      />

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Buttons */}
          <div className="flex flex-1 gap-1 sm:gap-2">
            <button 
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                tab === 'mytasks' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`} 
              onClick={() => navigateToTab('mytasks')}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">My Tasks</span>
              <span className="sm:hidden">Tasks</span>
              {tab === 'mytasks' && tasks.length > 0 && (
                <Badge className="ml-1 bg-white/20 text-white text-xs">{tasks.length}</Badge>
              )}
            </button>
            <button 
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                tab === 'reviews' 
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-200' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`} 
              onClick={() => navigateToTab('reviews')}
            >
              <CheckSquare className="h-4 w-4" />
              <span>Reviews</span>
              {tab === 'reviews' && tasks.length > 0 && (
                <Badge className="ml-1 bg-white/20 text-white text-xs">{tasks.length}</Badge>
              )}
            </button>
            <button 
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                tab === 'uploaded' 
                  ? 'bg-green-600 text-white shadow-md shadow-green-200' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`} 
              onClick={() => navigateToTab('uploaded')}
            >
              <Upload className="h-4 w-4" />
              <span>Uploaded</span>
              {tab === 'uploaded' && tasks.length > 0 && (
                <Badge className="ml-1 bg-white/20 text-white text-xs">{tasks.length}</Badge>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
              onClick={() => setShowCopyModal(true)}
            >
              <Copy className="h-4 w-4" />
              <span className="hidden sm:inline">Copy Tasks</span>
            </Button>

            {/* Chair-only: Manage All Tasks button */}
            {userRole === 'Chair Person' && tab === 'mytasks' && (
              <Button 
                variant={showAllTasksView ? "destructive" : "secondary"}
                size="sm"
                className="flex items-center gap-2"
                onClick={toggleAllTasksView}
              >
                {showAllTasksView ? (
                  <>
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">Close</span>
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Manage All</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Chair-only: All Tasks Management View */}
      {userRole === 'Chair Person' && showAllTasksView && tab === 'mytasks' && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <Settings className="h-5 w-5" />
                Task Management (Chair Only)
              </CardTitle>
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                {allTasks.length} total tasks
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-pulse flex items-center gap-3">
                  <div className="h-5 w-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-500">Loading all tasks...</span>
                </div>
              </div>
            ) : allTasks.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardList className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No tasks found for this event.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(tasksByRole).map(([role, roleTasks]) => (
                  <div key={role} className="bg-white rounded-lg border border-red-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-red-100">
                      <h4 className="font-semibold text-gray-800 flex items-center justify-between">
                        <span>{roleTasks[0]?.assigned_to_label || role}</span>
                        <Badge variant="outline" className="text-gray-600">{roleTasks.length}</Badge>
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {roleTasks.map(task => (
                        <div 
                          key={task.id} 
                          className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{task.title}</p>
                            {task.task_name && task.task_name !== task.title && (
                              <p className="text-sm text-gray-600 truncate">{task.task_name}</p>
                            )}
                            {task.description && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-1">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${
                                  task.status === 'uploaded' ? 'border-green-200 text-green-700 bg-green-50' :
                                  task.status === 'in_review' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                                  task.status === 'rejected' ? 'border-red-200 text-red-700 bg-red-50' :
                                  task.status === 'approved' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                                  'border-gray-200 text-gray-600 bg-gray-50'
                                }`}
                              >
                                {task.status}
                              </Badge>
                              {task.upload_type && (
                                <span className="text-xs text-gray-400">Type: {task.upload_type}</span>
                              )}
                              <span className="text-xs text-gray-400 font-mono">ID: {task.id.slice(0, 8)}</span>
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteTask(task)}
                            disabled={deletingTaskId === task.id}
                            className="ml-4 shrink-0"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {deletingTaskId === task.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Task list */}
      <Card className="border-gray-100">
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-pulse flex flex-col items-center gap-3">
                <div className="h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-500">Loading tasks...</span>
              </div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 ${
                tab === 'mytasks' ? 'bg-blue-50' : 
                tab === 'reviews' ? 'bg-purple-50' : 'bg-green-50'
              }`}>
                {tab === 'mytasks' ? <ClipboardList className="h-8 w-8 text-blue-400" /> :
                 tab === 'reviews' ? <CheckSquare className="h-8 w-8 text-purple-400" /> :
                 <Upload className="h-8 w-8 text-green-400" />}
              </div>
              <p className="text-gray-500 font-medium">No tasks in this section</p>
              <p className="text-gray-400 text-sm mt-1">
                {tab === 'mytasks' ? 'Tasks assigned to you will appear here' :
                 tab === 'reviews' ? 'Tasks pending your review will appear here' :
                 'Tasks you\'ve uploaded will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  userRole={currentUserRole}
                  onRefresh={onRefresh}
                  tab={tab}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
