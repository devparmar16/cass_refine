import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Custom hook to trigger loading states when table data changes
 * Monitors changes in status, current_reviewer, or row removal
 * 
 * @param {string} tableName - The table to monitor
 * @param {string} eventId - The event ID to filter by
 * @param {string} role - The role to monitor for
 * @param {function} onTableChange - Callback function when changes are detected
 * @param {number} pollingInterval - How often to check for changes (default: 5000ms)
 * @param {function} shouldTrigger - Optional function to determine if change should trigger loading
 */
export function useTableChangeTrigger(tableName, eventId, role, onTableChange, pollingInterval = 5000, shouldTrigger = null) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const previousDataRef = useRef(null);
  const intervalRef = useRef(null);

  // Function to fetch current table data
  const fetchTableData = async () => {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('event_id', eventId);

      if (error) {
        console.error(`Error fetching ${tableName} data:`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error in fetchTableData for ${tableName}:`, error);
      return null;
    }
  };

  // Function to detect changes
  const detectChanges = (currentData, previousData) => {
    if (!previousData) return false;

    // Check for row removal
    if (currentData.length < previousData.length) {
      return shouldTrigger ? shouldTrigger(currentData, previousData) : true;
    }

    // Check for changes in status or current_reviewer
    const currentMap = new Map(currentData.map(row => [row.id, row]));
    const previousMap = new Map(previousData.map(row => [row.id, row]));

    for (const [id, currentRow] of currentMap) {
      const previousRow = previousMap.get(id);
      if (!previousRow) continue;

      // Check if status changed
      if (currentRow.status !== previousRow.status) {
        return shouldTrigger ? shouldTrigger(currentData, previousData) : true;
      }

      // Check if current_reviewer changed
      if (currentRow.current_reviewer !== previousRow.current_reviewer) {
        return shouldTrigger ? shouldTrigger(currentData, previousData) : true;
      }

      // Check if review_status changed (for review progress)
      if (JSON.stringify(currentRow.review_status) !== JSON.stringify(previousRow.review_status)) {
        return shouldTrigger ? shouldTrigger(currentData, previousData) : true;
      }
    }

    return false;
  };

  // Main polling function
  const checkForChanges = async () => {
    const currentData = await fetchTableData();
    
    if (currentData && detectChanges(currentData, previousDataRef.current)) {
      console.log(`[TableChangeTrigger] Changes detected in ${tableName} for event ${eventId}`);
      
      // Trigger loading state
      setIsLoading(true);
      
      // Call the callback function
      if (onTableChange) {
        await onTableChange();
      }
      
      // Reset loading after a short delay
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }

    // Update previous data reference
    previousDataRef.current = currentData;
    setLastCheck(new Date());
  };

  // Start polling when component mounts
  useEffect(() => {
    if (!tableName || !eventId) return;

    // Initial fetch
    fetchTableData().then(data => {
      previousDataRef.current = data;
    });

    // Set up polling interval
    intervalRef.current = setInterval(checkForChanges, pollingInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [tableName, eventId, role, pollingInterval]);

  // Manual trigger function
  const triggerManualCheck = async () => {
    await checkForChanges();
  };

  return {
    isLoading,
    lastCheck,
    triggerManualCheck
  };
}

/**
 * Hook for monitoring multiple tables simultaneously
 * 
 * @param {Array} tableConfigs - Array of {tableName, eventId, role, onTableChange, shouldTrigger} objects
 * @param {number} pollingInterval - How often to check for changes
 */
export function useMultiTableChangeTrigger(tableConfigs, pollingInterval = 5000) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTables, setActiveTables] = useState(new Set());

  const handleTableChange = async (tableName, onTableChange) => {
    console.log(`[MultiTableChangeTrigger] Change detected in ${tableName}`);
    
    setIsLoading(true);
    setActiveTables(prev => new Set([...prev, tableName]));
    
    if (onTableChange) {
      await onTableChange();
    }
    
    setTimeout(() => {
      setIsLoading(false);
      setActiveTables(prev => {
        const newSet = new Set(prev);
        newSet.delete(tableName);
        return newSet;
      });
    }, 1000);
  };

  // Create individual table monitors
  const tableMonitors = tableConfigs.map(config => 
    useTableChangeTrigger(
      config.tableName,
      config.eventId,
      config.role,
      () => handleTableChange(config.tableName, config.onTableChange),
      pollingInterval,
      config.shouldTrigger
    )
  );

  return {
    isLoading,
    activeTables: Array.from(activeTables),
    tableMonitors
  };
} 