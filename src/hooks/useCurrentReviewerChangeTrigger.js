import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * useCurrentReviewerChangeTrigger
 * Monitors current_reviewer changes in specified tables and triggers instant loading
 * when a task moves to a new reviewer (for pending review side)
 * 
 * @param {string} eventId - The event ID to monitor
 * @param {string} reviewerRole - The reviewer role to monitor for
 * @param {string[]} tableNames - Array of table names to monitor
 * @param {function} onReviewerChange - Callback when current_reviewer changes
 * @param {number} pollingInterval - Polling interval in milliseconds (default: 3000)
 * @returns {object} { isLoading, lastCheck }
 */
export function useCurrentReviewerChangeTrigger(
  eventId, 
  reviewerRole, 
  tableNames = [], 
  onReviewerChange = null,
  pollingInterval = 3000
) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const previousDataRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!eventId || !reviewerRole || tableNames.length === 0) {
      return;
    }

    const checkForReviewerChanges = async () => {
      try {
        let allCurrentData = [];
        
        // Fetch current data from all specified tables
        for (const tableName of tableNames) {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('event_id', eventId)
            .eq('status', 'pending');
          
          if (!error && data) {
            allCurrentData = allCurrentData.concat(data.map(row => ({ ...row, tableName })));
          }
        }

        // Filter for tasks where current_reviewer matches the monitored role
        const currentReviewerTasks = allCurrentData.filter(row => 
          row.current_reviewer === reviewerRole
        );

        const previousData = previousDataRef.current;
        
        // Check for changes in current_reviewer assignments
        if (previousData) {
          const currentTaskIds = new Set(currentReviewerTasks.map(task => task.id));
          const previousTaskIds = new Set(previousData.map(task => task.id));
          
          // Check if any new tasks were assigned to this reviewer
          const newTasks = currentReviewerTasks.filter(task => !previousTaskIds.has(task.id));
          
          // Check if any tasks were removed from this reviewer
          const removedTasks = previousData.filter(task => !currentTaskIds.has(task.id));
          
          // Check if current_reviewer changed for existing tasks
          const changedTasks = currentReviewerTasks.filter(currentTask => {
            const previousTask = previousData.find(p => p.id === currentTask.id);
            return previousTask && previousTask.current_reviewer !== currentTask.current_reviewer;
          });

          // If there are any changes, trigger the loading
          if (newTasks.length > 0 || removedTasks.length > 0 || changedTasks.length > 0) {
            console.log(`[useCurrentReviewerChangeTrigger] Detected current_reviewer changes for ${reviewerRole}:`, {
              newTasks: newTasks.length,
              removedTasks: removedTasks.length,
              changedTasks: changedTasks.length
            });
            
            setIsLoading(true);
            
            // Call the callback if provided
            if (onReviewerChange) {
              onReviewerChange({
                newTasks,
                removedTasks,
                changedTasks,
                allCurrentTasks: currentReviewerTasks
              });
            }
            
            // Clear loading after a short delay (instant feedback)
            setTimeout(() => {
              setIsLoading(false);
            }, 500);
          }
        }

        // Update previous data for next comparison
        previousDataRef.current = currentReviewerTasks;
        setLastCheck(new Date());
        
      } catch (error) {
        console.error('[useCurrentReviewerChangeTrigger] Error checking for reviewer changes:', error);
      }
    };

    // Initial check
    checkForReviewerChanges();

    // Set up polling
    intervalRef.current = setInterval(checkForReviewerChanges, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [eventId, reviewerRole, tableNames.join(','), pollingInterval, onReviewerChange]);

  return { isLoading, lastCheck };
} 