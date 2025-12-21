import React from 'react';
import { Calendar, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const EnhancedEventHeader = ({ 
  eventInfo, 
  roleName, 
  roleColor = "purple", 
  showStats = true,
  stats = {}
}) => {
  // Define color schemes for different roles
  const colorSchemes = {
    purple: {
      gradient: "from-purple-600 via-blue-600 to-indigo-700",
      textGradient: "from-white to-blue-100",
      accent: "text-blue-100",
      description: "text-blue-50"
    },
    green: {
      gradient: "from-green-600 via-emerald-600 to-teal-700",
      textGradient: "from-white to-green-100",
      accent: "text-green-100",
      description: "text-green-50"
    },
    blue: {
      gradient: "from-blue-600 via-cyan-600 to-sky-700",
      textGradient: "from-white to-cyan-100",
      accent: "text-cyan-100",
      description: "text-cyan-50"
    },
    orange: {
      gradient: "from-orange-600 via-amber-600 to-yellow-700",
      textGradient: "from-white to-amber-100",
      accent: "text-amber-100",
      description: "text-amber-50"
    },
    red: {
      gradient: "from-red-600 via-pink-600 to-rose-700",
      textGradient: "from-white to-pink-100",
      accent: "text-pink-100",
      description: "text-pink-50"
    },
    indigo: {
      gradient: "from-indigo-600 via-purple-600 to-violet-700",
      textGradient: "from-white to-purple-100",
      accent: "text-purple-100",
      description: "text-purple-50"
    }
  };

  const scheme = colorSchemes[roleColor] || colorSchemes.purple;

  return (
    <div className="mb-6 sm:mb-8">
      <div className={`bg-gradient-to-br ${scheme.gradient} rounded-xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
        <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/5 rounded-full -translate-y-12 sm:-translate-y-16 translate-x-12 sm:translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-16 sm:w-24 h-16 sm:h-24 bg-white/5 rounded-full translate-y-8 sm:translate-y-12 -translate-x-8 sm:-translate-x-12"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-0">
          <div className="flex-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-3">
              <div className="p-2 sm:p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Calendar className="h-5 w-5 sm:h-7 sm:w-7" />
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r ${scheme.textGradient} bg-clip-text text-transparent leading-tight`}>
                  {eventInfo?.event_name}
                </h1>
                <p className={`${scheme.accent} text-sm sm:text-lg mt-1 font-medium`}>Event Details</p>
              </div>
            </div>
            {eventInfo?.event_desc && (
              <div className="bg-white/15 rounded-xl p-3 sm:p-5 mt-3 sm:mt-4 backdrop-blur-sm border border-white/20">
                <p className={`${scheme.description} leading-relaxed text-sm sm:text-lg`}>
                  {eventInfo?.event_desc}
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 sm:gap-3">
            <Badge variant="secondary" className="bg-white/25 text-white border-white/40 backdrop-blur-sm font-medium text-xs sm:text-sm">
              {roleName} Role
            </Badge>
            {eventInfo?.locked && (
              <Badge variant="destructive" className="bg-red-500/30 text-red-100 border-red-300/40 backdrop-blur-sm text-xs sm:text-sm">
                <Lock className="h-3 w-3 mr-1" />
                Event Locked
              </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Quick Stats */}
        {showStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">My Tasks</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-200">{stats.myTasks || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Uploaded</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-200">{stats.uploaded || 0}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Pending Reviews</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-200">{stats.pendingReviews || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedEventHeader; 