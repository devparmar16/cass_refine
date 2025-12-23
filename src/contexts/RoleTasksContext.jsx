import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeRole } from '@/lib/roleUtils';

const RoleTasksContext = createContext();

export const useRoleTasks = () => {
  const context = useContext(RoleTasksContext);
  if (!context) {
    throw new Error('useRoleTasks must be used within RoleTasksProvider');
  }
  return context;
};

/**
 * RoleTasksProvider - Efficient context for all roles' task statistics
 * 
 * HOW IT WORKS:
 * 1. Dynamically fetches task counts for the current user's role (no hardcoded role lists)
 * 2. Uses tasks_temp table which already has normalized assigned_to field
 * 3. Auto-updates when tasks change via subscriptions
 * 4. Handles new roles automatically - no code changes needed
 * 
 * STATISTICS PROVIDED:
 * - totalEvents: Number of events in the system
 * - myTasks: Tasks assigned to user (status: assigned, pending, rejected, in_progress)
 * - inReview: Tasks where user is current reviewer (status: in_review)
 * - approved: Tasks user has uploaded/completed (status: uploaded, completed)
 * - rejected: Tasks rejected and back to user (status: rejected)
 */
export const RoleTasksProvider = ({ children }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEvents: 0,
    myTasks: 0,
    inReview: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Get normalized role for querying
  const userRole = normalizeRole(user?.role);

  // Fetch task statistics for current role
  const fetchRoleStats = useCallback(async () => {
    if (!user || !userRole) {
      setStats({
        totalEvents: 0,
        myTasks: 0,
        inReview: 0,
        approved: 0,
        rejected: 0,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch total events count
      const { count: eventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });

      // Fetch tasks assigned to this role (mytasks section)
      const { count: myTasksCount } = await supabase
        .from('tasks_temp')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userRole)
        .in('status', ['assigned', 'pending', 'in_progress']);

      // Fetch tasks in review by this role
      const { count: inReviewCount } = await supabase
        .from('tasks_temp')
        .select('*', { count: 'exact', head: true })
        .eq('current_reviewer_role', userRole)
        .eq('status', 'in_review');

      // Fetch approved/uploaded tasks (tasks where user has submissions OR completed manual tasks)
      const { data: submittedTasks } = await supabase
        .from('task_submissions')
        .select('task_id')
        .eq('submitted_by_role', userRole);

      const submittedTaskIds = [...new Set(submittedTasks?.map(s => s.task_id) || [])];

      // Also count completed 'none' type tasks
      const { count: completedNoneCount } = await supabase
        .from('tasks_temp')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userRole)
        .eq('upload_type', 'none')
        .eq('status', 'completed');

      const approvedCount = (submittedTaskIds.length || 0) + (completedNoneCount || 0);

      // Fetch rejected tasks (back to user for rework)
      const { count: rejectedCount } = await supabase
        .from('tasks_temp')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userRole)
        .eq('status', 'rejected');

      setStats({
        totalEvents: eventsCount || 0,
        myTasks: myTasksCount || 0,
        inReview: inReviewCount || 0,
        approved: approvedCount || 0,
        rejected: rejectedCount || 0,
      });

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching role stats:', err);
      setStats({
        totalEvents: 0,
        myTasks: 0,
        inReview: 0,
        approved: 0,
        rejected: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user, userRole]);

  // Initial fetch
  useEffect(() => {
    fetchRoleStats();
  }, [fetchRoleStats]);

  // Subscribe to task changes for real-time updates
  useEffect(() => {
    if (!userRole) return;

    const channel = supabase
      .channel('role-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks_temp',
          filter: `assigned_to=eq.${userRole}`,
        },
        () => {
          console.log('Task change detected, refreshing stats...');
          fetchRoleStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks_temp',
          filter: `current_reviewer_role=eq.${userRole}`,
        },
        () => {
          console.log('Review task change detected, refreshing stats...');
          fetchRoleStats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_submissions',
          filter: `submitted_by_role=eq.${userRole}`,
        },
        () => {
          console.log('Submission change detected, refreshing stats...');
          fetchRoleStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, fetchRoleStats]);

  const value = {
    stats,
    loading,
    lastUpdate,
    refresh: fetchRoleStats,
  };

  return (
    <RoleTasksContext.Provider value={value}>
      {children}
    </RoleTasksContext.Provider>
  );
};
