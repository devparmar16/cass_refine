import React, { useMemo, useState } from 'react';
import { useTasks } from '@/contexts/TasksContext';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, FileText, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const DashboardStats = ({ role }) => {
  const { tasks, loading, getEventName } = useTasks();
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [myTasksExpanded, setMyTasksExpanded] = useState(true);
  const [byMeTasksExpanded, setByMeTasksExpanded] = useState(true);

  // Compute stats based on role
  const stats = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return {
        totalEvents: 0,
        approvedCount: 0,
        rejectedCount: 0,
        inReviewCount: 0,
      };
    }

    // Filter tasks based on role
    let roleTasks = tasks;
    if (role !== 'Chair Person') {
      roleTasks = tasks.filter(task => {
        // Task is assigned to this role
        if (task.assigned_to === role) return true;
        
        // Task is in review flow for this role
        if (task.review_flow && task.review_flow.includes(role)) return true;
        
        return false;
      });
    }

    // Compute counts
    const totalEvents = new Set(roleTasks.map(t => t.event_id)).size;
    
    const approvedCount = roleTasks.filter(t => 
      t.status === 'approved' || t.status === 'completed'
    ).length;
    
    const rejectedCount = roleTasks.filter(t => 
      t.status === 'rejected'
    ).length;
    
    const inReviewCount = roleTasks.filter(t => 
      t.status === 'in_review' || t.status === 'pending'
    ).length;

    return {
      totalEvents,
      approvedCount,
      rejectedCount,
      inReviewCount,
      roleTasks, // Add filtered tasks to return
    };
  }, [tasks, role]);

  // Stat card data - moved before loading check
  const statCards = useMemo(() => [
    {
      title: 'Total Events',
      value: stats.totalEvents,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      filterType: null, // No filter for events
    },
    {
      title: 'Approved Tasks',
      value: stats.approvedCount,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      filterType: 'approved',
    },
    {
      title: 'Rejected Tasks',
      value: stats.rejectedCount,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      filterType: 'rejected',
    },
    {
      title: 'In Review Tasks',
      value: stats.inReviewCount,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      filterType: 'in_review',
    },
  ], [stats]);

  // Get filtered tasks based on selection - split into "My" and "By Me"
  const filteredTasksSections = useMemo(() => {
    if (!selectedFilter || !stats.roleTasks) return { myTasks: [], byMeTasks: [] };
    
    let allFilteredTasks = [];
    
    if (selectedFilter === 'approved') {
      allFilteredTasks = stats.roleTasks.filter(t => t.status === 'approved' || t.status === 'completed');
    } else if (selectedFilter === 'rejected') {
      allFilteredTasks = stats.roleTasks.filter(t => t.status === 'rejected');
    } else if (selectedFilter === 'in_review') {
      allFilteredTasks = stats.roleTasks.filter(t => t.status === 'in_review' || t.status === 'pending');
    }

    console.log('[DashboardStats] Filter:', selectedFilter, 'Role:', role);
    console.log('[DashboardStats] All filtered tasks:', allFilteredTasks.length, allFilteredTasks);
    allFilteredTasks.forEach(t => {
      console.log('[DashboardStats] Task:', t.task_name, '| assigned_to:', t.assigned_to, '| current_reviewer:', t.current_reviewer_role, '| review_flow:', t.review_flow, '| last_reviewed_by:', t.last_reviewed_by_role);
    });

    // Split into "My Tasks" (assigned to me) and "Reviewed By Me"
    const myTasks = [];
    const byMeTasks = [];
    
    allFilteredTasks.forEach(t => {
      // Determine if this is "my task" or "reviewed by me"
      const isAssignedToMe = t.assigned_to === role;
      
      // Check if I was involved in reviewing this task
      const iReviewedIt = 
        t.current_reviewer_role === role || 
        t.last_reviewed_by_role === role || 
        (t.review_flow && Array.isArray(t.review_flow) && t.review_flow.includes(role));
      
      // For Chair Person, show ALL tasks in appropriate sections
      if (role === 'Chair Person') {
        // If assigned to Chair Person, it's "my task"
        if (isAssignedToMe) {
          myTasks.push(t);
        } else {
          // Otherwise, it's "reviewed by me" (Chair can see all)
          byMeTasks.push(t);
        }
      } else {
        // For other roles, be more specific
        if (isAssignedToMe) {
          // Task assigned to me
          myTasks.push(t);
        } else if (iReviewedIt) {
          // Task I reviewed but not assigned to me
          byMeTasks.push(t);
        }
      }
    });

    console.log('[DashboardStats] My tasks:', myTasks.length, myTasks);
    console.log('[DashboardStats] By me tasks:', byMeTasks.length, byMeTasks);

    return { myTasks, byMeTasks };
  }, [selectedFilter, stats.roleTasks, role]);

  const handleCardClick = (filterType) => {
    if (filterType) {
      setSelectedFilter(filterType);
      setIsDialogOpen(true);
    }
  };

  // Loading skeleton - after all hooks
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-300 rounded w-16"></div>
                </div>
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Render stat cards
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className={`hover:shadow-lg transition-shadow duration-200 ${stat.filterType ? 'cursor-pointer' : ''}`}
              onClick={() => handleCardClick(stat.filterType)}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.bgColor} p-2 sm:p-3 rounded-full`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tasks Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedFilter === 'approved' && 'Approved Tasks'}
              {selectedFilter === 'rejected' && 'Rejected Tasks'}
              {selectedFilter === 'in_review' && 'In Review Tasks'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {filteredTasksSections.myTasks.length === 0 && filteredTasksSections.byMeTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tasks found
              </div>
            ) : (
              <div className="space-y-6">
                {/* My Tasks Section */}
                {filteredTasksSections.myTasks.length > 0 && (
                  <div>
                    <div 
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-md mb-3"
                      onClick={() => setMyTasksExpanded(!myTasksExpanded)}
                    >
                      <h3 className="text-sm font-semibold text-gray-700">
                        My {selectedFilter === 'approved' ? 'Approved' : selectedFilter === 'rejected' ? 'Rejected' : 'In Review'} Tasks
                        <span className="ml-2 text-xs text-gray-500">({filteredTasksSections.myTasks.length})</span>
                      </h3>
                      {myTasksExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                    {myTasksExpanded && (
                    <div className="space-y-3">
                      {filteredTasksSections.myTasks.map((task) => (
                        <Card key={task.id} className="p-4 bg-blue-50/30">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{task.task_name}</h4>
                              {task.desc && (
                                <p className="text-sm text-gray-600 mt-1">{task.desc}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline" className="text-xs bg-white">
                                  📅 {getEventName(task.event_id)}
                                </Badge>
                                {task.assigned_to && (
                                  <Badge variant="outline" className="text-xs bg-white">
                                    Assigned to: {task.assigned_to}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={
                                task.status === 'approved' || task.status === 'completed'
                                  ? 'default'
                                  : task.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {task.status}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                    )}
                  </div>
                )}

                {/* Reviewed By Me Section */}
                {filteredTasksSections.byMeTasks.length > 0 && (
                  <div>
                    <div 
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-md mb-3"
                      onClick={() => setByMeTasksExpanded(!byMeTasksExpanded)}
                    >
                      <h3 className="text-sm font-semibold text-gray-700">
                        {selectedFilter === 'approved' ? 'Approved' : selectedFilter === 'rejected' ? 'Rejected' : 'Reviewed'} By Me
                        <span className="ml-2 text-xs text-gray-500">({filteredTasksSections.byMeTasks.length})</span>
                      </h3>
                      {byMeTasksExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      )}
                    </div>
                    {byMeTasksExpanded && (
                    <div className="space-y-3">
                      {filteredTasksSections.byMeTasks.map((task) => (
                        <Card key={task.id} className="p-4 bg-green-50/30">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{task.task_name}</h4>
                              {task.desc && (
                                <p className="text-sm text-gray-600 mt-1">{task.desc}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline" className="text-xs bg-white">
                                  📅 {getEventName(task.event_id)}
                                </Badge>
                                {task.assigned_to && (
                                  <Badge variant="outline" className="text-xs bg-white">
                                    Assigned to: {task.assigned_to}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant={
                                task.status === 'approved' || task.status === 'completed'
                                  ? 'default'
                                  : task.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {task.status}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DashboardStats;
