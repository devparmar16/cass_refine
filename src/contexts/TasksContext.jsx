import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeRole } from '@/lib/roleUtils';

const TasksContext = createContext();

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within TasksProvider');
  }
  return context;
};

const TASKS_CACHE_KEY = 'tasks_cache';
const EVENTS_CACHE_KEY = 'events_cache';
const TASKS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const EVENTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for events

/**
 * TasksProvider - Central source of truth for all task data
 * 
 * FEATURES:
 * - Single DB fetch per login (with cache validation)
 * - localStorage persistence
 * - Individual task updates (no refetch)
 * - Derived state for dashboards
 * - Real-time subscriptions
 * 
 * CACHE VALIDATION:
 * Fetches from DB only if:
 * 1. No cache exists
 * 2. Cached userId ≠ current user
 * 3. Cached role ≠ current role
 * 4. Cache is older than TTL (2 minutes)
 */
export const TasksProvider = ({ children }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);
  const [eventsLastFetchedAt, setEventsLastFetchedAt] = useState(null);

  const userRole = normalizeRole(user?.role);

  // Load from cache
  const loadFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(TASKS_CACHE_KEY);
      if (!cached) return null;

      const data = JSON.parse(cached);
      
      // Validate cache
      if (
        data.userId !== user?.id ||
        data.role !== userRole ||
        Date.now() - data.lastFetchedAt > TASKS_CACHE_TTL
      ) {
        console.log('[TasksContext] Cache invalid or expired');
        return null;
      }

      console.log('[TasksContext] Loading from cache');
      return data;
    } catch (err) {
      console.error('[TasksContext] Cache read error:', err);
      return null;
    }
  }, [user?.id, userRole]);

  // Save to cache
  const saveToCache = useCallback((tasksData) => {
    try {
      const cacheData = {
        userId: user?.id,
        role: userRole,
        lastFetchedAt: Date.now(),
        tasks: tasksData,
      };
      localStorage.setItem(TASKS_CACHE_KEY, JSON.stringify(cacheData));
      console.log('[TasksContext] Saved to cache');
    } catch (err) {
      console.error('[TasksContext] Cache write error:', err);
    }
  }, [user?.id, userRole]);

  // Load events from cache
  const loadEventsFromCache = useCallback(() => {
    try {
      const cached = localStorage.getItem(EVENTS_CACHE_KEY);
      if (!cached) return null;

      const data = JSON.parse(cached);
      
      // Validate cache (events don't need role validation)
      if (
        Date.now() - data.lastFetchedAt > EVENTS_CACHE_TTL
      ) {
        console.log('[TasksContext] Events cache expired');
        return null;
      }

      console.log('[TasksContext] Loading events from cache');
      return data;
    } catch (err) {
      console.error('[TasksContext] Events cache read error:', err);
      return null;
    }
  }, []);

  // Save events to cache
  const saveEventsToCache = useCallback((eventsData) => {
    try {
      const cacheData = {
        lastFetchedAt: Date.now(),
        events: eventsData,
      };
      localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(cacheData));
      console.log('[TasksContext] Saved events to cache');
    } catch (err) {
      console.error('[TasksContext] Events cache write error:', err);
    }
  }, []);

  // Fetch tasks from DB
  const fetchTasksFromDB = useCallback(async () => {
    if (!user || !userRole) return;

    console.log('[TasksContext] Fetching from DB...');
    setLoading(true);

    try {
      // Fetch ALL tasks the user has access to
      // This includes: assigned_to, current_reviewer_role, and submissions
      const { data: allTasks, error } = await supabase
        .from('tasks_temp')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Also fetch submission IDs for tracking uploaded tasks (skip for Chair Person to avoid query errors)
      let submissions = [];
      if (userRole && userRole.toLowerCase() !== 'chair_person') {
        const { data: submissionsData } = await supabase
          .from('task_submissions')
          .select('task_id, submitted_by_role, status, created_at')
          .eq('submitted_by_role', userRole);
        submissions = submissionsData || [];
      }

      // Enrich tasks with submission info
      const enrichedTasks = (allTasks || []).map(task => {
        const taskSubmissions = (submissions || []).filter(s => s.task_id === task.id);
        return {
          ...task,
          user_submissions: taskSubmissions,
          has_user_submission: taskSubmissions.length > 0,
        };
      });

      setTasks(enrichedTasks);
      setLastFetchedAt(Date.now());
      saveToCache(enrichedTasks);

      console.log(`[TasksContext] Fetched ${enrichedTasks.length} tasks`);
    } catch (err) {
      console.error('[TasksContext] Fetch error:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user, userRole, saveToCache]);

  // Fetch events from DB
  const fetchEventsFromDB = useCallback(async () => {
    console.log('[TasksContext] Fetching events from DB...');
    setEventsLoading(true);

    try {
      const { data: allEvents, error } = await supabase
        .from('events')
        .select('id, event_name, event_desc, event_date, status, locked, created_by')
        .order('event_date', { ascending: false });

      if (error) throw error;

      setEvents(allEvents || []);
      setEventsLastFetchedAt(Date.now());
      saveEventsToCache(allEvents || []);

      console.log(`[TasksContext] Fetched ${allEvents?.length || 0} events`);
    } catch (err) {
      console.error('[TasksContext] Events fetch error:', err);
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [saveEventsToCache]);

  // Initialize: Check cache first, then fetch if needed
  useEffect(() => {
    if (!user || !userRole) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const cachedData = loadFromCache();
    
    if (cachedData) {
      // Use cached data
      setTasks(cachedData.tasks);
      setLastFetchedAt(cachedData.lastFetchedAt);
      setLoading(false);
    } else {
      // Fetch from DB
      fetchTasksFromDB();
    }
  }, [user, userRole, loadFromCache, fetchTasksFromDB]);

  // Initialize events: Check cache first, then fetch if needed
  useEffect(() => {
    const cachedEventsData = loadEventsFromCache();
    
    if (cachedEventsData) {
      // Use cached data
      setEvents(cachedEventsData.events);
      setEventsLastFetchedAt(cachedEventsData.lastFetchedAt);
      setEventsLoading(false);
    } else {
      // Fetch from DB
      fetchEventsFromDB();
    }
  }, [loadEventsFromCache, fetchEventsFromDB]);

  // Real-time subscriptions for task changes
  useEffect(() => {
    if (!userRole) return;

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks_temp',
        },
        (payload) => {
          console.log('[TasksContext] Real-time update:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            setTasks(prev => {
              const newTasks = [payload.new, ...prev];
              saveToCache(newTasks);
              return newTasks;
            });
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => {
              const updated = prev.map(t => t.id === payload.new.id ? payload.new : t);
              saveToCache(updated);
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => {
              const filtered = prev.filter(t => t.id !== payload.old.id);
              saveToCache(filtered);
              return filtered;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, saveToCache]);

  // Real-time subscriptions for events changes
  useEffect(() => {
    const eventsChannel = supabase
      .channel('events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        (payload) => {
          console.log('[TasksContext] Events real-time update:', payload.eventType);
          
          if (payload.eventType === 'INSERT') {
            setEvents(prev => {
              const newEvents = [payload.new, ...prev];
              saveEventsToCache(newEvents);
              return newEvents;
            });
          } else if (payload.eventType === 'UPDATE') {
            setEvents(prev => {
              const updated = prev.map(e => e.id === payload.new.id ? payload.new : e);
              saveEventsToCache(updated);
              return updated;
            });
          } else if (payload.eventType === 'DELETE') {
            setEvents(prev => {
              const filtered = prev.filter(e => e.id !== payload.old.id);
              saveEventsToCache(filtered);
              return filtered;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
    };
  }, [saveEventsToCache]);

  // ============================================
  // PUBLIC API - Task Getters (Derived State)
  // ============================================

  const getAllTasks = useCallback(() => tasks, [tasks]);

  const getMyTasks = useCallback((role = userRole) => {
    return tasks.filter(t => 
      t.assigned_to === role && 
      ['assigned', 'pending', 'rejected', 'in_progress'].includes(t.status)
    );
  }, [tasks, userRole]);

  const getReviewTasks = useCallback((role = userRole) => {
    return tasks.filter(t => 
      t.current_reviewer_role === role && 
      t.status === 'in_review'
    );
  }, [tasks, userRole]);

  const getUploadedTasks = useCallback((role = userRole) => {
    return tasks.filter(t => {
      // Tasks where user has submissions OR completed manual tasks
      if (t.assigned_to === role && t.upload_type === 'none' && t.status === 'completed') {
        return true;
      }
      return t.has_user_submission && t.assigned_to === role;
    });
  }, [tasks, userRole]);

  const getTasksByEvent = useCallback((eventId, role = userRole) => {
    return tasks.filter(t => t.event_id === eventId && t.assigned_to === role);
  }, [tasks, userRole]);

  const getTaskById = useCallback((taskId) => {
    return tasks.find(t => t.id === taskId);
  }, [tasks]);

  // ============================================
  // PUBLIC API - Task Mutations (No Refetch)
  // ============================================

  const updateTaskInContext = useCallback((updatedTask) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t);
      saveToCache(updated);
      return updated;
    });
    console.log('[TasksContext] Updated task in context:', updatedTask.id);
  }, [saveToCache]);

  const removeTaskFromContext = useCallback((taskId) => {
    setTasks(prev => {
      const filtered = prev.filter(t => t.id !== taskId);
      saveToCache(filtered);
      return filtered;
    });
    console.log('[TasksContext] Removed task from context:', taskId);
  }, [saveToCache]);

  const addTaskToContext = useCallback((newTask) => {
    setTasks(prev => {
      const updated = [newTask, ...prev];
      saveToCache(updated);
      return updated;
    });
    console.log('[TasksContext] Added task to context:', newTask.id);
  }, [saveToCache]);

  // ============================================
  // PUBLIC API - Dashboard Metrics (Derived)
  // ============================================

  const getDashboardStats = useCallback((role = userRole) => {
    const myTasks = getMyTasks(role);
    const reviewTasks = getReviewTasks(role);
    const uploadedTasks = getUploadedTasks(role);

    // Get unique events
    const eventIds = new Set(tasks.map(t => t.event_id));

    return {
      totalEvents: eventIds.size,
      myTasks: myTasks.length,
      inReview: reviewTasks.length,
      approved: uploadedTasks.length,
      rejected: myTasks.filter(t => t.status === 'rejected').length,
    };
  }, [tasks, userRole, getMyTasks, getReviewTasks, getUploadedTasks]);

  // Manual refresh (if needed)
  const refresh = useCallback(() => {
    console.log('[TasksContext] Manual refresh triggered');
    return fetchTasksFromDB();
  }, [fetchTasksFromDB]);

  const refreshEvents = useCallback(() => {
    console.log('[TasksContext] Manual events refresh triggered');
    return fetchEventsFromDB();
  }, [fetchEventsFromDB]);

  // Helper to get event by ID
  const getEventById = useCallback((eventId) => {
    return events.find(e => e.id === eventId);
  }, [events]);

  // Helper to get event name by ID
  const getEventName = useCallback((eventId) => {
    const event = events.find(e => e.id === eventId);
    return event?.event_name || `Event ${eventId}`;
  }, [events]);

  const value = {
    // State
    tasks,
    loading,
    lastFetchedAt,
    events,
    eventsLoading,
    eventsLastFetchedAt,
    
    // Getters
    getAllTasks,
    getMyTasks,
    getReviewTasks,
    getUploadedTasks,
    getTasksByEvent,
    getTaskById,
    getDashboardStats,
    getEventById,
    getEventName,
    
    // Mutations
    updateTaskInContext,
    removeTaskFromContext,
    addTaskToContext,
    
    // Utils
    refresh,
    refreshEvents,
  };

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
};
