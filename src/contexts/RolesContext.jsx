import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { normalizeRole } from '@/lib/roleUtils';

const RolesContext = createContext(null);

export const RolesProvider = ({ children }) => {
  const [roles, setRoles] = useState([]); // Array of { label: "Chair Person", value: "chair" }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch roles from login table on mount
  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[RolesContext] Fetching roles from login table...');
      
      const { data, error: fetchError } = await supabase
        .from('login')
        .select('role')
        .order('role', { ascending: true });

      if (fetchError) throw fetchError;

      // Remove duplicates and create role options with label + normalized value
      const uniqueRoles = [...new Set((data || []).map(item => item.role))];
      
      const roleOptions = uniqueRoles.map(roleLabel => ({
        label: roleLabel,           // Original from DB (e.g., "Chair Person")
        value: normalizeRole(roleLabel) // Normalized (e.g., "chair")
      }));

      console.log('[RolesContext] Roles loaded:', roleOptions);
      setRoles(roleOptions);
      
      // Cache in localStorage for faster subsequent loads
      try {
        localStorage.setItem('cached_roles', JSON.stringify(roleOptions));
      } catch (err) {
        console.warn('[RolesContext] Failed to cache roles in localStorage:', err);
      }
      
    } catch (err) {
      console.error('[RolesContext] Error fetching roles:', err);
      setError(err.message || 'Failed to fetch roles');
      
      // Try to load from localStorage cache as fallback
      try {
        const cached = localStorage.getItem('cached_roles');
        if (cached) {
          const roleOptions = JSON.parse(cached);
          console.log('[RolesContext] Loaded roles from cache:', roleOptions);
          setRoles(roleOptions);
        }
      } catch (cacheErr) {
        console.warn('[RolesContext] Failed to load from cache:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh roles manually (useful after adding new roles)
  const refreshRoles = () => {
    fetchRoles();
  };

  // Get role label from normalized value
  const getRoleLabel = (normalizedValue) => {
    const role = roles.find(r => r.value === normalizedValue);
    return role ? role.label : normalizedValue;
  };

  // Get normalized value from label
  const getRoleValue = (label) => {
    const role = roles.find(r => r.label === label);
    return role ? role.value : normalizeRole(label);
  };

  const value = {
    roles,          // Array of { label, value }
    loading,
    error,
    refreshRoles,
    getRoleLabel,   // Helper to convert normalized → label
    getRoleValue    // Helper to convert label → normalized
  };

  return (
    <RolesContext.Provider value={value}>
      {children}
    </RolesContext.Provider>
  );
};

export const useRoles = () => {
  const context = useContext(RolesContext);
  if (!context) {
    throw new Error('useRoles must be used within a RolesProvider');
  }
  return context;
};
