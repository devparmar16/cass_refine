import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Add fade-in animation CSS (same as task sections)
const fadeInStyle = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
`;
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  TrendingUp,
  FileText,
  Star,
  Loader2,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AllEventsList from '@/components/AllEventsList';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Inject the fade-in animation CSS
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = fadeInStyle;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [stats, setStats] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [eventTaskCounts, setEventTaskCounts] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Memoized normalized role
  const normalizedRole = useMemo(() => 
    user?.role?.toLowerCase().replace(/\s+/g, '_'), 
    [user?.role]
  );

  // Memoized today string
  const todayStr = useMemo(() => 
    new Date().toISOString().slice(0, 10), 
    []
  );

  // Optimized data fetching with better error handling
  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    
    try {
    setLoading(true);
      
      if (normalizedRole === 'chair_person') {
        await fetchChairPersonData();
      } else if (normalizedRole === 'vice_chair_person' || normalizedRole === 'Vice Chairperson') {
        await fetchViceChairPersonData();
      } else {
        // Handle other roles
        await fetchOtherRolesData();
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, normalizedRole]);

  const fetchChairPersonData = useCallback(async () => {
    try {
      // Parallel data fetching for better performance
      const [eventsResult, myEventsResult, myTasksResult, pendingResult, approvedResult, teamResult, allEventsResult] = await Promise.all([
        supabase.from('events').select('id, event_name, event_date'),
        supabase.from('events').select('id, event_name, created_at, event_date').eq('created_by', user.username),
        supabase.from('chair_main').select('id, event_name, task_name, uploaded_at, status').eq('created_by', user.username),
        supabase.from('chair_main').select('id').eq('status', 'pending').eq('created_by', user.username),
        supabase.from('chair_main').select('id').eq('status', 'approved').eq('created_by', user.username),
        supabase.from('events').select('created_by', { count: 'exact', head: true }),
        supabase.from('events').select('id, event_name, event_date').order('event_date', { ascending: true })
      ]);

      const events = eventsResult.data || [];
      const myEvents = myEventsResult.data || [];
      const myTasks = myTasksResult.data || [];
      const pendingApprovals = pendingResult.data || [];
      const approvedTasks = approvedResult.data || [];
      const teamMembers = teamResult.data || [];
      const allEventsData = allEventsResult.data || [];

      // Set all events
      setAllEvents(allEventsData);

      // Calculate task counts for each event
      const taskCounts = {};
      allEventsData.forEach(event => {
        const eventTasks = myTasks.filter(task => task.event_name === event.event_name);
        const myTasksCount = eventTasks.length;
        const pendingCount = eventTasks.filter(task => task.status === 'pending').length;
        const uploadedByMeCount = eventTasks.filter(task => task.status !== 'rejected').length;
        
        taskCounts[event.id] = {
          myTasks: myTasksCount,
          pendingReviews: pendingCount,
          uploadedByMe: uploadedByMeCount
        };
      });
      setEventTaskCounts(taskCounts);

      // Process upcoming events
      const processedUpcomingEvents = events
            .filter((e) => e.event_date && e.event_date >= todayStr)
            .sort((a, b) => a.event_date.localeCompare(b.event_date))
            .map((e) => {
              const diffDays = Math.ceil((new Date(e.event_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
              let soonLabel = '';
              if (diffDays === 0) soonLabel = 'Today';
              else if (diffDays === 1) soonLabel = 'Tomorrow';
              else soonLabel = `In ${diffDays} days`;
              return {
                id: e.id,
                event_name: e.event_name,
                start_date: new Date(e.event_date).toLocaleDateString(),
                soonLabel,
              };
        });

      setUpcomingEvents(processedUpcomingEvents);

      // Process recent activities
      const eventActivities = myEvents.map(e => ({
          id: `event-${e.id}`,
          action: `Created event: ${e.event_name}`,
          time: new Date(e.created_at || e.event_date).toLocaleString(),
          type: 'info',
        }));

      const taskActivities = myTasks.map(t => ({
          id: `task-${t.id}`,
          action: `Uploaded: ${t.task_name} for ${t.event_name}`,
          time: new Date(t.uploaded_at).toLocaleString(),
          type: t.status === 'approved' ? 'success' : 'info',
        }));

        const allActivities = [...eventActivities, ...taskActivities]
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 5);

        setRecentActivities(allActivities);

      // Set stats
        setStats([
          {
            title: 'Events Created',
          value: events.length,
            icon: Calendar,
            color: 'text-blue-600',
            clickHandler: () => navigate('/events'),
          },
          {
            title: 'Pending Reviews',
          value: pendingApprovals.length,
            icon: Clock,
            color: 'text-orange-600',
            clickHandler: () => navigate('/events'),
          },
          {
            title: 'Approved Tasks',
          value: approvedTasks.length,
            icon: CheckCircle,
            color: 'text-green-600',
            clickHandler: () => navigate('/events'),
          },
          {
            title: 'Team Members',
          value: teamMembers.length || 1,
            icon: Users,
            color: 'text-purple-600',
            clickHandler: () => navigate('/events'),
          },
        ]);
    } catch (error) {
      console.error('Error fetching chair person data:', error);
    }
  }, [user?.username, todayStr, navigate]);

  const fetchViceChairPersonData = useCallback(async () => {
    try {
      // Fetch tasks and events in parallel
      const [assignedTasksResult, eventsResult, allEventsResult] = await Promise.all([
        supabase.from('vice_chair_main').select('id, event_name, event_id, status, uploaded_at').eq('created_by', user.username),
        supabase.from('events').select('id, event_name, event_date'),
        supabase.from('events').select('id, event_name, event_date').order('event_date', { ascending: true })
      ]);

      const assignedTasks = assignedTasksResult.data || [];
      const allEvents = eventsResult.data || [];
      const allEventsData = allEventsResult.data || [];

      // Set all events
      setAllEvents(allEventsData);

      // Calculate task counts for each event
      const taskCounts = {};
      allEventsData.forEach(event => {
        const eventTasks = assignedTasks.filter(task => task.event_name === event.event_name);
        const myTasksCount = eventTasks.length;
        const pendingCount = eventTasks.filter(task => task.status === 'pending').length;
        const uploadedByMeCount = eventTasks.filter(task => task.status !== 'rejected').length;
        
        taskCounts[event.id] = {
          myTasks: myTasksCount,
          pendingReviews: pendingCount,
          uploadedByMe: uploadedByMeCount
        };
      });
      setEventTaskCounts(taskCounts);

      // Get unique event IDs from tasks
      const eventIds = [...new Set(assignedTasks.map(t => t.event_id))];
      const relevantEvents = allEvents.filter(e => eventIds.includes(e.id));

      // Process upcoming events
      const processedUpcomingEvents = relevantEvents
            .filter((e) => e.event_date && e.event_date >= todayStr)
            .sort((a, b) => a.event_date.localeCompare(b.event_date))
            .map((e) => {
              const diffDays = Math.ceil((new Date(e.event_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
              let soonLabel = '';
              if (diffDays === 0) soonLabel = 'Today';
              else if (diffDays === 1) soonLabel = 'Tomorrow';
              else soonLabel = `In ${diffDays} days`;
              return {
                id: e.id,
                event_name: e.event_name,
                start_date: new Date(e.event_date).toLocaleDateString(),
                soonLabel,
              };
        });

      setUpcomingEvents(processedUpcomingEvents);

      // Process activities
      const taskActivities = assignedTasks.map(t => ({
        id: `task-${t.id}`,
        action: `Task: ${t.event_name}`,
        time: new Date(t.uploaded_at).toLocaleString(),
        type: t.status === 'approved' ? 'success' : 'info',
      }));

      const allActivities = taskActivities
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 5);

      setRecentActivities(allActivities);

      // Set stats
        setStats([
          {
            title: 'Assigned Tasks',
          value: assignedTasks.length,
            icon: FileText,
            color: 'text-blue-600',
            clickHandler: () => navigate('/events'),
          },
          {
          title: 'Pending Tasks',
          value: assignedTasks.filter(t => t.status === 'pending').length,
            icon: Clock,
            color: 'text-orange-600',
            clickHandler: () => navigate('/events'),
          },
          {
          title: 'Completed Tasks',
          value: assignedTasks.filter(t => t.status === 'approved').length,
            icon: CheckCircle,
            color: 'text-green-600',
            clickHandler: () => navigate('/events'),
          },
          {
          title: 'Events Involved',
          value: eventIds.length,
            icon: Calendar,
            color: 'text-purple-600',
            clickHandler: () => navigate('/events'),
          },
        ]);
    } catch (error) {
      console.error('Error fetching vice chair person data:', error);
    }
  }, [user?.username, todayStr, navigate]);

  const fetchOtherRolesData = useCallback(async () => {
    try {
      // Map normalizedRole to the correct table name
      const roleTableMap = {
        'treasurer': 'treasurer_main',
        'secretary': 'secretary_main',
        'social_media_manager': 'social_media_main',
        'technical_coordinator': 'technical_coordinator_main',
        'promotion_team': 'promotion_team_main',
        'registration_desk_team': 'registration_desk_team_main',
      };
      const table = roleTableMap[normalizedRole];
      if (!table) {
        setAllEvents([]);
        setEventTaskCounts({});
        setStats([{ title: 'Welcome', value: '👋', icon: Star, color: 'text-blue-600', clickHandler: () => navigate('/events') }]);
        setRecentActivities([]);
        setUpcomingEvents([]);
        return;
      }
      // Fetch all events and tasks for the current role
      const [allEventsResult, roleTasksResult] = await Promise.all([
        supabase.from('events').select('id, event_name, event_date').order('event_date', { ascending: true }),
        supabase.from(table).select('id, event_name, task_name, uploaded_at, status').eq('created_by', user.username)
      ]);
      const allEventsData = allEventsResult.data || [];
      const roleTasks = roleTasksResult.data || [];
      setAllEvents(allEventsData);
      // Calculate task counts for each event
      const taskCounts = {};
      allEventsData.forEach(event => {
        const eventTasks = roleTasks.filter(task => task.event_name === event.event_name);
        const myTasksCount = eventTasks.length;
        const pendingCount = eventTasks.filter(task => task.status === 'pending').length;
        const uploadedByMeCount = eventTasks.filter(task => task.status !== 'rejected').length;
        taskCounts[event.id] = {
          myTasks: myTasksCount,
          pendingReviews: pendingCount,
          uploadedByMe: uploadedByMeCount
        };
      });
      setEventTaskCounts(taskCounts);
      setStats([
        {
          title: 'Assigned Tasks',
          value: roleTasks.length,
          icon: FileText,
          color: 'text-blue-600',
          clickHandler: () => navigate('/events'),
        },
        {
          title: 'Pending Tasks',
          value: roleTasks.filter(t => t.status === 'pending').length,
          icon: Clock,
          color: 'text-orange-600',
          clickHandler: () => navigate('/events'),
        },
        {
          title: 'Completed Tasks',
          value: roleTasks.filter(t => t.status === 'approved').length,
          icon: CheckCircle,
          color: 'text-green-600',
          clickHandler: () => navigate('/events'),
        },
        {
          title: 'Events Involved',
          value: allEventsData.length,
          icon: Calendar,
          color: 'text-purple-600',
          clickHandler: () => navigate('/events'),
        },
      ]);
      // Recent activities
      const taskActivities = roleTasks.map(t => ({
        id: `task-${t.id}`,
        action: `Task: ${t.event_name}`,
        time: new Date(t.uploaded_at).toLocaleString(),
        type: t.status === 'approved' ? 'success' : 'info',
      }));
      const allActivities = taskActivities.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
      setRecentActivities(allActivities);
      // Upcoming events
      const todayStr = new Date().toISOString().slice(0, 10);
      const processedUpcomingEvents = allEventsData
        .filter((e) => e.event_date && e.event_date >= todayStr)
        .sort((a, b) => a.event_date.localeCompare(b.event_date))
        .map((e) => {
          const diffDays = Math.ceil((new Date(e.event_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
          let soonLabel = '';
          if (diffDays === 0) soonLabel = 'Today';
          else if (diffDays === 1) soonLabel = 'Tomorrow';
          else soonLabel = `In ${diffDays} days`;
          return {
            id: e.id,
            event_name: e.event_name,
            start_date: new Date(e.event_date).toLocaleDateString(),
            soonLabel,
          };
        });
      setUpcomingEvents(processedUpcomingEvents);
    } catch (error) {
      console.error('Error fetching other roles data:', error);
    }
  }, [navigate, user?.username, normalizedRole]);

  // Helper function to navigate to specific event tasks
  const navigateToEventTasks = useCallback((eventId, section) => {
    navigate(`/event-tasks/${eventId}/${normalizedRole}/${section}`);
  }, [navigate, normalizedRole]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  console.log('RENDER: upcomingEvents', upcomingEvents);

  // Loading skeleton component (same style as Events page)
  const LoadingSkeleton = () => (
    <div className="px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Welcome section skeleton */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 sm:p-6 animate-pulse">
        <div className="h-8 bg-blue-500 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-blue-500 rounded w-1/2"></div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activities skeleton */}
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upcoming Events skeleton */}
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-col flex-1">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions skeleton */}
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 sm:h-20 bg-gray-200 rounded flex items-center justify-center">
                <div className="flex flex-col items-center gap-1 sm:gap-2">
                  <div className="h-4 w-4 sm:h-6 sm:w-6 bg-gray-300 rounded"></div>
                  <div className="h-3 bg-gray-300 rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div>
        <LoadingSkeleton />
      </div>
    );
  }
  return (
    <div className="px-2 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 sm:p-6 text-white">
        <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {user?.disp_name}!</h1>
        <p className="text-blue-100 mt-2 text-sm sm:text-base">
          Here's what's happening with your club activities today.
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={stat.clickHandler}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-2 sm:p-3 rounded-full bg-gray-100 ${stat.color}`}>
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All Events List - Role Specific */}
      {normalizedRole === 'treasurer' && (
        <AllEventsList 
          roleType="treasurer"
          roleTable="treasurer_main"
          userRole="Treasurer"
          onNavigateToEventTasks={(eventId, section) => navigate(`/event-tasks/${eventId}/treasurer/${section}`)}
        />
      )}
      
      {normalizedRole === 'chair_person' && (
        <AllEventsList 
          roleType="chair"
          roleTable="chair_main"
          userRole="Chair Person"
          onNavigateToEventTasks={(eventId, section) => navigate(`/event-tasks/${eventId}/chairperson/${section}`)}
        />
      )}
      
      {normalizedRole === 'vice_chair_person' && (
        <AllEventsList 
          roleType="vice_chair"
          roleTable="vice_chair_main"
          userRole="Vice Chairperson"
          onNavigateToEventTasks={(eventId, section) => navigate(`/event-tasks/${eventId}/vicechair/${section}`)}
        />
      )}
      
      {normalizedRole === 'secretary' && (
        <AllEventsList 
          roleType="secretary"
          roleTable="secretary_main"
          userRole="Secretary"
          onNavigateToEventTasks={(eventId, section) => navigate(`/event-tasks/${eventId}/secretary/${section}`)}
        />
      )}
      
      {normalizedRole === 'social_media_manager' && (
        <AllEventsList 
          roleType="socialmediapromotionsmanager"
          roleTable="social_main"
          userRole="Social Media Manager"
          onNavigateToEventTasks={(eventId, section) => navigate(`/event-tasks/${eventId}/socialmediamanager/${section}`)}
        />
      )}
      
      {normalizedRole === 'technical_coordinator' && (
        <AllEventsList 
          roleType="technical_coordinator"
          roleTable="technical_coordinator_main"
          userRole="Technical Coordinator"
          onNavigateToEventTasks={(eventId, section) => navigate(`/event-tasks/${eventId}/technicalcoordinator/${section}`)}
        />
      )}

      {normalizedRole === 'promotion_team' && (
        <AllEventsList 
          roleType="promotion_team"
          roleTable="promotion_team_main"
          userRole="Promotion Team"
          onNavigateToEventTasks={(eventId, section) => navigate(`/event-tasks/${eventId}/promotionteam/${section}`)}
        />
      )}
      
      {normalizedRole === 'registration_desk_team' && (
        <AllEventsList 
          roleType="registration_desk_team"
          roleTable="registration_desk_team_main"
          userRole="Registration Desk Team"
          onNavigateToEventTasks={(eventId, section) => navigate(`/event-tasks/${eventId}/registrationdeskteam/${section}`)}
        />
      )}

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Upcoming Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {upcomingEvents.length === 0 && (
              <div className="text-gray-500 text-sm sm:text-base">No upcoming events.</div>
            )}
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-medium text-sm sm:text-base truncate">{event.event_name}</span>
                  <span className="text-xs text-gray-500">Starts: {event.start_date}</span>
                </div>
                <Badge variant={event.soonLabel === 'Today' ? 'destructive' : 'outline'} className="ml-2 flex-shrink-0 text-xs">
                  {event.soonLabel}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {normalizedRole === 'chair_person' && (
              <Button 
                className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm"
                onClick={() => navigate('/events')}
              >
                <Calendar className="h-4 w-4 sm:h-6 sm:w-6" />
                Create Event
              </Button>
            )}
            <Button 
              variant="outline" 
              className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm"
              onClick={() => navigate('/events')}
            >
              <FileText className="h-4 w-4 sm:h-6 sm:w-6" />
              View Events
            </Button>
            <Button 
              variant="outline" 
              className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm"
              onClick={() => navigate('/events')}
            >
              <Users className="h-4 w-4 sm:h-6 sm:w-6" />
              Event Tasks
            </Button>
            <Button 
              variant="outline" 
              className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm"
              onClick={() => navigate('/events')}
            >
              <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6" />
              Event Overview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
