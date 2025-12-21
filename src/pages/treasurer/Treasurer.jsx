// // --- MINIMAL TREASURER PAGE ---
// // This file now only supports:
// // 1. All roles can see events created by chair in /events tab and view event (with /mytasks, /review, /uploaded tabs, even if empty)
// // 2. The assign button logic as implemented today

// import React, { useEffect, useState } from 'react';
// import supabase from '../../lib/supabase';

// const user = { role: 'Treasurer', email: 'treasurer@example.com' };

// const ChairEventsList = ({ onSelectEvent }) => {
//   const [events, setEvents] = useState([]);
//   useEffect(() => {
//     const fetchEvents = async () => {
//       const { data, error } = await supabase
//         .from('events')
//         .select('*')
//         .eq('created_by_role', 'Chair Person');
//       if (!error) setEvents(data || []);
//     };
//     fetchEvents();
//   }, []);
//   return (
//     <div>
//       <h2>Events Created by Chair</h2>
//       <ul>
//         {events.map(event => (
//           <li key={event.id}>
//             <button onClick={() => onSelectEvent(event)}>{event.event_name}</button>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };

// const EventView = ({ event, onBack }) => {
//   const [tab, setTab] = useState('mytasks');
//   return (
//     <div>
//       <button onClick={onBack}>Back to Events</button>
//       <h3>Event: {event.event_name}</h3>
//       <div style={{ margin: '16px 0' }}>
//         <button onClick={() => setTab('mytasks')}>My Tasks</button>
//         <button onClick={() => setTab('review')}>Review</button>
//         <button onClick={() => setTab('uploaded')}>Uploaded</button>
//       </div>
//       <div>
//         {tab === 'mytasks' && <div>No tasks assigned yet.</div>}
//         {tab === 'review' && <div>No reviews yet.</div>}
//         {tab === 'uploaded' && <div>No uploads yet.</div>}
//       </div>
//       <AssignButton event={event} />
//     </div>
//   );
// };

// const AssignButton = ({ event }) => {
//   const [assigned, setAssigned] = useState(false);
//   const handleAssign = async () => {
//     setAssigned(true);
//     alert('Assign logic executed (replace with your logic)');
//   };
//   return (
//     <button onClick={handleAssign} disabled={assigned}>
//       {assigned ? 'Assigned' : 'Assign'}
//     </button>
//   );
// };

// const Treasurer = () => {
//   const [selectedEvent, setSelectedEvent] = useState(null);
//   return (
//     <div style={{ padding: 32 }}>
//       <h1>Treasurer Events Page</h1>
//       {!selectedEvent ? (
//         <ChairEventsList onSelectEvent={setSelectedEvent} />
//       ) : (
//         <EventView event={selectedEvent} onBack={() => setSelectedEvent(null)} />
//       )}
//     </div>
//   );
// };

// export default Treasurer;
// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import { Progress } from '@/components/ui/progress';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { Badge } from '@/components/ui/badge';
// import { supabase } from '@/lib/supabase';
// import { useAuth } from '@/contexts/AuthContext';
// import { useTasks, TasksProvider } from '@/contexts/TasksContext';
// import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
// import { Calendar, CheckCircle, Clock, Users, FileText, X, AlertCircle, TrendingUp, ChevronRight, ArrowRight } from 'lucide-react';
// import FileViewer from '../components/FileViewer';
// import { useTaskComments } from '@/hooks/useTaskComments';
// import { insertTaskComment } from '@/lib/insertTaskComment';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { getSenderRoleFromTable } from '@/lib/utils';
// import TaskUploadModal from '@/components/TaskUploadModal';
// import RejectedTaskHandler from '@/components/RejectedTaskHandler';
// import ReviewProgressBadges from '@/components/ReviewProgressBadges';
// import ReuploadHistory from '@/components/ReuploadHistory';
// import CommentDisplay from '@/components/CommentDisplay';
// import { useToast } from '@/hooks/use-toast';
// import { Upload, Lock, Unlock } from 'lucide-react';
// import PendingReviewsSection from '@/components/PendingReviewsSection';
// import EnhancedEventHeader from '@/components/EnhancedEventHeader';
// import { useTableChangeTrigger } from '@/hooks/useTableChangeTrigger';
// import TableChangeLoading from '@/components/TableChangeLoading';
// import AllEventsList from '@/components/AllEventsList';

// // Component to display a single task row for Treasurer
// const TaskRow = ({ task, status, onUploadClick, onApproveClick, onRejectClick, isReview, locked, user, currentReviewer }) => {
//   const task_name = task.task_name || task.title || task.name;
//   const desc = task.desc || task.description || task.desc;
//   const isUploaded = status && status.status === 'pending';
//   const canUpload = !isUploaded;
  

  
//   // Determine status
//   let statusLabel = 'Pending';
//   let statusColor = 'bg-yellow-100 text-yellow-800';
//   if (isUploaded) {
//     statusLabel = 'Uploaded';
//     statusColor = 'bg-blue-100 text-blue-800';
//   }
  
//   // Show review status and current reviewer
//   return (
//     <div className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 sm:px-6 py-4 sm:py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1">
//         <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{task_name}</div>
//         <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${statusColor} self-start sm:self-auto`}>{statusLabel}</span>
//       </div>
//       <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{desc}</div>
      
//       {/* Review Progress Badges */}
//       <ReviewProgressBadges status={status} roleType="treasurer" />
      
//       <div className="flex flex-wrap gap-2 mt-2 items-center">
//         {canUpload && (
//           <Button size="sm" onClick={() => {
//             if (!locked) {
//               console.log('🔍 DEBUG - Upload button clicked for task:', task_name);
//               onUploadClick(task);
//             }
//           }} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//             <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
//             <span className="hidden sm:inline">Upload</span>
//             <span className="sm:hidden">Upload</span>
//           </Button>
//         )}
//         {/* Show Approve/Reject if isReview and user is current_reviewer */}
//         {isReview && user?.role && status?.current_reviewer && user.role === status.current_reviewer && (
//           <>
//             <Button size="sm" variant="success" onClick={() => !locked && onApproveClick(task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//               <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
//               <span className="hidden sm:inline">Approve</span>
//               <span className="sm:hidden">Approve</span>
//             </Button>
//             <Button size="sm" variant="destructive" onClick={() => !locked && onRejectClick(task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//               <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
//               <span className="hidden sm:inline">Reject</span>
//               <span className="sm:hidden">Reject</span>
//             </Button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

// // Component to display an uploaded task row for Treasurer
// const UploadedTaskRow = ({ task, status, onDownloadClick, onRemoveClick, onUploadClick, onApproveClick, onRejectClick, isReview, locked }) => {
//   const task_name = task.task_name || task.title || task.name;
//   const desc = task.desc || task.description || task.desc;
//   const task_uuid = task.id || task.task_uuid;
//   const table_data = task.table_data;
//   console.log('[DEBUG][Treasurer UploadedTaskRow] task:', task, 'status:', status);
//   // Get table data from either task or status object (same as Technical Coordinator)
//   const actualTableData = status?.table_data || task?.table_data || table_data || null;
  

  
//   // Function to get reviewer information from review_status (for backward compatibility)
//   const getReviewerInfo = () => {
//     if (!status?.review_status || !Array.isArray(status.review_status)) return null;
    
//     const reviewStatus = status.review_status;
    
//     // For approved tasks, find the last approval
//     if (status.status === 'approved') {
//       for (let i = reviewStatus.length - 1; i >= 0; i--) {
//         if (reviewStatus[i].status === 'A') {
//           return {
//             type: 'approved',
//             role: reviewStatus[i].role,
//             step: reviewStatus[i].step
//           };
//         }
//       }
//     }
    
//     // For rejected tasks, find the last rejection
//     if (status.status === 'rejected') {
//       for (let i = reviewStatus.length - 1; i >= 0; i--) {
//         if (reviewStatus[i].status === 'R') {
//           return {
//             type: 'rejected',
//             role: reviewStatus[i].role,
//             step: reviewStatus[i].step
//           };
//         }
//       }
//     }
    
//     return null;
//   };
  
//   const reviewerInfo = getReviewerInfo();
  
//   // Status badge with reviewer information
//   let statusLabel = null; // Don't show status label for approved tasks
//   let statusColor = 'bg-yellow-100 text-yellow-800';
//   let reviewerBadge = null;
  
//   if (status?.status === 'rejected') {
//     statusLabel = 'Rejected';
//     statusColor = 'bg-red-100 text-red-800';
//     if (reviewerInfo) {
//       reviewerBadge = (
//         <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
//           Rejected by {reviewerInfo.role}
//         </span>
//       );
//     }
//   } else if (status?.status === 'pending') {
//     statusLabel = 'Pending Review';
//     statusColor = 'bg-blue-100 text-blue-800';
//   }
  

//   // Comments logic - use comprehensive parameters
//   let reviewStat = null;
//   if (status?.status === 'approved') reviewStat = 'A';
//   else if (status?.status === 'rejected') reviewStat = 'R';
  
//   // Debug logging for comment fetching
//   console.log('🔍 DEBUG - UploadedTaskRow comment fetching:', {
//     taskName: task_name,
//     statusId: status?.id,
//     statusTaskUuid: status?.task_uuid,
//     taskId: task.task_id || status?.task_id,
//     eventId: task.event_id || status?.event_id,
//     reviewStat
//   });
  
//   const { comments } = useTaskComments(
//     status?.id || status?.task_uuid,
//     reviewStat,
//     task.task_id || status?.task_id,
//     task.event_id || status?.event_id
//   );
//   const [commentPopoverOpen, setCommentPopoverOpen] = useState(false);
//   return (
//     <div className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 sm:px-6 py-4 sm:py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1">
//         <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{task_name}</div>
//         <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
//           {statusLabel && (
//             <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>{statusLabel}</span>
//           )}
//           {reviewerBadge}
//         </div>
//       </div>
//       <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{desc}</div>
      
//       {/* Review Progress Badges */}
//       <ReviewProgressBadges status={status} roleType="treasurer" />
      
//       {/* Reupload History Component */}
//       <ReuploadHistory task={task} status={status} />
      
//       <div className="flex flex-wrap gap-2 mt-2 items-center">
//         {status?.status === 'rejected' && onUploadClick && (
//           <Button size="sm" variant="outline" onClick={() => onUploadClick(task_name)} className="transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm">
//             <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
//             <span className="hidden sm:inline">Reupload</span>
//             <span className="sm:hidden">Reupload</span>
//           </Button>
//         )}
//         {/* Handle file_link array format */}
//         {(() => {
//           console.log('🔍 FILE VIEW CHECK - Task:', task_name, 'FileLink:', status?.file_link, 'DownloadUrl:', status?.downloadUrl);
//           return (status?.file_link && Array.isArray(status.file_link) && status.file_link.length > 0) || status?.downloadUrl;
//         })() ? (
//           <>
//             {(() => {
//               // Handle file_link which might be a JSON string or already parsed array
//               let files = [];
//               if (status?.file_link) {
//                 try {
//                   // Try to parse as JSON if it's a string
//                   const parsedFileLink = typeof status.file_link === 'string' ? JSON.parse(status.file_link) : status.file_link;
//                   files = Array.isArray(parsedFileLink) ? parsedFileLink : [];
//                 } catch (e) {
//                   // If parsing fails, treat as single file
//                   files = [{name: 'File', url: status.file_link}];
//                 }
//               } else if (status?.downloadUrl) {
//                 files = [{name: 'File', url: status.downloadUrl}];
//               }
              
//               console.log('🔍 DEBUG - Files being passed to FileViewer:', files);
//               return (
//                 <FileViewer 
//                   files={files} 
//                   tableData={actualTableData}
//                   taskName={task_name}
//                   buttonLabel="View"
//                   variant="outline"
//                   buttonClass="text-xs sm:text-sm"
//                 />
//               );
//             })()}
//           </>
//         ) : null}
//         {isReview && onApproveClick && onRejectClick && (
//           <>
//             <Button size="sm" variant="success" onClick={() => !locked && onApproveClick(task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//               <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
//               <span className="hidden sm:inline">Approve</span>
//               <span className="sm:hidden">Approve</span>
//             </Button>
//             <Button size="sm" variant="destructive" onClick={() => !locked && onRejectClick(task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//               <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
//               <span className="hidden sm:inline">Reject</span>
//               <span className="sm:hidden">Reject</span>
//             </Button>
//           </>
//         )}
//         <Button size="sm" variant="destructive" onClick={() => !locked && onRemoveClick(task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//           <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
//           <span className="hidden sm:inline">Remove</span>
//           <span className="sm:hidden">Remove</span>
//         </Button>
//         {comments.length > 0 && (
//           <Popover open={commentPopoverOpen} onOpenChange={setCommentPopoverOpen}>
//             <PopoverTrigger asChild>
//               <Button size="sm" variant="outline" className="flex items-center gap-1 text-xs sm:text-sm">
//                 <svg className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${commentPopoverOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
//                 <span className="hidden sm:inline">Comments ({comments.length})</span>
//                 <span className="sm:hidden">Comments</span>
//               </Button>
//             </PopoverTrigger>
//             <PopoverContent className="w-80 sm:w-96 max-h-96 overflow-y-auto">
//               <CommentDisplay comments={comments} />
//             </PopoverContent>
//           </Popover>
//         )}
//       </div>
//     </div>
//   );
// };

// // Main Treasurer component
// const Treasurer = ({ eventId, section: initialSection = 'mytasks' }) => {
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const { toast } = useToast();
//   const { tasks: contextTasks, loading: contextLoading } = useTasks();
  
//   // Remove static taskList dependency - use only context data
//   const finalTaskList = contextTasks;
//   const [isLoading, setIsLoading] = useState(true);
//   const [eventInfo, setEventInfo] = useState({});
//   const [taskStatus, setTaskStatus] = useState({});
//   const [activeTask, setActiveTask] = useState(null);
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadError, setUploadError] = useState(null);
//   const [showUploadModal, setShowUploadModal] = useState(false);
//   const [currentUploadTask, setCurrentUploadTask] = useState(null);
//   const [section, setSection] = useState(initialSection);
//   const [rejectedTreasurerTasks, setRejectedTreasurerTasks] = useState([]);

//   // Add state for dashboard functionality
//   const [upcomingEvents, setUpcomingEvents] = useState([]);
//   const [dashboardStats, setDashboardStats] = useState([
//     {
//       title: 'Pending Reviews',
//       value: '0',
//       icon: Clock,
//       color: 'text-blue-600',
//       clickHandler: () => navigate('/events')
//     },
//     {
//       title: 'Approved Tasks',
//       value: '0',
//       icon: CheckCircle,
//       color: 'text-green-600',
//       clickHandler: () => navigate('/events')
//     },
//     {
//       title: 'Total Events',
//       value: '0',
//       icon: Calendar,
//       color: 'text-purple-600',
//       clickHandler: () => navigate('/events')
//     },
//     {
//       title: 'Team Members',
//       value: '0',
//       icon: Users,
//       color: 'text-orange-600',
//       clickHandler: () => navigate('/events')
//     }
//   ]);
//   const [recentActivities, setRecentActivities] = useState([]);


//   // finalTaskList is already declared above
  
//   // Debug: Log the structure of tasks from context
//   console.log('🔍 DEBUG - Tasks from context:', contextTasks);
//   if (contextTasks.length > 0) {
//     console.log('🔍 DEBUG - First task structure:', contextTasks[0]);
//     console.log('🔍 DEBUG - Available properties:', Object.keys(contextTasks[0]));
//   }

//   // Add state for different task categories (same as Technical Coordinator)
//   const [pendingReviews, setPendingReviews] = useState([]);

//   const [rejectedTasks, setRejectedTasks] = useState([]);
//   const [uploadedByYou, setUploadedByYou] = useState([]);

//   // Add state for approval/rejection
//   const [approvingTask, setApprovingTask] = useState(null);
//   const [approveComment, setApproveComment] = useState('');
//   const [isApproving, setIsApproving] = useState(false);
//   const [rejectingTask, setRejectingTask] = useState(null);
//   const [rejectComment, setRejectComment] = useState('');
//   const [isRejecting, setIsRejecting] = useState(false);
//   const [isProcessingAction, setIsProcessingAction] = useState(false);

//   // Table change trigger for monitoring treasurer_main table
//   const { isLoading: tableChangeLoading, lastCheck } = useTableChangeTrigger(
//     'treasurer_main',
//     eventId,
//     'Treasurer',
//     async () => {
//       console.log('[Treasurer] Treasurer table changed, refreshing data...');
//       // Refresh data immediately without page reload
//       await fetchEventDetailsAndTaskStatus();
//     },
//     3000,
//     // Exclude upload, reupload, and remove operations from triggering the loading
//     (currentData, previousData) => {
//       // Don't trigger for row removal (remove button operations)
//       if (currentData && previousData && currentData.length < previousData.length) {
//         console.log('[Treasurer] Detected row removal operation, skipping loading trigger');
//         return false;
//       }
      
//       // Don't trigger for status changes from 'rejected' to 'pending' (reupload)
//       // Don't trigger for status changes from null/undefined to 'pending' (normal upload)
//       // BUT DO trigger for final approval/rejection changes
//       if (currentData && previousData) {
//         for (let i = 0; i < currentData.length; i++) {
//           const current = currentData[i];
//           const previous = previousData.find(p => p.id === current.id);
          
//           // Skip reupload operations
//           if (previous && previous.status === 'rejected' && current.status === 'pending') {
//             console.log('[Treasurer] Detected reupload operation, skipping loading trigger');
//             return false;
//           }
          
//           // Skip normal upload operations
//           if (previous && (!previous.status || previous.status === 'null' || previous.status === null) && current.status === 'pending') {
//             console.log('[Treasurer] Detected normal upload operation, skipping loading trigger');
//             return false;
//           }
          
//           // IMPORTANT: Allow final approval/rejection changes to trigger loading
//           if (previous && previous.status === 'pending' && (current.status === 'approved' || current.status === 'rejected')) {
//             console.log('[Treasurer] Detected final approval/rejection, allowing loading trigger');
//             return true;
//           }
//         }
//       }
//       return true; // Allow other changes to trigger loading
//     }
//   );



//   // Fetch event details and task status when eventId changes
//   useEffect(() => {
//     if (eventId && finalTaskList.length > 0) {
//       fetchEventDetailsAndTaskStatus();
//     }
//   }, [eventId, finalTaskList]);

//   // Update section state when prop changes
//   useEffect(() => {
//     if (initialSection && initialSection !== section) {
//       setSection(initialSection);
//     }
//   }, [initialSection, section]);

//   useEffect(() => {
//     async function fetchRejectedTreasurerTasks() {
//       if (!eventId) return;
//       const { data, error } = await supabase
//         .from('treasurer_main')
//         .select('*')
//         .eq('event_id', eventId)
//         .eq('status', 'rejected'); // removed .eq('current_reviewer', null) to show all rejected
//       if (!error && Array.isArray(data)) {
//         // Find rejector from review_status array (last entry with status 'R')
//         const enhanced = data.map(row => {
//           let rejectedBy = null;
//           if (Array.isArray(row.review_status)) {
//             const lastRej = [...row.review_status].reverse().find(r => r.status === 'R');
//             if (lastRej) rejectedBy = lastRej.role || lastRej.reviewer || null;
//           }
//           return { ...row, rejectedBy };
//         });
//         setRejectedTreasurerTasks(enhanced);
//       } else {
//         setRejectedTreasurerTasks([]);
//       }
//     }
//     fetchRejectedTreasurerTasks();
//   }, [eventId]);



//   // Handle reupload of rejected tasks
//   const handleReupload = async (task, comment = '', options = {}) => {
//     if (!eventId || !task) return;
    
//     try {
//       const taskName = task.task_name || task.title || task.name;
      
//       // Check for existing rejected row
//       const { data: existingRow, error: existingError } = await supabase
//         .from('treasurer_main')
//         .select('*')
//         .eq('event_id', eventId)
//         .eq('task_name', taskName)
//         .eq('status', 'rejected')
//         .single();
      
//       if (existingError || !existingRow) {
//         alert('No rejected row found to reupload.');
//         return;
//       }

//       // Import and use the reupload history handler
//       const { handleReuploadHistory } = await import('@/lib/reuploadHistory');
      
//       // Handle reupload history - this will move review_status to reupload_history
//       await handleReuploadHistory(existingRow, 'treasurer_main', supabase);

//       // Insert reupload comment if provided (like Secretary)
//       if (comment && comment.trim()) {
//         console.log('🔍 DEBUG - Inserting reupload comment:', {
//           comment: comment.trim(),
//           taskName,
//           existingRowId: existingRow.id,
//           eventId
//         });
        
//         // Debug user data to see what name is available
//         console.log('🔍 DEBUG - User data for comment:', {
//           user_metadata: user?.user_metadata,
//           full_name: user?.user_metadata?.full_name,
//           name: user?.user_metadata?.name,
//           display_name: user?.user_metadata?.display_name,
//           email: user?.email,
//           disp_name: user?.disp_name
//         });
        
//         // Try to get name from multiple sources, with fallback to email username
//         let commenterName = user?.user_metadata?.full_name || 
//                            user?.user_metadata?.name || 
//                            user?.user_metadata?.display_name || 
//                            user?.disp_name;
        
//         // If no name found, try to extract from email
//         if (!commenterName && user?.email) {
//           const emailUsername = user.email.split('@')[0];
//           // Capitalize first letter and replace dots/underscores with spaces
//           commenterName = emailUsername
//             .replace(/[._]/g, ' ')
//             .replace(/\b\w/g, l => l.toUpperCase());
//         }
        
//         // Final fallback
//         commenterName = commenterName || user?.email || 'Treasurer';
        
//         console.log('🔍 DEBUG - Inserting comment with task_uuid:', existingRow.id);
        
//         const { data: insertedComment, error: commentError } = await supabase
//           .from('comments')
//           .insert({
//             comment_text: comment.trim(), // Remove the 🔄 REUPLOAD: prefix
//             task_name: taskName,
//             event_name: eventInfo?.event_name,
//             commenter_role: 'Treasurer',
//             commenter_name: commenterName,
//             sender_table: 'treasurer_main',
//             task_uuid: existingRow.id, // Use existingRow.id like Secretary uses existingRow.task_id
//             event_id: eventId,
//             comment_type: {
//               type: 'reupload',
//               role: 'Treasurer'
//             },
//             created_at: new Date().toISOString()
//           })
//           .select();
        
//         if (commentError) {
//           console.error('Error inserting reupload comment:', commentError);
//         } else {
//           console.log('✅ Reupload comment inserted successfully:', insertedComment);
//         }
//       }

//       // Set the task for reupload to trigger upload modal
//       setCurrentUploadTask({ task_name: taskName });
//       setShowUploadModal(true);
      
//     } catch (error) {
//       console.error('Reupload error:', error);
//       alert('Failed to reupload task: ' + error.message);
//     }
//   };

//   // Fetch event details and task status on mount
//   const fetchEventDetailsAndTaskStatus = async () => {
//     console.log('fetchEventDetailsAndTaskStatus called with eventId:', eventId);
    
//     if (!eventId) {
//       setEventInfo({ event_name: 'Error', event_desc: 'Event ID not provided.' });
//       setIsLoading(false);
//       return;
//     }

//     const { data: eventData, error: eventError } = await supabase
//       .from('events')
//       .select('event_name, event_desc, locked')
//       .eq('id', eventId)
//       .single();

//     if (eventError || !eventData) {
//       console.error('Error fetching event details:', eventError);
//       setEventInfo({ event_name: 'Event not found', event_desc: 'Could not retrieve event details.' });
//       setIsLoading(false);
//       return;
//     }

//     setEventInfo({ event_name: eventData.event_name, event_desc: eventData.event_desc, locked: !!eventData.locked });

//     // Fetch treasurer_main rows for this event
//     const { data: treasurerRows, error: treasurerRowsError } = await supabase
//       .from('treasurer_main')
//       .select('*')
//       .eq('event_id', eventId);

//     if (treasurerRowsError) {
//       console.error('Error fetching treasurer tasks:', treasurerRowsError);
//       setTaskStatus({});
//       setIsLoading(false);
//       return;
//     }

//     console.log('🔍 DEBUG - treasurerRows from DB:', treasurerRows);
//     console.log('🔍 DEBUG - finalTaskList structure:', finalTaskList);
//     console.log('🔍 DEBUG - taskList task_names:', finalTaskList.map(t => t.task_name || t.title || t.name));
//     console.log('🔍 DEBUG - treasurerRows task_names:', treasurerRows?.map(r => r.task_name));



//     const initialStatus = {};

//     // Initialize all tasks with default status
//     finalTaskList.forEach((task) => {
//       const task_name = task.task_name || task.title || task.name;
//       if (!task_name) {
//         console.warn('Task missing task_name:', task);
//         return;
//       }
      
//       // Find the matching row in treasurer_main - try exact match first, then partial match
//       let row = treasurerRows ? treasurerRows.find(r => r.task_name === task_name) : null;
      
//       // If no exact match, try partial match (for cases where names might be slightly different)
//       if (!row && treasurerRows) {
//         row = treasurerRows.find(r => 
//           r.task_name && task_name && 
//           (r.task_name.toLowerCase().includes(task_name.toLowerCase()) || 
//            task_name.toLowerCase().includes(r.task_name.toLowerCase()))
//         );
//       }
      
//       console.log('🔍 DEBUG - Matching task_name:', task_name, 'Found row:', row);
//       if (row) {
//         console.log('🔍 DEBUG - Row status for', task_name, ':', row.status);
//         console.log('🔍 DEBUG - Row task_name in DB:', row.task_name);
//       }
//       if (row) {
//         // Handle file_link as array of objects (new structure) or string (old structure)
//         let filePath = null;
//         let downloadUrl = null;
        
//         if (row.file_link) {
//           let parsedFileLink;
          
//           // Try to parse as JSON first (new structure)
//           try {
//             parsedFileLink = typeof row.file_link === 'string' ? JSON.parse(row.file_link) : row.file_link;
//           } catch (e) {
//             // If parsing fails, treat as string URL (old structure)
//             parsedFileLink = row.file_link;
//           }
          
//           if (Array.isArray(parsedFileLink)) {
//             // New structure: array of file objects
//             downloadUrl = parsedFileLink;
//             // For filePath, use the first file's name if available
//             if (parsedFileLink.length > 0 && parsedFileLink[0].name) {
//               filePath = `${parsedFileLink[0].name}`;
//             }
//           } else {
//             // Old structure: string URL
//             downloadUrl = parsedFileLink;
//             filePath = parsedFileLink.split('/').pop();
//           }
//         }
        
//         initialStatus[task_name] = {
//           filePath: filePath,
//           downloadUrl: downloadUrl,
//           file_link: row.file_link,
//           status: row.status, // Don't default to 'pending' - use actual status
//           current_reviewer: row.current_reviewer,
//           review_status: row.review_status || [],
//           id: row.id,
//           task_uuid: row.id,
//           task_id: row.task_id,
//           task_name: task_name, // Add task_name for ReviewProgressBadges
//           event_id: row.event_id,
//           event_name: row.event_name,
//         };

//       } else {
//         initialStatus[task_name] = {
//           filePath: null,
//           downloadUrl: null,
//           file_link: null,
//           status: null, // No status means not uploaded
//           current_reviewer: null,
//           review_status: [],
//         };
//       }
//     });

//     setTaskStatus(initialStatus);
//     setIsLoading(false);
//   };

//   // Fetch upcoming events for dashboard
//   useEffect(() => {
//       const fetchUpcomingEvents = async () => {
//         const { data: events, error: eventsError } = await supabase
//           .from('events')
//           .select('id, event_name, event_date');
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);
//         const upcoming = (events || []).filter((e) => {
//           if (!e.event_date) return false;
//           const eventDate = new Date(e.event_date);
//           return eventDate >= today;
//         });
//         setUpcomingEvents(
//           upcoming
//             .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
//             .map((e) => {
//               const eventDate = new Date(e.event_date);
//               const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
//               let soonLabel = '';
//               if (diffDays === 0) soonLabel = 'Today';
//               else if (diffDays === 1) soonLabel = 'Tomorrow';
//               else soonLabel = `In ${diffDays} days`;
//               return {
//                 id: e.id,
//                 event_name: e.event_name,
//                 start_date: eventDate.toLocaleDateString(),
//                 soonLabel,
//               };
//             })
//         );
//       };
//       fetchUpcomingEvents();
//   }, [eventId]); // Remove contextTasks dependency since AllEventsList handles its own data

//   // Real-time subscriptions for automatic UI updates
//   useEffect(() => {
//     if (!eventId) return;
    
//     // Subscribe to treasurer_main table changes
//     const treasurerChannel = supabase
//       .channel('realtime:treasurer_main')
//       .on(
//         'postgres_changes',
//         {
//           event: '*',
//           schema: 'public',
//           table: 'treasurer_main',
//           filter: `event_id=eq.${eventId}`,
//         },
//         (payload) => {
//           console.log('[Realtime] treasurer_main change:', payload);
//           fetchEventDetailsAndTaskStatus();
//         }
//       )
//       .subscribe();

//     // Subscribe to chair_main table changes (for chair reviews)
//     const chairChannel = supabase
//       .channel('realtime:chair_main')
//       .on(
//         'postgres_changes',
//         {
//           event: '*',
//           schema: 'public',
//           table: 'chair_main',
//           filter: `event_id=eq.${eventId}`,
//         },
//         (payload) => {
//           console.log('[Realtime] chair_main change:', payload);
//           fetchEventDetailsAndTaskStatus();
//         }
//       )
//       .subscribe();

//     // Cleanup on unmount
//     return () => {
//       supabase.removeChannel(treasurerChannel);
//       supabase.removeChannel(chairChannel);
//     };
//   }, [eventId]);

//       // Mapping from task title to folder
//     const taskToStorageMap = {
//       'Tentative Budget Plan': 'tent_budget',
//       'Final Budget Report': 'final_budget',
//     };

//   // Handle file upload to Supabase for Treasurer
//   const handleUpload = async () => {
//     if (uploadFiles.length === 0) {
//       setUploadError('Please select files to upload.');
//       return;
//     }
//     setIsUploading(true);
//     setUploadError(null);
    
//     try {
//       // Get task_id directly from the task in context
//       console.log('🔍 DEBUG - finalTaskList:', finalTaskList);
//       console.log('🔍 DEBUG - activeTask:', activeTask);
      
//       const taskDef = finalTaskList.find(t => {
//         const taskName = t.task_name || t.title || t.name;
//         console.log('🔍 DEBUG - Comparing:', taskName, 'with', activeTask);
//         return taskName === activeTask;
//       });
      
//       if (!taskDef) {
//         console.error('🔍 DEBUG - Task not found. Available tasks:', finalTaskList.map(t => ({ task_name: t.task_name, title: t.title, name: t.name, task_id: t.task_id, id: t.id })));
//         throw new Error('Task definition not found.');
//       }
      
//       const taskId = taskDef.task_id || taskDef.id;
//       const taskName = activeTask;
//       console.log('🔍 DEBUG - Upload task details:', { taskId, taskName, activeTask, taskDef });
      
//       // Determine folder based on task type
//       let folder = '';
//       if (activeTask.toLowerCase().includes('tentative budget plan')) folder = 'tent_budget';
//       else if (activeTask.toLowerCase().includes('final budget report')) folder = 'final_budget';
//       else folder = 'misc';
//       const bucket = 'treasurer';
//       console.log('DEBUG: taskId:', taskId);
//       console.log('DEBUG: taskName:', taskName);
//       console.log('DEBUG: folder:', folder);
//       console.log('DEBUG: bucket:', bucket);
      
//       // Handle multiple files
//       const files = uploadFiles;
//       const fileLinkArr = [];
//       let finalFileName = null;
//       let finalFilePath = null;
      
//       // Create event folder name (same as Technical Coordinator)
//       console.log('DEBUG: eventInfo:', eventInfo);
//       console.log('DEBUG: eventId:', eventId);
//       if (!eventInfo?.event_name) {
//         throw new Error('Event information not loaded. Please refresh the page and try again.');
//       }
//       const eventFolder = `${eventInfo.event_name.replace(/\s+/g, '_')}_${eventId}`;
//       console.log('DEBUG: eventFolder:', eventFolder);
      
//       // Upload multiple files
//       for (let i = 0; i < files.length; i++) {
//         const file = files[i];
//         const ext = file.name.split('.').pop();
//         const base = `${eventId}_${taskId}`;
//         let currentFileName = `${base}_${i + 1}.${ext}`;
//         let currentFilePath = `${folder}/${eventFolder}/${currentFileName}`;
        
//         // Check if this is a reupload
//         const isReupload = taskStatus[activeTask]?.status === 'rejected';
//         if (isReupload) {
//           currentFileName = `reuploaded_${currentFileName}`;
//           currentFilePath = `${folder}/${eventFolder}/${currentFileName}`;
//         }
        
//         // Ensure no overwrite
//         let counter = 1;
//         while (true) {
//           const { data: existingFiles, error: listError } = await supabase.storage.from(bucket).list(`${folder}/${eventFolder}`, { search: currentFileName });
//           if (listError) throw new Error('Failed to check for existing files.');
//           if (!existingFiles || !existingFiles.find(f => f.name === currentFileName)) break;
//           currentFileName = `${base}_${i + 1}_${counter++}.${ext}`;
//           if (isReupload) {
//             currentFileName = `reuploaded_${currentFileName}`;
//           }
//           currentFilePath = `${folder}/${eventFolder}/${currentFileName}`;
//         }
        
//         console.log('DEBUG: Uploading to path:', currentFilePath);
//         const { error: uploadError } = await supabase.storage.from(bucket).upload(currentFilePath, file);
//         if (uploadError) throw new Error(`File upload failed for ${file.name}: ${uploadError.message}`);
        
//         const publicUrl = `https://pfitttbkoyglznojhozc.supabase.co/storage/v1/object/public/${bucket}/${folder}/${eventFolder}/${currentFileName}`;
//         fileLinkArr.push({ name: currentFileName, url: publicUrl });
        
//         finalFileName = currentFileName;
//         finalFilePath = currentFilePath;
//       }
      
//       // Get event name for database insert
//       const { data: eventData, error: eventError } = await supabase
//         .from('events')
//         .select('event_name')
//         .eq('id', eventId)
//         .single();
      
//       if (eventError || !eventData) {
//         throw new Error('Failed to fetch event name for database insert.');
//       }

//       // Get task definition to determine first reviewer
//       const { data: taskDefinition, error: taskDefError } = await supabase
//         .from('tasks')
//         .select('review_role')
//         .eq('task_name', taskName)
//         .single();
      
//       if (taskDefError) {
//         console.error('Error fetching task definition:', taskDefError);
//       }

//       // Parse review_role to get first reviewer
//       let firstReviewer = null;
//       if (taskDefinition?.review_role) {
//         let reviewRoleArr = [];
//         if (Array.isArray(taskDefinition.review_role)) {
//           reviewRoleArr = taskDefinition.review_role;
//         } else if (typeof taskDefinition.review_role === 'string') {
//           try {
//             reviewRoleArr = JSON.parse(taskDefinition.review_role);
//           } catch {
//             reviewRoleArr = [taskDefinition.review_role];
//           }
//         }
//         firstReviewer = reviewRoleArr.length > 0 ? reviewRoleArr[0] : null;
//       }

//       console.log('🔍 DEBUG - About to insert into DB with taskName:', taskName, 'taskId:', taskId, 'firstReviewer:', firstReviewer);
//       // Update database
//       const { error: dbError } = await supabase
//         .from('treasurer_main')
//         .upsert({
//           event_id: eventId,
//           event_name: eventData.event_name,
//           task_name: taskName,
//           task_id: taskId,
//           file_link: fileLinkArr,
//           status: 'pending',
//           uploaded_at: new Date().toISOString(),
//           current_reviewer: firstReviewer,
//           review_status: []
//         });
      
//       if (dbError) throw new Error(`Database update failed: ${dbError.message}`);
      
//       // Update local state
//       setTaskStatus((prev) => ({
//         ...prev,
//         [activeTask]: {
//           ...prev[activeTask],
//           file_link: fileLinkArr,
//           status: 'pending',
//           uploaded_at: new Date().toISOString(),
//           current_reviewer: firstReviewer,
//           review_status: []
//         },
//       }));
      
//       // Clear selected files and close dialog
//       setSelectedFiles((prev) => ({ ...prev, [activeTask]: null }));
//       setActiveTask(null);
      
//       // Refresh task status to ensure UI updates correctly
//       await fetchEventDetailsAndTaskStatus();
      
//       // Debug: Check if the task was actually stored in the database
//       const { data: checkData, error: checkError } = await supabase
//         .from('treasurer_main')
//         .select('*')
//         .eq('event_id', eventId)
//         .eq('task_name', taskName);
//       console.log('🔍 DEBUG - After upload, checking DB for task:', taskName, 'Found:', checkData);
      
//       alert('Files uploaded successfully!');
      
//       // Clear upload state
//       setUploadFiles([]);
//       setUploadTask(null);
//       setActiveTask(null);
//     } catch (err) {
//       console.error('Upload error:', err);
//       setUploadError(err.message);
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   // Handle task approval
//   const handleApprove = async (taskTitle) => {
//     setApprovingTask(taskTitle);
//     setApproveComment('');
//   };

//   const handleApproveWithComment = async () => {
//     if (!approvingTask) return;
//     setIsApproving(true);
//     try {
//       const status = taskStatus[approvingTask];
//       if (!status?.id) throw new Error('Task status not found.');

//       // Update review status
//       const newReviewStatus = [...(status.review_status || []), {
//         status: 'A',
//         role: user?.role || 'Treasurer',
//         reviewer: user?.email || user?.id,
//         comment: approveComment,
//         timestamp: new Date().toISOString()
//       }];

//       // Update database
//       const { error: dbError } = await supabase
//         .from('treasurer_main')
//         .update({
//           status: 'approved',
//           review_status: newReviewStatus,
//           current_reviewer: null,
//           finalApproved: true
//         })
//         .eq('id', status.id);

//       if (dbError) throw new Error(`Database update failed: ${dbError.message}`);

//       // Add comment if provided
//       if (approveComment.trim()) {
//         await insertTaskComment(
//           status.id,
//           'A',
//           approveComment,
//           user?.role || 'Treasurer',
//           user?.email || user?.id
//         );
//       }

//       // Update local state
//       setTaskStatus((prev) => ({
//         ...prev,
//         [approvingTask]: {
//           ...prev[approvingTask],
//           status: 'approved',
//           review_status: newReviewStatus,
//           current_reviewer: null,
//           finalApproved: true
//         },
//       }));

//       setApprovingTask(null);
//       setApproveComment('');
      
//       // Show processing state and auto-refresh after 1 second
//       setIsProcessingAction(true);
//       await fetchEventDetailsAndTaskStatus();
//       setIsProcessingAction(false);
//     } catch (err) {
//       console.error('Approve error:', err);
//       alert(`Failed to approve task: ${err.message}`);
//     } finally {
//       setIsApproving(false);
//     }
//   };

//   const handleReject = async (taskTitle) => {
//     setRejectingTask(taskTitle);
//     setRejectComment('');
//   };

//   const handleRejectWithComment = async () => {
//     if (!rejectingTask) return;
//     setIsRejecting(true);
//     try {
//       const status = taskStatus[rejectingTask];
//       if (!status?.id) throw new Error('Task status not found.');

//       // Update review status
//       const newReviewStatus = [...(status.review_status || []), {
//         status: 'R',
//         role: user?.role || 'Treasurer',
//         reviewer: user?.email || user?.id,
//         comment: rejectComment,
//         timestamp: new Date().toISOString()
//       }];

//       // Update database
//       const { error: dbError } = await supabase
//         .from('treasurer_main')
//         .update({
//           status: 'rejected',
//           review_status: newReviewStatus,
//           current_reviewer: null,
//           finalApproved: false
//         })
//         .eq('id', status.id);

//       if (dbError) throw new Error(`Database update failed: ${dbError.message}`);

//       // Add comment if provided
//       if (rejectComment.trim()) {
//         await insertTaskComment(
//           status.id,
//           'R',
//           rejectComment,
//           user?.role || 'Treasurer',
//           user?.email || user?.id
//         );
//       }

//       // Update local state
//       setTaskStatus((prev) => ({
//         ...prev,
//         [rejectingTask]: {
//           ...prev[rejectingTask],
//           status: 'rejected',
//           review_status: newReviewStatus,
//           current_reviewer: null,
//           finalApproved: false
//         },
//       }));

//       setRejectingTask(null);
//       setRejectComment('');
      
//       // Show processing state and auto-refresh after 1 second
//       setIsProcessingAction(true);
//       await fetchEventDetailsAndTaskStatus();
//       setIsProcessingAction(false);
//     } catch (err) {
//       console.error('Reject error:', err);
//       alert(`Failed to reject task: ${err.message}`);
//     } finally {
//       setIsRejecting(false);
//     }
//   };

//   // Handle file selection for upload
//   // Handle upload from TaskUploadModal
//   const handleTaskUpload = async (uploadData) => {
//     if (!currentUploadTask) return;
    
//     setIsUploading(true);
//     setUploadError(null);
    
//     try {
//       // Get task_id from the task in context
//       const taskDef = finalTaskList.find(t => {
//         const taskName = t.task_name || t.title || t.name;
//         return taskName === currentUploadTask.task_name;
//       });
//       if (!taskDef) throw new Error('Task definition not found.');
//       const taskId = taskDef.task_id;
//       const taskName = currentUploadTask.task_name;
//       console.log('🔍 DEBUG - Upload task details:', { taskId, taskName, currentUploadTask, taskDef });
      
//       // Determine folder based on task type
//       let folder = '';
//       if (taskName.toLowerCase().includes('tentative budget plan')) folder = 'tent_budget';
//       else if (taskName.toLowerCase().includes('final budget report')) folder = 'final_budget';
//       else folder = 'misc';
//       const bucket = 'treasurer';
//       console.log('DEBUG: taskId:', taskId);
//       console.log('DEBUG: folder:', folder);
//       console.log('DEBUG: bucket:', bucket);
      
//       // Get event info for folder creation
//       const { data: eventData, error: eventError } = await supabase
//         .from('events')
//         .select('event_name')
//         .eq('id', eventId)
//         .single();
//       if (eventError || !eventData) {
//         console.error('Supabase eventError:', eventError);
//         throw new Error('Failed to fetch event name.');
//       }
      
//       if (!eventData.event_name) {
//         throw new Error('Event information not loaded. Please refresh the page and try again.');
//       }
      
//       const eventFolder = `${eventData.event_name.replace(/\s+/g, '_')}_${eventId}`;
//       console.log('DEBUG: eventFolder:', eventFolder);
      
//       let fileLinkArr = [];
//       let finalFileName = null;
//       let finalFilePath = null;
      
//       // Handle different upload data types
//       if (uploadData.files && uploadData.files.length > 0) {
//         // Handle file uploads
//         for (let i = 0; i < uploadData.files.length; i++) {
//           const file = uploadData.files[i];
//           const ext = file.name.split('.').pop();
//           const base = `${eventId}_${taskId}`;
//           let currentFileName = `${base}_${i + 1}.${ext}`;
//           let currentFilePath = `${folder}/${eventFolder}/${currentFileName}`;
          
//           // Check if this is a reupload
//           const isReupload = taskStatus[taskName]?.status === 'rejected';
//           if (isReupload) {
//             currentFileName = `reuploaded_${currentFileName}`;
//             currentFilePath = `${folder}/${eventFolder}/${currentFileName}`;
//           }
          
//           // Ensure no overwrite
//           let counter = 1;
//           while (true) {
//             const { data: existingFiles, error: listError } = await supabase.storage.from(bucket).list(`${folder}/${eventFolder}`, { search: currentFileName });
//             if (listError) throw new Error('Failed to check for existing files.');
//             if (!existingFiles || !existingFiles.find(f => f.name === currentFileName)) break;
//             currentFileName = `${base}_${i + 1}_${counter++}.${ext}`;
//             if (isReupload) {
//               currentFileName = `reuploaded_${currentFileName}`;
//             }
//             currentFilePath = `${folder}/${eventFolder}/${currentFileName}`;
//           }
          
//           console.log('DEBUG: Uploading to path:', currentFilePath);
          
//           // Implement retry mechanism with timeout for file upload
//           const uploadWithRetry = async (filePath, fileData, maxRetries = 3) => {
//             let lastError;
//             for (let attempt = 1; attempt <= maxRetries; attempt++) {
//               try {
//                 console.log(`Upload attempt ${attempt}/${maxRetries} for file: ${fileData.name}`);
                
//                 // Create abort controller for timeout
//                 const controller = new AbortController();
//                 const timeoutId = setTimeout(() => {
//                   controller.abort();
//                   console.log('Upload timeout reached');
//                 }, 120000); // 2 minutes timeout
                
//                 // Upload with timeout
//                 const uploadPromise = supabase.storage.from(bucket).upload(filePath, fileData, {
//                   cacheControl: '3600',
//                   upsert: false
//                 });
                
//                 const result = await Promise.race([
//                   uploadPromise,
//                   new Promise((_, reject) => {
//                     controller.signal.addEventListener('abort', () => {
//                       reject(new Error('Upload timeout'));
//                     });
//                   })
//                 ]);
                
//                 clearTimeout(timeoutId);
//                 return result;
//               } catch (error) {
//                 lastError = error;
//                 console.error(`Upload attempt ${attempt} failed:`, error.message);
                
//                 if (attempt < maxRetries) {
//                   // Wait before retry (exponential backoff)
//                   const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
//                   console.log(`Retrying in ${delay}ms...`);
//                   await new Promise(resolve => setTimeout(resolve, delay));
//                 } else {
//                   throw new Error(`File upload failed for ${fileData.name} after ${maxRetries} attempts: ${error.message}`);
//                 }
//               }
//             }
//           };
          
//           const { error: uploadError } = await uploadWithRetry(currentFilePath, file);
//           if (uploadError) throw new Error(`File upload failed for ${file.name}: ${uploadError.message}`);
          
//           const publicUrl = `https://pfitttbkoyglznojhozc.supabase.co/storage/v1/object/public/${bucket}/${folder}/${eventFolder}/${currentFileName}`;
//           fileLinkArr.push({ name: currentFileName, url: publicUrl });
          
//           finalFileName = currentFileName;
//           finalFilePath = currentFilePath;
//         }
//       } else if (uploadData.links && uploadData.links.length > 0) {
//         // Handle link uploads
//         fileLinkArr = uploadData.links;
//       } else if (uploadData.tableData) {
//         // Handle table data uploads
//         // Store table data in the database
//         console.log('DEBUG: Uploading table data:', uploadData.tableData);
//       }
      
//       // Get event name for database insert
//       const { data: eventData2, error: eventError2 } = await supabase
//         .from('events')
//         .select('event_name')
//         .eq('id', eventId)
//         .single();
      
//       if (eventError2 || !eventData2) {
//         throw new Error('Failed to fetch event name for database insert.');
//       }

//       // Check for existing row for this task/event (updated to handle reuploaded tasks)
//       const { data: existingRows, error: existingError } = await supabase
//         .from('treasurer_main')
//         .select('id, review_status, status')
//         .eq('event_id', eventId)
//         .eq('task_name', taskName);
//       if (existingError) throw new Error('Failed to check for existing rows.');

//       // Fetch review_role for this task
//       const { data: taskDef2, error: taskError } = await supabase
//         .from('tasks')
//         .select('review_role')
//         .eq('task_id', taskId)
//         .single();
//       if (taskError || !taskDef2) throw new Error('Task definition not found.');
//       const reviewRoleArr = Array.isArray(taskDef2.review_role) ? taskDef2.review_role : [];
//       const firstReviewer = reviewRoleArr[0] || null;

//       // Preserve previous review_status for reupload (like Secretary)
//       let prevReviewStatus = [];
//       if (existingRows && existingRows.length > 0) {
//         const existingRow = existingRows[0];
//         if (existingRow.review_status && Array.isArray(existingRow.review_status)) {
//           prevReviewStatus = existingRow.review_status;
//         }
//       }

//       if (existingRows && existingRows.length > 0) {
//               // Update existing row (handles both rejected and reuploaded tasks)
//       console.log('[Treasurer] Updating existing row with current_reviewer:', firstReviewer);
//       const { error: updateError } = await supabase
//         .from('treasurer_main')
//         .update({
//           file_link: fileLinkArr,
//           table_data: uploadData.tableData || null,
//           status: 'pending',
//           current_reviewer: firstReviewer,
//           review_status: prevReviewStatus, // preserve for reupload
//           uploaded_at: new Date().toISOString()
//         })
//         .eq('id', existingRows[0].id);
//       if (updateError) throw new Error(`Database update failed: ${updateError.message}`);
//       } else {
//         // Insert new row
//         console.log('[Treasurer] Inserting new row with current_reviewer:', firstReviewer);
//         const { error: insertError } = await supabase
//           .from('treasurer_main')
//           .insert({
//             event_id: eventId,
//             event_name: eventData2.event_name,
//             task_id: taskId,
//             task_name: taskName,
//             file_link: fileLinkArr,
//             table_data: uploadData.tableData || null,
//             status: 'pending',
//             current_reviewer: firstReviewer,
//             review_status: [],
//             uploaded_at: new Date().toISOString()
//           });
//         if (insertError) throw new Error(`Database insert failed: ${insertError.message}`);
//       }

//       // Update local task status immediately for UI responsiveness
//       setTaskStatus((prev) => ({
//         ...prev,
//         [taskName]: {
//           ...prev[taskName],
//           status: 'pending',
//           file_link: fileLinkArr,
//           table_data: uploadData.tableData || null,
//           current_reviewer: firstReviewer,
//           uploaded_at: new Date().toISOString()
//         },
//       }));
      
//       // Refresh task status to ensure UI updates correctly
//       await fetchEventDetailsAndTaskStatus();
      
//       // Debug: Check if the task was actually stored in the database
//       const { data: checkData, error: checkError } = await supabase
//         .from('treasurer_main')
//         .select('*')
//         .eq('event_id', eventId)
//         .eq('task_name', taskName);
//       console.log('🔍 DEBUG - After upload, checking DB for task:', taskName, 'Found:', checkData);
      
//       alert('Files uploaded successfully! Task status updated to pending.');
      
//       // Close modal
//       setShowUploadModal(false);
//       setCurrentUploadTask(null);
//     } catch (err) {
//       console.error('Upload error:', err);
//       setUploadError(err.message);
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   // Handle file download
//   const handleDownload = async (taskTitle) => {
//     try {
//       const status = taskStatus[taskTitle];
//       if (!status) throw new Error('No task status found for this task.');

//       // Handle file_link which might be a JSON string or already parsed array
//       let downloadUrl = null;
//       let fileName = null;

//       if (status?.file_link) {
//         let parsedFileLink;
//         try {
//           // Try to parse as JSON if it's a string
//           parsedFileLink = typeof status.file_link === 'string' ? JSON.parse(status.file_link) : status.file_link;
//         } catch (e) {
//           // If parsing fails, treat as single file URL
//           parsedFileLink = status.file_link;
//         }
        
//         if (Array.isArray(parsedFileLink) && parsedFileLink.length > 0) {
//           // Use the first file for download
//           downloadUrl = parsedFileLink[0].url;
//           fileName = parsedFileLink[0].name || 'file';
//         } else if (typeof parsedFileLink === 'string') {
//           downloadUrl = parsedFileLink;
//           fileName = parsedFileLink.split('/').pop() || 'file';
//         }
//       } else if (status?.downloadUrl) {
//         downloadUrl = status.downloadUrl;
//         fileName = status.filePath?.split('/').pop() || 'file';
//       }

//       if (!downloadUrl) throw new Error('No file URL found for this task.');

//       const response = await fetch(downloadUrl);
//       const blob = await response.blob();
//       const blobUrl = URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = blobUrl;
//       link.download = `${taskTitle}-${fileName}`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       URL.revokeObjectURL(blobUrl);
//     } catch (err) {
//       alert(`Download failed: ${err.message}`);
//     }
//   };

//   // Handle file removal for Treasurer
//   const handleRemove = async (taskTitle) => {
//     try {
//       const status = taskStatus[taskTitle];
//       console.log('🔍 DEBUG - Removing task:', taskTitle, 'Status:', status);
      
//       // Handle file_link which might be a JSON string or already parsed array
//       let filesToRemove = [];
      
//       if (status?.file_link) {
//         let parsedFileLink;
//         try {
//           // Try to parse as JSON if it's a string
//           parsedFileLink = typeof status.file_link === 'string' ? JSON.parse(status.file_link) : status.file_link;
//         } catch (e) {
//           // If parsing fails, treat as single file URL
//           parsedFileLink = status.file_link;
//         }
        
//         if (Array.isArray(parsedFileLink)) {
//           // Extract file paths from file_link array
//           filesToRemove = parsedFileLink.map(file => {
//             if (file.url && file.url.startsWith('http')) {
//               const urlParts = file.url.split('/');
//               const bucketIdx = urlParts.findIndex(p => p === 'treasurer');
//               if (bucketIdx !== -1) {
//                 return urlParts.slice(bucketIdx + 1).join('/');
//               }
//             }
//             return null;
//           }).filter(Boolean);
//         } else if (typeof parsedFileLink === 'string' && parsedFileLink.startsWith('http')) {
//           // Handle string URL format
//           const urlParts = parsedFileLink.split('/');
//           const bucketIdx = urlParts.findIndex(p => p === 'treasurer');
//           if (bucketIdx !== -1) {
//             filesToRemove = [urlParts.slice(bucketIdx + 1).join('/')];
//           }
//         }
//       } else if (status?.filePath) {
//         // Fallback for old format
//         let filePath = status.filePath;
//         if (filePath.startsWith('http')) {
//           const urlParts = filePath.split('/');
//           const bucketIdx = urlParts.findIndex(p => p === 'treasurer');
//           if (bucketIdx !== -1) {
//             filePath = urlParts.slice(bucketIdx + 1).join('/');
//           }
//         }
//         filesToRemove = [filePath];
//       }
      
//       console.log('🔍 DEBUG - Files to remove:', filesToRemove);
      
//       if (filesToRemove.length === 0) {
//         console.warn('No files to remove from storage');
//       } else {
//         // 1. Remove files from Supabase storage (bucket 'treasurer')
//         const { error: storageError } = await supabase.storage.from('treasurer').remove(filesToRemove);
//         if (storageError) {
//           console.error('Storage removal error:', storageError);
//           throw new Error('Failed to remove files from storage.');
//         }
//         console.log('🔍 DEBUG - Files removed from storage successfully');
//       }

//       // 2. Remove row from treasurer_main for this event/task
//       const { error: dbError } = await supabase
//         .from('treasurer_main')
//         .delete()
//         .eq('event_id', eventId)
//         .eq('task_name', taskTitle);
//       if (dbError) throw new Error('Failed to remove row from treasurer_main.');

//       // 3. Update taskStatus so task returns to My Tasks
//       setTaskStatus((prev) => ({
//         ...prev,
//         [taskTitle]: {
//           ...prev[taskTitle],
//           filePath: null,
//           downloadUrl: null,
//           file_link: null,
//           status: null,
//         },
//       }));
      
//       // 4. Refresh the task status to ensure UI updates
//       await fetchEventDetailsAndTaskStatus();
      
//       alert('Files and task removed successfully.');
//     } catch (err) {
//       console.error('Remove error:', err);
//       alert(`Failed to remove files: ${err.message}`);
//     }
//   };

//   // Add state for myTasks
//   const [myTasks, setMyTasks] = useState([]);

//   // Filter tasks for Treasurer
//   useEffect(() => {
//     if (!finalTaskList.length) return; // Don't filter until tasks are loaded
    
//     const filteredMyTasks = finalTaskList.filter((task) => {
//       // Handle roles field - it might be a string that needs to be parsed
//       let roles = task.roles;
//       if (typeof roles === 'string') {
//         try {
//           roles = JSON.parse(roles);
//         } catch {
//           roles = [roles]; // If it's a single string, make it an array
//         }
//       }
      
//       // Check if Treasurer is in the roles array
//       const hasTreasurerRole = Array.isArray(roles) && roles.includes('Treasurer');
//       const taskName = task.task_name || task.title || task.name;
//       const status = taskStatus[taskName] || {};
      
//       // Task should be in "My Tasks" if:
//       // 1. Treasurer role is assigned to this task
//       // 2. Task is NOT uploaded (no status) OR is rejected
//       // 3. Task is NOT pending (pending tasks go to "Uploaded by Me")
//       const isNotUploaded = !status.status || status.status === 'rejected';
//       const isNotPending = status.status !== 'pending';
      
//       return hasTreasurerRole && isNotUploaded && isNotPending;
//     });
    
//     setMyTasks(filteredMyTasks);
//   }, [finalTaskList, taskStatus]);



//   // Update pendingReviews to only include tasks where current_reviewer matches user.role
//   useEffect(() => {
//     if (!finalTaskList.length) return; // Don't filter until tasks are loaded
    
//     const filteredPendingReviews = finalTaskList.filter((task) => {
//       const taskName = task.task_name || task.title || task.name;
//       const status = taskStatus[taskName] || {};
//       return (
//         status.status === 'pending' &&
//         status.current_reviewer &&
//         user?.role &&
//         status.current_reviewer === user.role
//       );
//     });
//     setPendingReviews(filteredPendingReviews);
//   }, [finalTaskList, taskStatus, user?.role]);

//   // Add Approved and Rejected sections in the UI


//   useEffect(() => {
//     if (!finalTaskList.length) return; // Don't filter until tasks are loaded
    
//     const filteredRejectedTasks = finalTaskList.filter((task) => {
//       const taskName = task.task_name || task.title || task.name;
//       return taskStatus[taskName]?.status === 'rejected';
//     });
//     setRejectedTasks(filteredRejectedTasks);
//   }, [finalTaskList, taskStatus]);

//   // Defensive fix for Uploaded by Me
//   useEffect(() => {
//     if (!finalTaskList.length) return;
//     setUploadedByYou([]);
//     setTimeout(() => {
//     const filteredUploadedByYou = finalTaskList.filter((task) => {
//       const taskName = task.task_name || task.title || task.name;
//       const status = taskStatus[taskName] || {};
//         // Show tasks that have status 'pending' or 'approved'
//         return status.status === 'pending' || status.status === 'approved';
//       });
//     setUploadedByYou(filteredUploadedByYou);
//     }, 0);
//   }, [finalTaskList, taskStatus]);

//   // Fetch rejected tasks for 'My Tasks' (status == 'rejected')
//   useEffect(() => {
//     async function fetchRejectedTreasurerTasks() {
//       if (!eventId) return;
//       const { data, error } = await supabase
//         .from('treasurer_main')
//         .select('*')
//         .eq('event_id', eventId)
//         .eq('status', 'rejected'); // removed .eq('current_reviewer', null) for consistency
//       if (!error && Array.isArray(data)) {
//         // Find rejector from review_status array (last entry with status 'R')
//         const enhanced = data.map(row => {
//           let rejectedBy = null;
//           if (Array.isArray(row.review_status)) {
//             const lastRej = [...row.review_status].reverse().find(r => r.status === 'R');
//             if (lastRej) rejectedBy = lastRej.role || lastRej.reviewer || null;
//           }
//           return { ...row, rejectedBy };
//         });
//         setRejectedTreasurerTasks(enhanced);
//       } else {
//         setRejectedTreasurerTasks([]);
//       }
//     }
//     fetchRejectedTreasurerTasks();
//   }, [eventId]);

//   // Loading spinner component
//   const LoadingSpinner = () => (
//     <div className="flex justify-center items-center h-screen">
//       <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
//     </div>
//   );

//   // Handle section change with URL navigation
//   const handleSectionChange = (newSection) => {
//     setSection(newSection);
//     navigate(`/event-tasks/${eventId}/treasurer/${newSection}`);
//   };

//   // Helper function to navigate to specific event tasks
//   const navigateToEventTasks = (eventId, section) => {
//     navigate(`/event-tasks/${eventId}/treasurer/${section}`);
//   };

//   // In Treasurer component, get user role
//   const userRole = user?.role;

//   // Add state for view modals
//   const [showFilesModal, setShowFilesModal] = useState(false);
//   const [modalFiles, setModalFiles] = useState([]);
//   const [modalTitle, setModalTitle] = useState('');
//   const [showTableModal, setShowTableModal] = useState(false);
//   const [showLinksModal, setShowLinksModal] = useState(false);
//   const [viewLinks, setViewLinks] = useState([]);
//   const [viewLinksTitle, setViewLinksTitle] = useState('');

//   // Add state for multi-file upload modal (for format template tasks)
//   const [showMultiFileUploadDialog, setShowMultiFileUploadDialog] = useState(false);
//   const [multiFileUploadFiles, setMultiFileUploadFiles] = useState([]);
//   const [multiFileUploadTask, setMultiFileUploadTask] = useState(null);
//   const [isMultiFileUploading, setIsMultiFileUploading] = useState(false);
//   const fileInputRef = useRef(null);

//   // Handle view click for different formats
//   const handleViewClick = (task) => {
//     const status = taskStatus[task.task_name];
//     if (!status) return;

//     // Parse data_format to determine view type
//     let dataFormat = task.data_format;
//     if (typeof dataFormat === 'string') {
//       try {
//         dataFormat = JSON.parse(dataFormat);
//       } catch {
//         dataFormat = null;
//       }
//     }

//     // Handle format template tasks (check both data_format and template field)
//     if ((dataFormat && dataFormat.doc_type === 'template') || task.template === 'Yes') {
//       setMultiFileUploadTask(task);
//       setMultiFileUploadFiles([]);
//       setShowMultiFileUploadDialog(true);
//       return;
//     }

//     // Handle table format
//     if (dataFormat && dataFormat.doc_type === 'table') {
//       setShowTableModal(true);
//       return;
//     }

//     // Handle link format
//     if (dataFormat && dataFormat.doc_type === 'link') {
//       setViewLinks(status.link_holder || []);
//       setViewLinksTitle(task.task_name);
//       setShowLinksModal(true);
//       return;
//     }

//     // Handle multi-file format
//     if (dataFormat && dataFormat.doc_type === 'multi_file') {
//       if (Array.isArray(status.file_link)) {
//         setModalFiles(status.file_link);
//       } else if (typeof status.file_link === 'string') {
//         setModalFiles([{ name: 'File', url: status.file_link }]);
//       }
//       setModalTitle(task.task_name);
//       setShowFilesModal(true);
//       return;
//     }

//     // Default: single file view
//     if (status.file_link) {
//       if (Array.isArray(status.file_link)) {
//         setModalFiles(status.file_link);
//       } else {
//         setModalFiles([{ name: 'File', url: status.file_link }]);
//       }
//       setModalTitle(task.task_name);
//       setShowFilesModal(true);
//     }
//   };

//   // Multi-file upload handlers
//   const handleMultiFileDrop = (e) => {
//     e.preventDefault();
//     const files = Array.from(e.dataTransfer.files);
//     setMultiFileUploadFiles((prev) => [...prev, ...files]);
//   };

//   const handleMultiFileSelect = (e) => {
//     const files = Array.from(e.target.files);
//     setMultiFileUploadFiles((prev) => [...prev, ...files]);
//   };

//   const handleRemoveMultiFile = (idx) => {
//     setMultiFileUploadFiles((prev) => prev.filter((_, i) => i !== idx));
//   };

//   const handleMultiFileUpload = async () => {
//     if (!multiFileUploadTask || multiFileUploadFiles.length === 0) return;
    
//     setIsMultiFileUploading(true);
//     try {
//       // Get task details
//       const { data: taskRow, error: taskError } = await supabase
//         .from('tasks')
//         .select('task_id, task_name, review_role')
//         .eq('task_name', multiFileUploadTask.task_name)
//         .single();
      
//       if (taskError || !taskRow) throw new Error('Task not found in tasks table.');

//       // Parse review_role array
//       let reviewRoleArr = [];
//       if (Array.isArray(taskRow.review_role)) {
//         reviewRoleArr = taskRow.review_role;
//       } else if (typeof taskRow.review_role === 'string') {
//         try {
//           reviewRoleArr = JSON.parse(taskRow.review_role);
//         } catch {
//           reviewRoleArr = [];
//         }
//       }
//       const firstReviewer = reviewRoleArr.length > 0 ? reviewRoleArr[0] : null;

//       // Get event details
//       const { data: eventRow, error: eventError } = await supabase
//         .from('events')
//         .select('id, event_name')
//         .eq('id', eventId)
//         .single();
      
//       if (eventError || !eventRow) throw new Error('Event not found in events table.');

//       // Create event folder structure
//       const eventFolder = `${eventRow.event_name.replace(/\s+/g, '_')}_${eventId}`;
//       const bucket = 'treasurer';
      
//       // Upload all files
//       const uploadedFiles = [];
      
//       for (const file of multiFileUploadFiles) {
//         const ext = file.name.split('.').pop();
//         const base = `${eventId}_${taskRow.task_id}`;
//         let finalFileName = `${base}_${uploadedFiles.length + 1}.${ext}`;
//         let finalFilePath = `templates/${eventFolder}/${finalFileName}`;

//         // Ensure no overwrite
//         let counter = 1;
//         while (true) {
//           const { data: existingFiles, error: listError } = await supabase.storage
//             .from(bucket)
//             .list(`templates/${eventFolder}`);
          
//           if (listError) throw new Error('Failed to check for existing files.');
//           if (!existingFiles.some((f) => f.name === finalFileName)) break;
          
//           finalFileName = `${base}_${uploadedFiles.length + 1}_${counter++}.${ext}`;
//           finalFilePath = `templates/${eventFolder}/${finalFileName}`;
//         }

//         // Upload file
//         const { error: uploadError } = await supabase.storage
//           .from(bucket)
//           .upload(finalFilePath, file);
        
//         if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);
        
//         const publicUrl = `https://pfitttbkoyglznojhozc.supabase.co/storage/v1/object/public/${bucket}/${finalFilePath}`;
//         uploadedFiles.push({
//           name: file.name,
//           url: publicUrl
//         });
//       }

//       // Insert into treasurer_main table
//       const { error: insertError } = await supabase
//         .from('treasurer_main')
//         .insert({
//           event_id: eventRow.id,
//           event_name: eventRow.event_name,
//           task_id: taskRow.task_id,
//           task_name: taskRow.task_name,
//           file_link: uploadedFiles,
//           status: 'pending',
//           uploaded_at: new Date().toISOString(),
//           current_reviewer: firstReviewer,
//           review_status: [],
//         });
      
//       if (insertError) throw new Error('Failed to insert into treasurer_main table: ' + insertError.message);
      
//       // Update UI
//       setTaskStatus((prev) => ({
//         ...prev,
//         [multiFileUploadTask.task_name]: {
//           ...prev[multiFileUploadTask.task_name],
//           uploaded: true,
//           status: 'pending',
//           filePath: `templates/${eventFolder}`,
//           downloadUrl: uploadedFiles,
//         },
//       }));
      
//       // Close modal and reset
//       setShowMultiFileUploadDialog(false);
//       setMultiFileUploadFiles([]);
//       setMultiFileUploadTask(null);
      
//       // Refresh data
//       await fetchEventDetailsAndTaskStatus();
      
//     } catch (err) {
//       console.error('Multi-file upload error:', err);
//       alert('Failed to upload files: ' + err.message);
//     } finally {
//       setIsMultiFileUploading(false);
//     }
//   };

//   // If no eventId, render dashboard view
//   if (!eventId) {
//     return (
//       <div className="px-4 py-6 space-y-6">
//         {/* Welcome Section */}
//         <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 sm:p-6 text-white">
//           <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {user?.disp_name}!</h1>
//           <p className="text-blue-100 mt-2 text-sm sm:text-base">
//             Here's what's happening with your club activities today.
//           </p>
//         </div>
//         {/* Analytics Cards */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
//           {dashboardStats.map((stat, index) => (
//             <Card 
//               key={index} 
//               className="hover:shadow-lg transition-shadow cursor-pointer"
//               onClick={stat.clickHandler}
//             >
//               <CardContent className="p-4 sm:p-6">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.title}</p>
//                     <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
//                   </div>
//                   <div className={`p-2 sm:p-3 rounded-full bg-gray-100 ${stat.color}`}>
//                     <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//         {/* All Events List */}
//         <AllEventsList 
//           roleType="treasurer"
//           roleTable="treasurer_main"
//           userRole="Treasurer"
//           onNavigateToEventTasks={navigateToEventTasks}
//         />
//         {/* Upcoming Events */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="text-base sm:text-lg">Upcoming Events</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-2">
//               {upcomingEvents.length === 0 && (
//                 <div className="text-gray-500 text-sm sm:text-base">No upcoming events.</div>
//               )}
//               {upcomingEvents.map((event) => (
//                 <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
//                   <div className="flex flex-col">
//                     <span className="font-medium text-sm sm:text-base">{event.event_name}</span>
//                     <span className="text-xs text-gray-500">Starts: {event.start_date}</span>
//                   </div>
//                   <Badge variant={event.soonLabel === 'Today' ? 'destructive' : 'outline'} className="text-xs">{event.soonLabel}</Badge>
//                 </div>
//               ))}
//             </div>
//           </CardContent>
//         </Card>
//         {/* Quick Actions */}
//         <Card>
//           <CardHeader>
//             <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
//               <Button 
//                 variant="outline" 
//                 className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm"
//                 onClick={() => navigate('/events')}
//               >
//                 <FileText className="h-4 w-4 sm:h-6 sm:w-6" />
//                 <span className="hidden sm:inline">View Events</span>
//                 <span className="sm:hidden">Events</span>
//               </Button>
//               <Button 
//                 variant="outline" 
//                 className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm"
//                 onClick={() => navigate('/events')}
//               >
//                 <Users className="h-4 w-4 sm:h-6 sm:w-6" />
//                 <span className="hidden sm:inline">Event Tasks</span>
//                 <span className="sm:hidden">Tasks</span>
//               </Button>
//               <Button 
//                 variant="outline" 
//                 className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm"
//                 onClick={() => navigate('/events')}
//               >
//                 <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6" />
//                 <span className="hidden sm:inline">Event Overview</span>
//                 <span className="sm:hidden">Overview</span>
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   // Main render
//   return (
//     <>
//       {/* Processing Overlay */}
//       {isProcessingAction && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
//             <div className="flex items-center space-x-3">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//               <div>
//                 <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Processing...</p>
//                 <p className="text-sm text-gray-600 dark:text-gray-400">Please wait while we update the system</p>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {isLoading ? (
//         <LoadingSpinner />
//       ) : (
//         <div className="p-3 sm:p-6 animate-fade-in">
//           <div className="mb-4">
//             <Button variant="outline" onClick={() => navigate('/events')} className="text-sm sm:text-base">
//               Back to Events
//             </Button>
//           </div>

//           {/* Enhanced Event Header Component */}
//           <EnhancedEventHeader
//             eventInfo={eventInfo}
//             roleName="Treasurer"
//             roleColor="green"
//             showStats={true}
//             stats={{
//               myTasks: myTasks.length,
//               uploaded: uploadedByYou.length,
//               pendingReviews: pendingReviews.length,
//               rejected: rejectedTasks.length
//             }}
//           />

//           {/* Enhanced Navigation */}
//           <div className="mb-6">
//             <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
//               <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
//                 <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//                 Navigation
//               </h3>
//               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
//                 <Button 
//                   variant={section === 'mytasks' ? 'default' : 'outline'} 
//                   onClick={() => handleSectionChange('mytasks')}
//                   className={`h-12 text-sm sm:text-base ${section === 'mytasks' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
//                 >
//                   <FileText className="h-4 w-4 mr-1 sm:mr-2" />
//                   <span className="hidden sm:inline">My Tasks</span>
//                   <span className="sm:hidden">Tasks</span>
//                 </Button>
//                 <Button 
//                   variant={section === 'uploaded' ? 'default' : 'outline'} 
//                   onClick={() => handleSectionChange('uploaded')}
//                   className={`h-12 text-sm sm:text-base ${section === 'uploaded' ? 'bg-green-600 hover:bg-green-700' : ''}`}
//                 >
//                   <CheckCircle className="h-4 w-4 mr-1 sm:mr-2" />
//                   <span className="hidden sm:inline">Uploaded</span>
//                   <span className="sm:hidden">Uploaded</span>
//                 </Button>
//                 <Button 
//                   variant={section === 'reviews' ? 'default' : 'outline'} 
//                   onClick={() => handleSectionChange('reviews')}
//                   className={`h-12 text-sm sm:text-base ${section === 'reviews' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
//                 >
//                   <Clock className="h-4 w-4 mr-1 sm:mr-2" />
//                   <span className="hidden sm:inline">Reviews</span>
//                   <span className="sm:hidden">Reviews</span>
//                 </Button>
//               </div>
//             </div>
//           </div>

//           {section === 'mytasks' && (
//             <div>
//               <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">My Tasks</h2>
//               {/* Show tasks with proper handling for rejected tasks */}
//               {myTasks.length > 0 && myTasks.map((task, index) => {
//                 const taskName = task.task_name || task.title || task.name;
//                 const status = taskStatus[taskName];
                
//                 // Use RejectedTaskHandler for rejected tasks in My Tasks (like other roles)
//                 if (status?.status === 'rejected') {
//                   // Create a combined task object that includes both task definition and status information
//                   const combinedTask = {
//                     ...task, // Include task definition (task_id, task_name, desc, etc.)
//                     ...status, // Include status information (event_id, event_name, file_link, etc.)
//                     event_id: status?.event_id || eventInfo?.event_id,
//                     event_name: status?.event_name || eventInfo?.event_name,
//                     task_name: taskName, // Ensure task_name comes from task definition
//                     task_uuid: status?.id, // Ensure task_uuid is set for comment fetching
//                     id: status?.id // Also set id for compatibility
//                   };
                  
//                   return (
//                     <RejectedTaskHandler
//                       key={index}
//                       task={combinedTask}
//                       status={status}
//                       onDownloadClick={handleDownload}
//                       onReuploadClick={(task, comment) => handleReupload(task, comment)}
//                       role="Treasurer"
//                       taskName={taskName}
//                       tableData={status?.table_data || task?.table_data}
//                     />
//                   );
//                 }
                
//                 // Use TaskRow for non-rejected tasks
//                 return (
//                   <TaskRow
//                     key={index}
//                     task={task}
//                     status={status}
//                     onUploadClick={(task) => {
//                       setCurrentUploadTask({ task_name: task.task_name || task.title || task.name });
//                       setShowUploadModal(true);
//                     }}
//                     onApproveClick={handleApprove}
//                     onRejectClick={handleReject}
//                     isReview={false}
//                     locked={eventInfo?.locked}
//                     user={user}
//                     currentReviewer={status?.current_reviewer}
//                   />
//                 );
//               })}
//               {/* If empty, show no tasks message */}
//               {myTasks.length === 0 && (
//                 <div className="min-h-[300px] sm:min-h-[400px] flex items-center justify-center">
//                   <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">No tasks assigned to you.</p>
//                 </div>
//               )}
//             </div>
//           )}

//           {section === 'uploaded' && (
//             <div>
//               <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Uploaded by Me</h2>
//               {uploadedByYou.length > 0 ? (
//                 uploadedByYou.map((task, index) => (
//                   <UploadedTaskRow
//                     key={index}
//                     task={task}
//                     status={{
//                       ...taskStatus[task.task_name || task.title || task.name],
//                       task_name: task.task_name || task.title || task.name,
//                       task_id: task.task_id || task.id
//                     }}
//                     onDownloadClick={handleDownload}
//                     onRemoveClick={handleRemove}
//                     onUploadClick={handleReupload}
//                     locked={eventInfo?.locked}
//                   />
//                 ))
//               ) : (
//                 <div className="min-h-[300px] sm:min-h-[400px] flex items-center justify-center">
//                   <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">No tasks uploaded by you.</p>
//                 </div>
//               )}
//             </div>
//           )}

//           {section === 'reviews' && (
//             <div>
//               <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Pending Reviews</h2>
//               <PendingReviewsSection
//                 sections={(() => {
//                   // Group tasks by actual sender role using table information
//                   const groupedTasks = {};
//                   pendingReviews.forEach(task => {
//                     const senderRole = task.tableName ? getSenderRoleFromTable(task.tableName) : 'Unknown Role';
//                     if (!groupedTasks[senderRole]) {
//                       groupedTasks[senderRole] = [];
//                     }
//                     groupedTasks[senderRole].push(task);
//                   });

//                   // Convert grouped tasks to sections format
//                   const sections = Object.entries(groupedTasks).map(([role, tasks], index) => ({
//                     key: `section-${index}`,
//                     title: `From ${role}`,
//                     badgeColor: 'bg-green-100 text-green-800',
//                     tasks: tasks,
//                     taskProps: {}
//                   }));

//                   return sections;
//                 })()}
//                 onDownloadClick={handleDownload}
//                 onRemoveClick={handleRemove}
//                 onApproveClick={handleApprove}
//                 onRejectClick={handleReject}
//                 isLocked={eventInfo?.locked}
//                 UploadedTaskRowComponent={UploadedTaskRow}
//               />
//             </div>
//           )}



//           {section === 'rejected' && (
//             {/* Rejected section removed as per requirements */}
//           )}

//           {/* Task Upload Modal */}
//           <TaskUploadModal
//             isOpen={showUploadModal}
//             onClose={() => {
//               setShowUploadModal(false);
//               setCurrentUploadTask(null);
//               setUploadError(null);
//             }}
//             task={currentUploadTask}
//             onUpload={handleTaskUpload}
//             isUploading={isUploading}
//             uploadError={uploadError}
//             bucket="treasurer"
//             role="treasurer"
//           />

//           {/* Files Modal */}
//           <Dialog open={showFilesModal} onOpenChange={setShowFilesModal}>
//             <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
//               <DialogHeader>
//                 <DialogTitle className="text-base sm:text-lg">Files for: {modalTitle}</DialogTitle>
//               </DialogHeader>
//               <div className="space-y-3 sm:space-y-4" style={modalFiles.length > 5 ? { maxHeight: 350, overflowY: 'auto' } : {}}>
//                 {(!modalFiles || modalFiles.length === 0) ? (
//                   <div className="text-gray-500 text-sm sm:text-base">No files uploaded.</div>
//                 ) : (
//                   modalFiles.map((file, idx) => {
//                     const type = getFileType(file.url);
//                     return (
//                       <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 border rounded">
//                         <span className="flex-1 break-all text-xs sm:text-sm">{file.name || file.url.split('/').pop()}</span>
//                         <div className="flex gap-1 sm:gap-2">
//                           <Button size="sm" variant="outline" onClick={() => {
//                             if (type === 'office') {
//                               window.open(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(file.url)}`, '_blank');
//                             } else if (type === 'pdf' || type === 'image') {
//                               window.open(file.url, '_blank');
//                             } else {
//                               window.open(file.url, '_blank');
//                             }
//                           }} className="text-xs sm:text-sm">View</Button>
//                           <Button size="sm" variant="ghost" onClick={() => window.open(file.url, '_blank')} className="text-xs sm:text-sm">Download</Button>
//                         </div>
//                       </div>
//                     );
//                   })
//                 )}
//               </div>
//             </DialogContent>
//           </Dialog>

//           {/* Links Modal */}
//           <Dialog open={showLinksModal} onOpenChange={setShowLinksModal}>
//             <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
//               <DialogHeader>
//                 <DialogTitle className="text-base sm:text-lg">Links for: {viewLinksTitle}</DialogTitle>
//               </DialogHeader>
//               <div className="space-y-3 sm:space-y-4">
//                 {(!viewLinks || viewLinks.length === 0) ? (
//                   <div className="text-gray-500 text-sm sm:text-base">No links uploaded.</div>
//                 ) : (
//                   viewLinks.map((link, idx) => (
//                     <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 border rounded">
//                       <span className="flex-1 break-all text-xs sm:text-sm">{link.name || `Link ${idx + 1}`}</span>
//                       <Button size="sm" variant="outline" onClick={() => window.open(link.url, '_blank')} className="text-xs sm:text-sm">Open</Button>
//                     </div>
//                   ))
//                 )}
//               </div>
//             </DialogContent>
//           </Dialog>

//           {/* Table Modal */}
//           <Dialog open={showTableModal} onOpenChange={setShowTableModal}>
//             <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
//               <DialogHeader>
//                 <DialogTitle className="text-base sm:text-lg">Table Data</DialogTitle>
//               </DialogHeader>
//               <div className="text-gray-500 text-sm sm:text-base">Table data viewing not implemented yet.</div>
//             </DialogContent>
//           </Dialog>

//           {/* Multi-file Upload Dialog */}
//           <Dialog open={showMultiFileUploadDialog} onOpenChange={setShowMultiFileUploadDialog}>
//             <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-6">
//               <DialogHeader>
//                 <DialogTitle className="text-lg font-semibold mb-2">
//                   Upload Format Template Files for: {multiFileUploadTask?.task_name}
//                 </DialogTitle>
//               </DialogHeader>
//               <div
//                 className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors mb-6"
//                 onDrop={handleMultiFileDrop}
//                 onDragOver={e => e.preventDefault()}
//                 onClick={() => fileInputRef.current && fileInputRef.current.click()}
//               >
//                 <p className="text-gray-700">Drag and drop files here, or click to select</p>
//                 <input
//                   ref={fileInputRef}
//                   type="file"
//                   multiple
//                   className="hidden"
//                   onChange={handleMultiFileSelect}
//                   accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
//                 />
//               </div>
//               <div className={`space-y-3 ${multiFileUploadFiles.length > 5 ? 'max-h-48 overflow-y-auto' : ''} mb-6`}>
//                 {multiFileUploadFiles.length === 0 ? (
//                   <span className="text-gray-500">No files selected.</span>
//                 ) : (
//                   multiFileUploadFiles.map((file, idx) => (
//                     <div key={idx} className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-2 gap-3">
//                       <span className="truncate max-w-xs text-gray-900 min-w-0 flex-1" title={file.name}>{file.name}</span>
//                       <button
//                         type="button"
//                         aria-label="Remove file"
//                         onClick={() => handleRemoveMultiFile(idx)}
//                         className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors ml-auto"
//                       >
//                         <X size={18} />
//                       </button>
//                     </div>
//                   ))
//                 )}
//               </div>
//               <DialogFooter>
//                 <Button onClick={handleMultiFileUpload} disabled={multiFileUploadFiles.length === 0} className="w-full mt-2">
//                   {isMultiFileUploading ? (
//                     <span className="flex items-center">
//                       <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
//                         <circle
//                           className="opacity-25"
//                           cx="12"
//                           cy="12"
//                           r="10"
//                           stroke="currentColor"
//                           strokeWidth="4"
//                           fill="none"
//                         />
//                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//                       </svg>
//                       Uploading...
//                     </span>
//                   ) : (
//                     'Upload Files'
//                   )}
//                 </Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>

//           {/* Approval Dialog */}
//           <Dialog open={!!approvingTask} onOpenChange={() => setApprovingTask(null)}>
//             <DialogContent className="w-[95vw] max-w-md">
//               <DialogHeader>
//                 <DialogTitle className="text-base sm:text-lg">Approve Task: {approvingTask}</DialogTitle>
//               </DialogHeader>
//               <div className="space-y-4">
//                 <div>
//                   <label className="text-sm font-medium">Comment (optional):</label>
//                   <textarea
//                     value={approveComment}
//                     onChange={(e) => setApproveComment(e.target.value)}
//                     className="w-full mt-1 p-2 border rounded-md text-sm"
//                     rows={3}
//                     placeholder="Add a comment..."
//                   />
//                 </div>
//               </div>
//               <DialogFooter className="flex flex-col sm:flex-row gap-2">
//                 <Button variant="outline" onClick={() => setApprovingTask(null)} disabled={isApproving} className="w-full sm:w-auto">
//                   Cancel
//                 </Button>
//                 <Button onClick={handleApproveWithComment} disabled={isApproving} className="w-full sm:w-auto">
//                   {isApproving ? 'Approving...' : 'Approve'}
//                 </Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>

//           {/* Rejection Dialog */}
//           <Dialog open={!!rejectingTask} onOpenChange={() => setRejectingTask(null)}>
//             <DialogContent className="w-[95vw] max-w-md">
//               <DialogHeader>
//                 <DialogTitle className="text-base sm:text-lg">Reject Task: {rejectingTask}</DialogTitle>
//               </DialogHeader>
//               <div className="space-y-4">
//                 <div>
//                   <label className="text-sm font-medium">Reason for rejection:</label>
//                   <textarea
//                     value={rejectComment}
//                     onChange={(e) => setRejectComment(e.target.value)}
//                     className="w-full mt-1 p-2 border rounded-md text-sm"
//                     rows={3}
//                     placeholder="Please provide a reason for rejection..."
//                     required
//                   />
//                 </div>
//               </div>
//               <DialogFooter className="flex flex-col sm:flex-row gap-2">
//                 <Button variant="outline" onClick={() => setRejectingTask(null)} disabled={isRejecting} className="w-full sm:w-auto">
//                   Cancel
//                 </Button>
//                 <Button variant="destructive" onClick={handleRejectWithComment} disabled={isRejecting || !rejectComment.trim()} className="w-full sm:w-auto">
//                   {isRejecting ? 'Rejecting...' : 'Reject'}
//                 </Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         </div>
//       )}
//     </>
//   );
// };

// // Helper function to get file type
// function getFileType(url) {
//   if (!url) return '';
//   const ext = url.split('.').pop().toLowerCase();
//   if (["xlsx", "xls", "docx", "pptx"].includes(ext)) return 'office';
//   if (["pdf"].includes(ext)) return 'pdf';
//   if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) return 'image';
//   return 'other';
// }

// // Export the wrapped version as default for compatibility with imports
// export default function TreasurerWithProvider(props) {
//   return (
//     <TasksProvider>
//       <Treasurer {...props} />
//     </TasksProvider>
//   );
// }

// // Export Treasurer component directly for advanced usage
// export { Treasurer }; 