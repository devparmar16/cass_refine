import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/contexts/TasksContext';
import DashboardStats from '@/components/dashboard/DashboardStats';

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
  ArrowRight,
  XCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const Dashboard = () => {
  const { user } = useAuth();
  const { events: contextEvents, eventsLoading } = useTasks();
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

  // Memoized today string
  const todayStr = useMemo(() => 
    new Date().toISOString().slice(0, 10), 
    []
  );

  // Process upcoming events from context
  const upcomingEvents = useMemo(() => {
    if (!contextEvents) return [];
    
    return contextEvents
      .filter((e) => e.event_date && e.event_date >= todayStr)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 5)
      .map((event) => {
        const daysUntil = Math.ceil((new Date(event.event_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
        let soonLabel = `${daysUntil} days`;
        if (daysUntil === 0) soonLabel = 'Today';
        else if (daysUntil === 1) soonLabel = 'Tomorrow';
        return { ...event, soonLabel };
      });
  }, [contextEvents, todayStr]);

  // Stats are now handled by DashboardStats component

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

  if (eventsLoading) {
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

      {/* Analytics Cards - Using DashboardStats Component */}
      <DashboardStats role={user?.role} />

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
    </div>
  );
};

export default Dashboard;
