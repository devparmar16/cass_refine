import { useEffect, useState } from 'react';
import { filterPendingReviewTasksForRole } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

/**
 * usePendingReviewTasksMulti
 * Fetches tasks from multiple tables for a given event and reviewer role,
 * runs the centralized review routing logic, and returns only the tasks
 * pending review for that reviewer.
 *
 * @param {string} eventId - The event ID to filter tasks by.
 * @param {string} reviewerRole - The reviewer role (e.g., 'Vice Chairperson').
 * @param {string[]} tableNames - Array of table names to fetch tasks from (e.g., ['secretary_main', 'treasurer_main']).
 * @param {object} [options] - Optional: review field names (defaults to review_one, review_two, final_review).
 * @returns {Array} Array of tasks pending review for the reviewer.
 */
export function usePendingReviewTasksMulti(eventId, reviewerRole, tableNames = [], options = {}) {
  const [pendingTasks, setPendingTasks] = useState([]);
  useEffect(() => {
    async function fetchAndFilter() {
      let allRows = [];
      for (const tableName of tableNames) {
        const { data: rows, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('event_id', eventId);
        if (!error && rows) allRows = allRows.concat(rows.map(row => ({ ...row, tableName })));
      }
      // Strictly filter for secretary_main and vice_chair_main: only show if current_reviewer === reviewerRole and status is 'pending'
      const filtered = allRows.filter(row => {
        if ((row.current_reviewer && row.status === 'pending') && row.current_reviewer === reviewerRole) {
          return true;
        }
        return false;
      });
      setPendingTasks(filtered);
    }
    if (eventId && reviewerRole && tableNames.length > 0) {
      fetchAndFilter();
    }
  }, [eventId, reviewerRole, tableNames.join(','), JSON.stringify(options)]);
  return pendingTasks;
} 