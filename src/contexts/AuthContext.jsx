import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      // Check if profile is complete from saved user
      const isComplete = !!parsed.email && !!parsed.contact_num && !!parsed.disp_name;
      setProfileCompleted(isComplete);
    }
    setLoading(false);
  }, []);

  const login = async (username, password, role) => {
    console.log('Login attempt:', { username, role });
    try {
      const { data, error } = await supabase
        .from('login')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .eq('role', role)
        .single();

      console.log('Query result:', { data, error });

      if (error || !data) {
        console.error('Login error:', error ? error.message : 'User not found');
        return { success: false };
      }

      const userData = {
        username: data.username,
        email: data.email,
        contact_num: data.contact_num,
        role: data.role,
        disp_name: data.disp_name,
        profile_img: data.profile_img,
      };

      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));

      const isProfileComplete = checkProfileComplete(data);
      setProfileCompleted(isProfileComplete);

      return {
        success: true,
        isProfileComplete
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false };
    }
  };

  // Helper to check if profile is complete
  const checkProfileComplete = (data) => {
    return (
      !!data.email && data.email !== 'NULL' && data.email !== 'EMPTY' &&
      !!data.contact_num && data.contact_num !== 'NULL' &&
      !!data.disp_name && data.disp_name !== 'NULL'
    );
  };

  // Fetch the latest user data from the database
  const fetchUserFromDB = async (username, role) => {
    const { data, error } = await supabase
      .from('login')
      .select('*')
      .eq('username', username)
      .eq('role', role)
      .single();
    if (error || !data) return null;
    return data;
  };

  // Expose a function to update profile fields and re-check from DB
  const completeProfile = async (updates) => {
    if (user) {
      try {
        const { error } = await supabase
          .from('login')
          .update({ ...updates, profile_updated: true })
          .eq('username', user.username)
          .eq('role', user.role);
        if (error) {
          console.error('Update profile error:', error.message);
          return { success: false };
        }
        // Fetch fresh user data from DB
        const freshUser = await fetchUserFromDB(user.username, user.role);
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem('currentUser', JSON.stringify(freshUser));
          const isComplete = checkProfileComplete(freshUser);
          setProfileCompleted(isComplete);
          return { success: isComplete };
        }
        return { success: false };
      } catch (error) {
        console.error('Update profile error:', error);
        return { success: false };
      }
    }
    return { success: false };
  };

  const logout = () => {
    setUser(null);
    setProfileCompleted(false);
    localStorage.removeItem('currentUser');
  };

  const updateProfile = async (updates) => {
    if (user) {
      try {
        const { error } = await supabase
          .from('login')
          .update(updates)
          .eq('username', user.username)
          .eq('role', user.role);

        if (error) {
          console.error('Update profile error:', error.message);
          return;
        }

        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));

        // After update, mark profile as complete if all required fields are present
        const isComplete =
          !!updatedUser.email && !!updatedUser.contact_num && !!updatedUser.disp_name;
        setProfileCompleted(isComplete);
      } catch (error) {
        console.error('Update profile error:', error);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateProfile,
        loading,
        profileCompleted,
        setProfileCompleted,
        completeProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};