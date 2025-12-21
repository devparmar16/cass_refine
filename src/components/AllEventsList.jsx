import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight, ArrowRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const AllEventsList = ({ 
  roleType, 
  roleTable, 
  userRole, 
  onNavigateToEventTasks 
}) => {
  const [allEvents, setAllEvents] = useState([]);
  const [eventTaskCounts, setEventTaskCounts] = useState({});
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch all events and task counts for dashboard
  const fetchAllEventsAndTaskCounts = useCallback(async () => {
    try {
      // Fetch all events, role-specific tasks, and all tasks
      const [allEventsResult, roleTasksResult, allTasksResult] = await Promise.all([
        supabase.from('events').select('id, event_name, event_date').order('event_date', { ascending: true }),
        supabase.from(roleTable).select('id, event_name, task_name, uploaded_at, status, current_reviewer, review_status'),
        supabase.from('tasks').select('*')
      ]);

      const allEventsData = allEventsResult.data || [];
      const roleTasks = roleTasksResult.data || [];
      const allTasks = allTasksResult.data || [];
      setAllEvents(allEventsData);

      // Calculate task counts and status for each event
      const taskCounts = {};
      allEventsData.forEach(event => {
        // Get only tasks for this role from all tasks
        const roleTasksFromAll = allTasks.filter(task => task.roles === userRole);
        
        // Get uploaded tasks for this event
        const uploadedTasks = roleTasks.filter(task => task.event_name === event.event_name);
        
        // Build task summaries for this event
        const taskSummaries = roleTasksFromAll.map(task => {
          const uploaded = uploadedTasks.find(
            t => t.task_name === task.task_name && t.event_name === event.event_name
          );
          
          if (uploaded) {
            return { 
              name: task.task_name, 
              status: uploaded.status,
              task: task,
              uploadedData: uploaded,
              isUploaded: true
            };
          } else {
            return { 
              name: task.task_name, 
              status: "Not uploaded",
              task: task,
              uploadedData: null,
              isUploaded: false
            };
          }
        });
        
        // Calculate counts
        const totalTasks = taskSummaries.length;
        const notUploadedCount = taskSummaries.filter(ts => ts.status === "Not uploaded").length;
        const pendingCount = taskSummaries.filter(ts => ts.status === "pending").length;
        const approvedCount = taskSummaries.filter(ts => ts.status === "approved").length;
        const rejectedCount = taskSummaries.filter(ts => ts.status === "rejected").length;
        
        taskCounts[event.id] = {
          totalTasks,
          notUploadedTasks: notUploadedCount,
          pendingReviews: pendingCount,
          approvedTasks: approvedCount,
          rejectedTasks: rejectedCount,
          taskSummaries: taskSummaries
        };
      });
      setEventTaskCounts(taskCounts);
    } catch (error) {
      console.error('Error fetching all events and task counts:', error);
    }
  }, [roleTable, userRole]);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllEventsAndTaskCounts();
  }, [fetchAllEventsAndTaskCounts]);

  const handleNavigateToEventTasks = (eventId, section) => {
    if (onNavigateToEventTasks) {
      onNavigateToEventTasks(eventId, section);
    } else {
      // Default navigation (respect computed section)
      navigate(`/event-tasks/${eventId}/${roleType}/${section}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">All Events</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {allEvents.length === 0 && (
            <div className="text-gray-500 text-sm sm:text-base">No events found.</div>
          )}
          {allEvents.map((event) => {
            const taskCounts = eventTaskCounts[event.id] || { 
              myTasks: 0, 
              pendingReviews: 0, 
              uploadedByMe: 0,
              taskSummaries: []
            };

            return (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium text-sm sm:text-base truncate">{event.event_name}</span>
                    <span className="text-xs text-gray-500">
                      {event.event_date ? new Date(event.event_date).toLocaleDateString() : 'No date set'}
                    </span>
                  </div>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="end">
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Task Summary for {event.event_name}</h4>

                      {taskCounts.taskSummaries && taskCounts.taskSummaries.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {taskCounts.taskSummaries.map((taskSummary, index) => {
                            let statusColor = "text-gray-600";
                            let bgColor = "bg-gray-50";

                            if (taskSummary.status === "pending") {
                              statusColor = "text-orange-600";
                              bgColor = "bg-orange-50";
                            } else if (taskSummary.status === "approved") {
                              statusColor = "text-green-600";
                              bgColor = "bg-green-50";
                            } else if (taskSummary.status === "rejected") {
                              statusColor = "text-red-600";
                              bgColor = "bg-red-50";
                            }

                            return (
                              <div
                              key={index}
                              className={`flex items-center justify-between p-2 ${bgColor} rounded cursor-pointer hover:opacity-80 transition-colors`}
                              onClick={() => {
                                const status = (taskSummary.status || '').toLowerCase();
                                const section = (status === 'approved' || status === 'pending') ? 'uploaded' : 'mytasks';
                                handleNavigateToEventTasks(event.id, section);
                              }}
                            >
                                <div className="flex-1">
                                  <div className="text-sm font-medium truncate">{taskSummary.name}</div>
                                  <div className={`text-xs ${statusColor}`}>
                                    {taskSummary.status === "Not uploaded" ? "Not uploaded yet" :
                                     taskSummary.status === "pending" ? "Pending review" :
                                     taskSummary.status === "approved" ? "Approved" :
                                     taskSummary.status === "rejected" ? "Rejected" : taskSummary.status}
                                  </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 p-2">
                          No tasks assigned for this event
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AllEventsList; 