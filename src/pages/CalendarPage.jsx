import React from 'react';
import Calendar from '@/components/Calendar';

const CalendarPage = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Event Calendar
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage and view event notes for your club activities
        </p>
      </div>

      {/* Calendar Component */}
      <Calendar />
    </div>
  );
};

export default CalendarPage; 