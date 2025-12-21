// import React, { useState, useEffect } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import { default as AllEventsList } from '@/components/AllEventsList';
// // Add fade-in animation CSS (same as task sections)
// const fadeInStyle = `
//   @keyframes fadeIn {
//     from { opacity: 0; transform: translateY(-10px); }
//     to { opacity: 1; transform: translateY(0); }
//   }
//   .animate-fade-in {
//     animation: fadeIn 0.3s ease-out;
//   }
// `;
// import { Progress } from '@/components/ui/progress';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Textarea } from '@/components/ui/textarea';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { Badge } from '@/components/ui/badge';
// import { supabase } from '@/lib/supabase';
// import { useAuth } from '@/contexts/AuthContext';
// import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
// import { Calendar, CheckCircle, Clock, Users, FileText, AlertCircle, TrendingUp, X } from 'lucide-react';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { fetchTaskReviewInfo, filterPendingReviewTasksForRole, getSenderRoleFromTable } from '@/lib/utils';
// import { useTaskComments } from '@/hooks/useTaskComments';
// import CommentDisplay from '@/components/CommentDisplay';
// import { handleApprove, handleApproveWithComment, handleReject } from './secretaryTaskHandlers';
// import FileViewer from '../components/FileViewer';
// import RejectedTaskHandler from '../../components/RejectedTaskHandler';
// import ReviewProgressBadges from '@/components/ReviewProgressBadges';
// import { TasksProvider, useTasks } from '@/contexts/TasksContext';
// import PendingReviewsSection from '@/components/PendingReviewsSection';
// import EnhancedEventHeader from '@/components/EnhancedEventHeader';
// import { useTableChangeTrigger } from '@/hooks/useTableChangeTrigger';
// import { useCurrentReviewerChangeTrigger } from '@/hooks/useCurrentReviewerChangeTrigger';

// // Component to display a single task row for Secretary
// const TaskRow = ({ task, status, onUploadClick, onRemoveClick, onApproveClick, isReview, locked }) => {
//   const { task_name, desc } = task;
//   const isUploaded = status && status.uploaded;
//   const canUpload = !isUploaded;
//   // Determine status
//   let statusLabel = 'Pending';
//   let statusColor = 'bg-yellow-100 text-yellow-800';
//   if (isUploaded) {
//     statusLabel = 'Uploaded';
//     statusColor = 'bg-blue-100 text-blue-800';
//   }
//   return (
//     <div className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 sm:px-6 py-4 sm:py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1">
//         <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{task_name}</div>
//         <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${statusColor} self-start sm:self-auto`}>{statusLabel}</span>
//       </div>
//       <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{desc}</div>
      
//       {/* Review Progress Badges */}
//       <ReviewProgressBadges status={status} roleType="secretary" />
      
//       <div className="flex flex-wrap gap-2 mt-2 items-center">
//         {canUpload && (
//           <Button size="sm" onClick={() => !locked && onUploadClick(task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//             <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
//             <span className="hidden sm:inline">Upload</span>
//             <span className="sm:hidden">Upload</span>
//           </Button>
//         )}
//         {isUploaded && onRemoveClick && (
//           <Button size="sm" variant="destructive" onClick={() => !locked && onRemoveClick(task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//             <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
//             <span className="hidden sm:inline">Remove</span>
//             <span className="sm:hidden">Remove</span>
//           </Button>
//         )}
//       </div>
//     </div>
//   );
// };

// // Component to display an uploaded task row for Secretary
// const UploadedTaskRow = ({ task, status, onDownloadClick, onRemoveClick, onApproveClick, onRejectClick, onUploadClick, isReview, locked }) => {
//   const { task_name, desc, form_data, table_data, id: task_uuid } = task;
//   // Status badge
//   let statusLabel = 'Pending';
//   let statusColor = 'bg-yellow-100 text-yellow-800';
//   if (status?.status === 'rejected') {
//     statusLabel = 'Rejected';
//     statusColor = 'bg-red-100 text-red-800';
//   } else if (status?.status === 'pending') {
//     statusLabel = 'Pending';
//     statusColor = 'bg-yellow-100 text-yellow-800';
//   }
//   // Comments logic
//   let reviewStat = null;
//   if (status?.status === 'approved') reviewStat = 'A';
//   else if (status?.status === 'rejected') reviewStat = 'R';
//   // Use id/task_uuid from DB row if available, else fallback to task.id/title
//   const commentTaskUuid = status?.id || status?.task_uuid;
//   const isValidUuid = commentTaskUuid && /^[0-9a-fA-F-]{36}$/.test(commentTaskUuid);
//   const { comments } = useTaskComments(isValidUuid ? commentTaskUuid : null, reviewStat);
//   const [commentPopoverOpen, setCommentPopoverOpen] = useState(false);
  

  
//   return (
//     <div className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 sm:px-6 py-4 sm:py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1">
//         <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{task_name}</div>
//         <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${statusColor} self-start sm:self-auto`}>{statusLabel}</span>
//       </div>
      
//       {/* Review Progress Badges */}
//       <ReviewProgressBadges status={status} roleType="secretary" />
      
//       {/* Show table_data if present, else form_data, else file actions */}
//           <div className="flex flex-wrap gap-2 mt-2 items-center">
//         {/* Always use FileViewer for file viewing */}
//         <FileViewer 
//           files={(() => {
//             // Handle file_link which might be a JSON string or already parsed array
//             let files = [];
//             if (status?.file_link) {
//               try {
//                 // Try to parse as JSON if it's a string
//                 const parsedFileLink = typeof status.file_link === 'string' ? JSON.parse(status.file_link) : status.file_link;
//                 files = Array.isArray(parsedFileLink) ? parsedFileLink : [];
//               } catch (e) {
//                 // If parsing fails, treat as single file
//                 files = [{name: 'File', url: status.file_link}];
//               }
//             } else if (status?.downloadUrl) {
//               files = [{name: 'File', url: status.downloadUrl}];
//             } else if (task?.file_link) {
//               try {
//                 // Try to parse as JSON if it's a string
//                 const parsedFileLink = typeof task.file_link === 'string' ? JSON.parse(task.file_link) : task.file_link;
//                 files = Array.isArray(parsedFileLink) ? parsedFileLink : [];
//               } catch (e) {
//                 // If parsing fails, treat as single file
//                 files = [{name: 'File', url: task.file_link}];
//               }
//             } else if (task?.downloadUrl) {
//               files = [{name: 'File', url: task.downloadUrl}];
//             }
            
//             // Debug logging for file data
//             console.log('DEBUG: FileViewer files:', {
//               taskName: task_name,
//               statusFileLink: status?.file_link,
//               statusDownloadUrl: status?.downloadUrl,
//               taskFileLink: task?.file_link,
//               taskDownloadUrl: task?.downloadUrl,
//               finalFiles: files,
//               linkHolder: status?.link_holder || task?.link_holder
//             });
            
//             return files;
//           })()} 
//           tableData={table_data || form_data} 
//           taskName={task_name}
//           buttonLabel="View"
//           variant="outline"
//           buttonClass="transition-transform hover:scale-105 flex items-center gap-1"
//           links={status?.link_holder || task?.link_holder}
//           docType={status?.link_holder || task?.link_holder ? 'link' : undefined}
//         />

//           {status?.file_link && (
//             <Button size="sm" onClick={() => !locked && onDownloadClick(task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//               <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16h16V4H4zm4 8h8" /></svg>
//               <span className="hidden sm:inline">Download</span>
//               <span className="sm:hidden">Download</span>
//             </Button>
//           )}
//           {isReview && (
//             <>
//             <Button size="sm" variant="success" onClick={() => !locked && onApproveClick()} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//               <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
//               <span className="hidden sm:inline">Approve</span>
//               <span className="sm:hidden">Approve</span>
//             </Button>
//             <Button size="sm" variant="destructive" onClick={() => !locked && onRejectClick()} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//               <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
//               <span className="hidden sm:inline">Reject</span>
//               <span className="sm:hidden">Reject</span>
//             </Button>
//             </>
//           )}
//           {!isReview && (
//             <Button size="sm" variant="destructive" onClick={() => !locked && onRemoveClick(task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//               <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
//               <span className="hidden sm:inline">Remove</span>
//               <span className="sm:hidden">Remove</span>
//             </Button>
//           )}

//           {isValidUuid && comments.length > 0 && (
//             <Popover open={commentPopoverOpen} onOpenChange={setCommentPopoverOpen}>
//               <PopoverTrigger asChild>
//                 <Button size="sm" variant="outline" className="flex items-center gap-1 text-xs sm:text-sm">
//                   <svg className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${commentPopoverOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
//                   <span className="hidden sm:inline">Comments ({comments.length})</span>
//                   <span className="sm:hidden">Comments</span>
//                 </Button>
//               </PopoverTrigger>
//               <PopoverContent className="w-80 sm:w-96 max-h-96 overflow-y-auto">
//                 <CommentDisplay comments={comments} />
//               </PopoverContent>
//             </Popover>
//           )}
//         </div>
//     </div>
//   );
// };

// // Secretary task to DB column and folder mapping
// const secretaryTaskMap = {
//   'Event Proposal Document': {
//     uploadCol: 'up_event_proposal',
//     reviewCol: 'final_review_event_prop',
//     reviewOneCol: 'review_one_event_prop',
//     linkCol: 'link_event_proposal',
//     folder: 'event_proposal',
//   },
//   'Event Invitations': {
//     uploadCol: 'up_event_invitations',
//     reviewCol: 'final_review_event_invite',
//     linkCol: 'link_event_invitations',
//     folder: 'event_invites',
//   },
//   'Pre-event Meeting Minutes': {
//     uploadCol: 'up_pre_event_meeting_records',
//     reviewCol: 'final_review_pre_event_plan',
//     reviewOneCol: 'review_one_pre_event_plan',
//     linkCol: 'link_pre_event_meeting_records',
//     folder: 'pre_event_plans',
//   },
//   'IEEE Mega Event Report': {
//     uploadCol: 'up_ieee_mega_report_vtools',
//     reviewCol: 'final_review_mega_report',
//     linkCol: 'link_up_ieee_mega_report_vtools',
//     folder: 'ieee_mega_report',
//   },
// };

// // Add this mapping near the top of the file if not present
// const roleTableMap = {
//   'Secretary': 'secretary_main',
//   'Technical Coordinator': 'tech_coord_main',
//   'Tech Coordinator': 'tech_coord_main',
//   'Vice Chairperson': 'vice_chair_main',
//   'Vice Chair': 'vice_chair_main',
//   'Chair Person': 'chair_main',
//   // Add more as needed
// };

// // Main Secretary component
// const Secretary = ({ eventId }) => {
//   const { user } = useAuth();
//   const navigate = useNavigate();

//   // Inject the fade-in animation CSS
//   React.useEffect(() => {
//     const style = document.createElement('style');
//     style.textContent = fadeInStyle;
//     document.head.appendChild(style);
//     return () => {
//       document.head.removeChild(style);
//     };
//   }, []);
//   const [taskStatus, setTaskStatus] = useState({});
//   const [selectedFiles, setSelectedFiles] = useState({});
//   const [eventInfo, setEventInfo] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [activeTask, setActiveTask] = useState(null);
//   const [viewMode, setViewMode] = useState('my');
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadError, setUploadError] = useState(null);
//   const [rejectingTask, setRejectingTask] = useState(null);
//   const [rejectComment, setRejectComment] = useState('');
//   const [isRejecting, setIsRejecting] = useState(false);
//   const [dashboardStats, setDashboardStats] = useState([]);
//   const [recentActivities, setRecentActivities] = useState([]);
//   const [upcomingEvents, setUpcomingEvents] = useState([]);
//   const [loadingDashboard, setLoadingDashboard] = useState(true);
//   const params = useParams();
//   const [pendingFirstReview, setPendingFirstReview] = useState([]);
//   const [pendingFinalReview, setPendingFinalReview] = useState([]);
//   // In Secretary component, add state for tech coordinator review tasks
//   const [techCoordReviewTasks, setTechCoordReviewTasks] = useState([]);
//   // Add state for Event Coordinator review tasks
//   const [eventCoordReviewTasks, setEventCoordReviewTasks] = useState([]);
//   // Add state for approval comment dialog
//   const [approvingTask, setApprovingTask] = useState(null);
//   const [approveComment, setApproveComment] = useState('');
//   const [isApproving, setIsApproving] = useState(false);
//   const [isProcessingAction, setIsProcessingAction] = useState(false);
//   const [uploadedRows, setUploadedRows] = useState([]);
//   const [taskList, setTaskList] = useState([]);
//   // In Secretary component, add state for social_main review tasks
//   const [socialMediaReviewTasks, setSocialMediaReviewTasks] = useState([]);

//   // Table change trigger for monitoring secretary_main table (disabled for approve/reject since we handle it directly)
//   const { isLoading: tableChangeLoading, lastCheck } = useTableChangeTrigger(
//     'secretary_main',
//     eventId,
//     'Secretary',
//     async () => {
//       console.log('[Secretary] Secretary table changed, refreshing data...');
//       // Only trigger for non-approve/reject operations
//       await fetchEventDetailsAndTaskStatus();
//     },
//     3000,
//     // Exclude upload, reupload, and remove operations from triggering the loading
//     (currentData, previousData) => {
//       // Don't trigger for row removal (remove button operations)
//       if (currentData && previousData && currentData.length < previousData.length) {
//         console.log('[Secretary] Detected row removal operation, skipping loading trigger');
//         return false;
//       }
      
//       // Don't trigger for status changes from 'rejected' to 'pending' (reupload)
//       // Don't trigger for status changes from null/undefined to 'pending' (normal upload)
//       // Don't trigger for approve/reject operations (handled directly in handlers)
//       if (currentData && previousData) {
//         for (let i = 0; i < currentData.length; i++) {
//           const current = currentData[i];
//           const previous = previousData.find(p => p.id === current.id);
          
//           // Skip reupload operations
//           if (previous && previous.status === 'rejected' && current.status === 'pending') {
//             console.log('[Secretary] Detected reupload operation, skipping loading trigger');
//             return false;
//           }
          
//           // Skip normal upload operations
//           if (previous && (!previous.status || previous.status === 'null' || previous.status === null) && current.status === 'pending') {
//             console.log('[Secretary] Detected normal upload operation, skipping loading trigger');
//             return false;
//           }
          
//           // Allow final approval/rejection changes to trigger loading (for badge updates)
//           if (previous && previous.status === 'pending' && (current.status === 'approved' || current.status === 'rejected')) {
//             console.log('[Secretary] Detected final approval/rejection, allowing loading trigger for badge update');
//             return true;
//           }
//         }
//       }
//       return true; // Allow other changes to trigger loading
//     }
//   );

//   // Current reviewer change trigger for instant loading on pending review side
//   const { isLoading: reviewerChangeLoading, lastCheck: reviewerLastCheck } = useCurrentReviewerChangeTrigger(
//     eventId,
//     'Secretary',
//     ['secretary_main', 'tech_coord_main', 'event_coord_main', 'social_main'],
//     async (changes) => {
//       console.log('[Secretary] Current reviewer changed, refreshing pending review data...', changes);
//       // Refresh pending review data immediately
//       await fetchEventDetailsAndTaskStatus();
//     },
//     3000
//   );

//   // Use tasks from context instead of direct query
//   const { tasks: contextTasks, loading: contextLoading } = useTasks();
  
//   useEffect(() => {
//     if (contextTasks && Array.isArray(contextTasks)) {
//       setTaskList(contextTasks);
//     }
//   }, [contextTasks]);

//   useEffect(() => {
//     async function filterTasks() {
//       // Secretary as reviewer (pending tasks for Secretary)
//       const secretaryReview = await filterPendingReviewTasksForRole(
//         Object.values(taskStatus),
//         'Secretary',
//         { reviewOneField: 'review_one', reviewTwoField: 'review_two', finalReviewField: 'final_review' }
//       );
//       setPendingFirstReview(secretaryReview);

//       // Chair as final reviewer (Secretary tasks that are ready for Chair)
//       const finalReview = await filterPendingReviewTasksForRole(
//         Object.values(taskStatus),
//         'Chair Person',
//         { reviewOneField: 'review_one', reviewTwoField: 'review_two', finalReviewField: 'final_review' }
//       );
//       setPendingFinalReview(finalReview);

//       // Also filter tasks from other tables that are pending Secretary review
//       const allTasks = Object.values(taskStatus);
//       const secretaryPendingTasks = allTasks.filter(task => 
//         task.current_reviewer === 'Secretary' && 
//         task.status === 'pending' &&
//         (task.sourceTable === 'tech_coord_main' || task.sourceTable === 'event_coord_main' || task.sourceTable === 'social_main')
//       );
//       setPendingFirstReview(prev => [...prev, ...secretaryPendingTasks]);
//     }
//     filterTasks();
//   }, [taskStatus]);

//   // Move fetchEventDetailsAndTaskStatus to top-level
//     const fetchEventDetailsAndTaskStatus = async () => {
//       if (!eventId) {
//         setEventInfo({ event_name: 'Error', event_desc: 'Event ID not provided.' });
//         setIsLoading(false);
//         return;
//       }
//       const { data: eventData, error: eventError } = await supabase
//         .from('events')
//       .select('event_name, event_desc, id, locked')
//         .eq('id', eventId)
//         .single();
//       if (eventError || !eventData) {
//         console.error('Error fetching event details:', eventError);
//         setEventInfo({ event_name: 'Event not found', event_desc: 'Could not retrieve event details.' });
//         setIsLoading(false);
//         return;
//       }
//       setEventInfo({ event_name: eventData.event_name, event_desc: eventData.event_desc, locked: !!eventData.locked });
//     // Fetch secretary_main rows for this event
//     const { data: secRows, error: secError } = await supabase
//       .from('secretary_main')
//         .select('*')
//       .eq('event_id', eventData.id);
//       if (secError) {
//         setTaskStatus({});
//         setIsLoading(false);
//         return;
//       }
//     // Map DB rows to task status
//       const status = {};
//     secRows.forEach(row => {
//       // Handle file_link as array of objects (new structure) or string (old structure)
//       let filePath = null;
//       let downloadUrl = null;
      
//       if (row.file_link) {
//         if (Array.isArray(row.file_link)) {
//           // New structure: array of file objects
//           downloadUrl = row.file_link;
//           // For filePath, use the first file's name if available
//           if (row.file_link.length > 0 && row.file_link[0].name) {
//             filePath = `${secretaryTaskMap[row.task_name]?.folder}/${row.file_link[0].name}`;
//           }
//         } else {
//           // Old structure: string URL
//           downloadUrl = row.file_link;
//           filePath = `${secretaryTaskMap[row.task_name]?.folder}/${row.file_link.split('/').pop()}`;
//         }
//       }
      
//       status[row.task_name] = {
//         uploaded: !!row.file_link && (row.status === 'pending' || row.status === 'approved' || row.status === 'rejected'),
//         status: row.status,
//         filePath: filePath,
//         downloadUrl: downloadUrl,
//         review_one: row.review_one,
//         uploaded_at: row.uploaded_at,
//         file_link: row.file_link, // Add file_link for new structure
//         task_uuid: row.id // Ensure task_uuid is included for comment lookup
//       };
//     });
//       setTaskStatus(status);
//       setIsLoading(false);
//     // Fetch tech_coord_main rows for this event where current_reviewer is Secretary and status is pending
//     const { data: techRows, error: techError } = await supabase
//       .from('tech_coord_main')
//       .select('*')
//       .eq('event_id', eventData.id)
//       .eq('current_reviewer', 'Secretary')
//       .eq('status', 'pending');
//     if (!techError && Array.isArray(techRows)) {
//       setTechCoordReviewTasks(techRows);
//       // Add tech coordinator tasks to taskStatus for filtering
//       techRows.forEach(row => {
//         status[`tech_${row.task_name}`] = {
//           uploaded: true,
//           status: row.status,
//           current_reviewer: row.current_reviewer,
//           review_status: row.review_status,
//           task_uuid: row.id,
//           sourceTable: 'tech_coord_main'
//         };
//       });
//     } else {
//       setTechCoordReviewTasks([]);
//     }
//     // Fetch event_coord_main rows for this event where current_reviewer is Secretary and status is pending
//     const { data: ecRows, error: ecError } = await supabase
//       .from('event_coord_main')
//       .select('*')
//       .eq('event_id', eventData.id)
//       .eq('current_reviewer', 'Secretary')
//       .eq('status', 'pending');
//     if (!ecError && Array.isArray(ecRows)) {
//       setEventCoordReviewTasks(ecRows);
//       // Add event coordinator tasks to taskStatus for filtering
//       ecRows.forEach(row => {
//         status[`ec_${row.task_name}`] = {
//           uploaded: true,
//           status: row.status,
//           current_reviewer: row.current_reviewer,
//           review_status: row.review_status,
//           task_uuid: row.id,
//           sourceTable: 'event_coord_main'
//         };
//       });
//     } else {
//       setEventCoordReviewTasks([]);
//     }
//     // Fetch social_main rows for this event where current_reviewer is Secretary and status is pending
//     const { data: socialRows, error: socialError } = await supabase
//       .from('social_main')
//       .select('*')
//       .eq('event_id', eventData.id)
//       .eq('current_reviewer', 'Secretary')
//       .eq('status', 'pending');
//     if (!socialError && Array.isArray(socialRows)) {
//       setSocialMediaReviewTasks(socialRows);
//       // Add social media tasks to taskStatus for filtering
//       socialRows.forEach(row => {
//         status[`social_${row.task_name}`] = {
//           uploaded: true,
//           status: row.status,
//           current_reviewer: row.current_reviewer,
//           review_status: row.review_status,
//           task_uuid: row.id,
//           sourceTable: 'social_main'
//         };
//       });
//     } else {
//       setSocialMediaReviewTasks([]);
//     }
//   };

//   // Fetch upcoming events for dashboard (no eventId)
//   useEffect(() => {
//     if (params.eventId || eventId) return;
//     const fetchUpcomingEvents = async () => {
//       const { data: events, error } = await supabase
//         .from('events')
//         .select('id, event_name, event_date');
//       if (error) return;
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);
//       const upcoming = (events || []).filter((e) => {
//         if (!e.event_date) return false;
//         const eventDate = new Date(e.event_date);
//         return eventDate >= today;
//       });
//       setUpcomingEvents(
//         upcoming
//           .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
//           .map((e) => {
//             const eventDate = new Date(e.event_date);
//             const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
//             let soonLabel = '';
//             if (diffDays === 0) soonLabel = 'Today';
//             else if (diffDays === 1) soonLabel = 'Tomorrow';
//             else soonLabel = `In ${diffDays} days`;
//             return {
//               id: e.id,
//               event_name: e.event_name,
//               start_date: eventDate.toLocaleDateString(),
//               soonLabel,
//             };
//           })
//       );
//     };
//     fetchUpcomingEvents();
//   }, [params.eventId, eventId]);

//   // Add real-time subscription for auto-refresh
//   useEffect(() => {
//     if (!eventId) return;
//     // Subscribe to secretary_main
//     const secretaryChannel = supabase
//       .channel('realtime:secretary_main')
//       .on(
//         'postgres_changes',
//         {
//           event: '*',
//           schema: 'public',
//           table: 'secretary_main',
//           filter: `event_id=eq.${eventId}`,
//         },
//         (payload) => {
//           console.log('[Realtime] secretary_main change:', payload);
//           fetchEventDetailsAndTaskStatus(eventId, setEventInfo, setIsLoading, setTaskStatus);
//         }
//       )
//       .subscribe();

//     // Subscribe to event_coord_main (for event coordinator tasks)
//     const eventCoordChannel = supabase
//       .channel('realtime:event_coord_main')
//       .on(
//         'postgres_changes',
//         {
//           event: '*',
//           schema: 'public',
//           table: 'event_coord_main',
//           filter: `event_id=eq.${eventId}`,
//         },
//         (payload) => {
//           console.log('[Realtime] event_coord_main change:', payload);
//           fetchEventDetailsAndTaskStatus(eventId, setEventInfo, setIsLoading, setTaskStatus);
//         }
//       )
//       .subscribe();

//     // Subscribe to tech_coord_main (for technical coordinator tasks)
//     const techCoordChannel = supabase
//       .channel('realtime:tech_coord_main')
//       .on(
//         'postgres_changes',
//         {
//           event: '*',
//           schema: 'public',
//           table: 'tech_coord_main',
//           filter: `event_id=eq.${eventId}`,
//         },
//         (payload) => {
//           console.log('[Realtime] tech_coord_main change:', payload);
//           fetchEventDetailsAndTaskStatus(eventId, setEventInfo, setIsLoading, setTaskStatus);
//         }
//       )
//       .subscribe();

//     // Subscribe to social_main (for social media tasks)
//     const socialChannel = supabase
//       .channel('realtime:social_main')
//       .on(
//         'postgres_changes',
//         {
//           event: '*',
//           schema: 'public',
//           table: 'social_main',
//           filter: `event_id=eq.${eventId}`,
//         },
//         (payload) => {
//           console.log('[Realtime] social_main change:', payload);
//           fetchEventDetailsAndTaskStatus(eventId, setEventInfo, setIsLoading, setTaskStatus);
//         }
//       )
//       .subscribe();

//     // Cleanup on unmount
//     return () => {
//       supabase.removeChannel(secretaryChannel);
//       supabase.removeChannel(eventCoordChannel);
//       supabase.removeChannel(techCoordChannel);
//       supabase.removeChannel(socialChannel);
//     };
//   }, [eventId]);

//   useEffect(() => {
//     async function fetchUploadedRows() {
//       if (!eventId) return;
//       const { data, error } = await supabase
//         .from('secretary_main')
//         .select('*')
//         .eq('event_id', eventId);
//       if (!error) setUploadedRows(data || []);
//     }
//     fetchUploadedRows();
//   }, [eventId]);

//   // If no eventId, render dashboard view
//   if (!params.eventId && !eventId) {
//     // --- BEGIN: Vice Chair style dashboard ---
//     return (
//       <div className="px-4 py-6 space-y-6 animate-fade-in">
//         {/* Welcome Section */}
//         <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
//           <h1 className="text-2xl font-bold">Welcome back, {user?.disp_name || user?.email || 'Secretary'}!</h1>
//           <p className="text-blue-100 mt-2">
//             Here's what's happening with your club activities today.
//           </p>
//         </div>
//         {/* Analytics Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//           {dashboardStats?.map((stat, index) => (
//             <Card 
//               key={index} 
//               className="hover:shadow-lg transition-shadow cursor-pointer"
//               onClick={stat.clickHandler}
//             >
//               <CardContent className="p-6">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <p className="text-sm font-medium text-gray-600">{stat.title}</p>
//                     <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
//                   </div>
//                   <div className={`p-3 rounded-full bg-gray-100 ${stat.color}`}>
//                     <stat.icon className="h-6 w-6" />
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//         {/* Main Content Grid */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           {/* Recent Activities */}
//           <Card className="lg:col-span-3">
//   <CardHeader>
//   </CardHeader>
//   <CardContent>
//     <AllEventsList roleType="secretary" roleTable="secretary_main" userRole="Secretary" />
//   </CardContent>
// </Card>
//         </div>
//         {/* Upcoming Events - ONLY in dashboard view */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Upcoming Events</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-2">
//               {upcomingEvents.length === 0 && (
//                 <div className="text-gray-500">No upcoming events.</div>
//               )}
//               {upcomingEvents.map((event) => (
//                 <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
//                   <div className="flex flex-col">
//                     <span className="font-medium">{event.event_name}</span>
//                     <span className="text-xs text-gray-500">Starts: {event.start_date}</span>
//                   </div>
//                   <Badge variant={event.soonLabel === 'Today' ? 'destructive' : 'outline'}>{event.soonLabel}</Badge>
//                 </div>
//               ))}
//             </div>
//           </CardContent>
//         </Card>
//         {/* Quick Actions */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Quick Actions</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//               <Button 
//                 variant="outline" 
//                 className="h-20 flex flex-col gap-2"
//                 onClick={() => navigate('/events')}
//               >
//                 <FileText className="h-6 w-6" />
//                 View Events
//               </Button>
//               <Button 
//                 variant="outline" 
//                 className="h-20 flex flex-col gap-2"
//                 onClick={() => navigate('/events')}
//               >
//                 <Users className="h-6 w-6" />
//                 Event Tasks
//               </Button>
//               <Button 
//                 variant="outline" 
//                 className="h-20 flex flex-col gap-2"
//                 onClick={() => navigate('/events')}
//               >
//                 <TrendingUp className="h-6 w-6" />
//                 Event Overview
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     );
//     // --- END: Vice Chair style dashboard ---
//   }

//   // In useEffect, just call fetchEventDetailsAndTaskStatus
//   useEffect(() => {
//     fetchEventDetailsAndTaskStatus();
//   }, [eventId]);

//   // --- Secretary upload logic (refactored to match Vice Chair) ---
//   const secretaryFolderMap = {
//     'Event Proposal Document': 'ev_prop',
//     'Event Invitations': 'ev_inv',
//     'Pre-event Meeting Minutes': 'pre_ev',
//     'IEEE Mega Event Report': 'ev_mega',
//   };
//   // Utility to check if a column exists in secretary_main
//   async function secretaryMainHasColumn(columnName) {
//     const { data, error } = await supabase.rpc('column_exists_in_table', {
//       table_name: 'secretary_main',
//       column_name: columnName
//     });
//     return !error && data === true;
//   }
//   // --- Refactored handleUpload ---
//   const handleUpload = async () => {
//     try {
//       setIsUploading(true);
//       setUploadError(null);
//       const files = selectedFiles[activeTask];
//       if (!files || files.length === 0) throw new Error('No files selected.');
//       const taskObj = taskList.find(t => t.task_name === activeTask);
//       if (!taskObj) throw new Error('Task not found.');
//       // Fetch the correct task_id from the tasks table
//       const { data: taskDef, error: taskError } = await supabase
//         .from('tasks')
//         .select('task_id')
//         .eq('task_name', activeTask)
//         .limit(1)
//         .single();
//       if (taskError || !taskDef) throw new Error('Task definition not found.');
//       const realTaskId = taskDef.task_id;
//       // Fetch review roles from tasks table
//       const { review_role } = await fetchTaskReviewInfo(realTaskId || taskObj.task_name);
//       const firstReviewer = review_role?.[0] || null;
//       const folder = secretaryFolderMap[taskObj.task_name];
//       if (!folder) throw new Error('No folder mapping for this task.');
//       const bucket = 'sec';
      
//       // Get event name and event_id for folder structure
//       const { data: eventData, error: eventError } = await supabase
//         .from('events')
//         .select('event_name, id')
//         .eq('id', eventId)
//         .single();
//       if (eventError || !eventData) throw new Error('Failed to fetch event name.');
//       const eventName = eventData.event_name;
//       const event_id = eventData.id;
      
//       // Create event folder name (like Social Media Manager)
//       const eventFolder = `${eventName.replace(/\s+/g, '_')}_${eventId}`;
//       const folderPath = `${folder}/${eventFolder}`;
      
//       // Upload all files
//       const fileLinkArr = [];
//       for (const file of files) {
//       // Generate unique file name
//       const ext = file.name.split('.').pop();
//       const base = `${eventId}_${activeTask}`;
//       let finalFileName = `${base}.${ext}`;
//         let finalFilePath = `${folder}/${eventFolder}/${finalFileName}`;
//       let counter = 1;
//       while (true) {
//           const { data: exists } = await supabase.storage.from(bucket).list(`${folder}/${eventFolder}`, { search: finalFileName });
//         if (!exists || !exists.find(f => f.name === finalFileName)) break;
//         finalFileName = `${base}_${counter++}.${ext}`;
//           finalFilePath = `${folder}/${eventFolder}/${finalFileName}`;
//       }
//       const { error: uploadError } = await supabase.storage.from(bucket).upload(finalFilePath, file);
//         if (uploadError) throw new Error(`File upload failed for ${file.name}: ${uploadError.message}`);
        
//         // Store as array of file objects for consistency (like Social Media Manager)
//       const publicUrl = `https://pfitttbkoyglznojhozc.supabase.co/storage/v1/object/public/${bucket}/${finalFilePath}`;
//         fileLinkArr.push({ name: finalFileName, url: publicUrl });
//       }
      
//       // Check for existing rejected row for this task/event
//       const { data: existingRows, error: existingError } = await supabase
//         .from('secretary_main')
//         .select('id')
//         .eq('event_name', eventName)
//         .eq('task_name', activeTask)
//         .eq('status', 'rejected');
//       if (existingError) throw new Error('Failed to check for existing rejected row.');
//       let prevReviewStatus = [];
//       if (existingRows && existingRows.length > 0) {
//         // Fetch previous review_status for reupload
//         const { data: prevRow, error: prevError } = await supabase
//           .from('secretary_main')
//           .select('review_status')
//           .eq('id', existingRows[0].id)
//           .single();
//         if (!prevError && prevRow && Array.isArray(prevRow.review_status)) {
//           prevReviewStatus = prevRow.review_status;
//         }
//       }
//       // Insert or update secretary_main
//       const insertOrUpdatePayload = {
//         event_name: eventName,
//         event_id,
//         task_name: taskObj.task_name,
//         task_id: realTaskId,
//         file_link: fileLinkArr, // Store as array of objects
//         uploaded_at: new Date().toISOString(),
//         status: 'pending',
//         current_reviewer: firstReviewer,
//         review_status: prevReviewStatus, // preserve for reupload
//       };
//       if (existingRows && existingRows.length > 0) {
//         // Update the existing rejected row
//         const { error: updateError } = await supabase
//           .from('secretary_main')
//           .update(insertOrUpdatePayload)
//           .eq('id', existingRows[0].id);
//         if (updateError) throw new Error('Failed to update rejected row.');
//       } else {
//         // Insert new row
//         const { error: insertError } = await supabase
//           .from('secretary_main')
//           .insert({ ...insertOrUpdatePayload, review_status: [] });
//         if (insertError) {
//           console.error('Insert error:', insertError);
//           throw new Error('Failed to insert into secretary_main table.');
//         }
//       }
//       setTaskStatus((prev) => ({
//         ...prev,
//         [activeTask]: {
//           ...prev[activeTask],
//           uploaded: true,
//           status: 'pending',
//           file_link: fileLinkArr, // Store as array of objects
//         },
//       }));
//       setSelectedFiles((prev) => ({ ...prev, [activeTask]: null }));
//       setActiveTask(null);
//       alert('Files uploaded successfully!');
//     } catch (error) {
//       console.error('Upload error:', error);
//       setUploadError(error.message);
//       alert('Upload failed: ' + error.message);
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   const handleFileChange = (e) => {
//     const files = Array.from(e.target.files);
//     setSelectedFiles((prev) => ({ ...prev, [activeTask]: files }));
//     setUploadError(null);
//   };

//   const handleRemoveFile = (taskName, fileIndex) => {
//     setSelectedFiles((prev) => {
//       const currentFiles = prev[taskName];
//       if (!currentFiles) return prev;
//       const newFiles = currentFiles.filter((_, index) => index !== fileIndex);
//       return { ...prev, [taskName]: newFiles };
//     });
//   };

//   const handleDownload = async (taskName) => {
//     try {
//       const status = taskStatus[taskName];
//       if (!status?.file_link) throw new Error('No files found for this task.');

//       // Handle array of file objects (new structure)
//       if (Array.isArray(status.file_link)) {
//         for (const fileObj of status.file_link) {
//           const response = await fetch(fileObj.url);
//           const blob = await response.blob();
//           const blobUrl = URL.createObjectURL(blob);
//           const link = document.createElement('a');
//           link.href = blobUrl;
//           link.download = fileObj.name || `${taskName}-file`;
//           document.body.appendChild(link);
//           link.click();
//           document.body.removeChild(link);
//           URL.revokeObjectURL(blobUrl);
//         }
//       } else {
//         // Handle old structure (single file)
//       const response = await fetch(status.downloadUrl);
//       const blob = await response.blob();
//       const blobUrl = URL.createObjectURL(blob);
//       const link = document.createElement('a');
//       link.href = blobUrl;
//       link.download = `${taskName}-${status.filePath?.split('/').pop() || 'file'}`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       URL.revokeObjectURL(blobUrl);
//       }
//     } catch (err) {
//       alert(`Download failed: ${err.message}`);
//     }
//   };



//   const handleRemove = async (taskName) => {
//     const map = secretaryTaskMap[taskName];
//     if (!map) return;
//     try {
//       // Remove files from 'sec' storage bucket
//       const status = taskStatus[taskName];
//       if (status?.file_link) {
//         // Handle array of file objects (new structure)
//         if (Array.isArray(status.file_link)) {
//           for (const fileObj of status.file_link) {
//         // Extract the file path after '/sec/'
//             const urlParts = fileObj.url.split('/sec/');
//             const filePath = urlParts[1];
//             if (filePath) {
//               await supabase.storage.from('sec').remove([filePath]);
//             }
//           }
//         } else {
//           // Handle old structure (single file)
//         const urlParts = status.downloadUrl.split('/sec/');
//         const filePath = urlParts[1];
//         if (filePath) {
//           await supabase.storage.from('sec').remove([filePath]);
//           }
//         }
//       }
//       // Delete the row from secretary_main table
//       const { error } = await supabase
//         .from('secretary_main')
//         .delete()
//         .eq('event_name', eventInfo.event_name)
//         .eq('task_name', taskName);
//       if (error) throw new Error('Failed to delete secretary_main row.');
//       setTaskStatus((prev) => ({
//         ...prev,
//         [taskName]: {
//           uploaded: false,
//           filePath: null,
//           downloadUrl: null,
//           file_link: null,
//         },
//       }));
//       alert('Files and row removed successfully.');
//     } catch (err) {
//       console.error('Remove error:', err);
//       alert(`Failed to remove files: ${err.message}`);
//     }
//   };

//   const handleReuploadClick = async (task, comment = '') => {
//     if (!eventId || !task) return;
    
//     try {
//       const taskName = task.task_name || task.taskName;
      
//       // Get the mapping for this task
//       const mapping = secretaryTaskMap[taskName];
//       if (!mapping) {
//         alert('Task mapping not found');
//         return;
//       }

//       // Check for existing rejected row
//       const { data: existingRow, error: existingError } = await supabase
//         .from('secretary_main')
//         .select('*')
//         .eq('event_id', eventId)
//         .eq('task_name', taskName)
//         .eq('status', 'rejected')
//         .single();

//       if (existingError && existingError.code !== 'PGRST116') {
//         console.error('Error checking existing rejected row:', existingError);
//         alert('Failed to check existing task status');
//         return;
//       }

//       if (existingRow) {
//         // Set active task to trigger upload modal for reupload
//         setActiveTask(taskName);
        
//         // Insert reupload comment if provided
//         if (comment && comment.trim()) {
//           const { error: commentError } = await supabase
//             .from('comments')
//             .insert({
//               comment_text: comment,
//               task_name: taskName,
//               event_name: eventInfo?.event_name,
//               commenter_role: 'Secretary',
//               commenter_name: user?.user_metadata?.full_name || user?.email,
//               sender_table: 'secretary_main',
//               task_uuid: existingRow.task_id,
//               event_id: eventId,
//               comment_type: {
//                 type: 'reupload',
//                 role: 'Secretary'
//               },
//               created_at: new Date().toISOString()
//             });

//           if (commentError) {
//             console.error('Error inserting reupload comment:', commentError);
//             // Don't fail the reupload if comment insertion fails
//           }
//         }
//       } else {
//         alert('No rejected task found to reupload');
//       }
      
//     } catch (error) {
//       console.error('Reupload error:', error);
//       alert('Failed to reupload task: ' + error.message);
//     }
//   };

//   // Filtering logic for Secretary tasks (match Vice Chair)
//   // --- My Tasks: Only show tasks not uploaded or rejected, never show approved tasks ---
//   // Update myTasks and uploadedByYou to handle tech coordinator tasks
//   const myTasks = [
//     ...taskList.filter((task) => {
//       const status = taskStatus[task.task_name];
//       // Only show in My Tasks if not uploaded or status is rejected, never if approved
//       return (
//         task.roles.includes('Secretary') &&
//         (!status?.uploaded || (status?.status === 'rejected')) &&
//         status?.status !== 'approved'
//       );
//     }),
//     ...techCoordReviewTasks.filter(task => task.status === 'rejected' && task.current_reviewer === 'Secretary')
//   ];

//   const uploadedByYou = [
//     ...taskList.filter((task) => {
//       const status = taskStatus[task.task_name];
//       // Show in Uploaded by Me if uploaded and not rejected (including approved)
//       return (
//         task.roles.includes('Secretary') &&
//         status?.uploaded && status?.status !== 'rejected'
//       );
//     }),
//     ...techCoordReviewTasks.filter(task => task.status !== 'rejected' && task.uploaded)
//   ];

//   // --- Pending Review Tasks for Secretary ---
//   const pendingReviewTasks = Object.values(taskStatus).filter(task => {
//     // Find the task definition in taskList
//     const taskDef = taskList.find(t => t.task_name === task.task_name);
//     if (!taskDef) return false;
//     // Secretary is first reviewer
//     if (taskDef.firstApproval === 'Secretary' && !task.review_one && task.status === 'pending') return true;
//     // Secretary is second reviewer
//     if (taskDef.secondApproval === 'Secretary' && task.review_one && !task.review_two && task.status === 'pending') return true;
//     return false;
//   });

//   // Update rejectedTasks to only include tasks with up_ === 'rejected'
//   const rejectedTasks = taskList.filter((task) => {
//     const status = taskStatus[task.task_name];
//     if (!status) return false;
//     return status.status === 'rejected';
//   });

//   // Add Approved and Rejected sections in the UI
//   const approvedTasks = taskList.filter((task) => taskStatus[task.task_name]?.finalApproved === true);

//   // Loading spinner component
//   const LoadingSpinner = () => (
//     <div className="flex justify-center items-center h-screen">
//       <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
//     </div>
//   );

//   // --- Event Tasks Section (when eventId is present) ---
//   if (params.eventId || eventId) {
//     // Determine section from URL (default to 'mytasks')
//     const section = params.section || viewMode || 'mytasks';
//     const eventIdToUse = eventId || params.eventId;
//     // Section switching handler
//     const handleSectionChange = (newSection) => {
//       navigate(`/event-tasks/${eventIdToUse}/secretary/${newSection}`);
//     };
//     // Section logic
//     const myTasksSection = myTasks;
//     const uploadedSection = uploadedByYou;
//     const approvedSection = approvedTasks;
//     const rejectedSection = rejectedTasks;
//     const reviewsSection = pendingReviewTasks;
//   // In Pending Reviews section, merge secretary_main, tech_coord_main, event_coord_main, and social_main review tasks
//   const mergedPendingReviews = [
//     ...reviewsSection,
//     ...techCoordReviewTasks.map(row => ({
//       ...row,
//       task_name: row.task_name,
//     })),
//     ...eventCoordReviewTasks.map(row => ({
//       ...row,
//       task_name: row.task_name,
//     })),
//     ...socialMediaReviewTasks.map(row => ({
//       ...row,
//       task_name: row.task_name,
//     })),
//   ];
//   // Helper: Build a map of uploaded secretary_main rows by task title for this event
//   const uploadedRowsMap = (uploadedRows || []).reduce((acc, row) => {
//     if (row.task_name) acc[row.task_name] = row;
//     return acc;
//   }, {});
//   // Defensive check before using uploadedRowsMap
//   if (!uploadedRows) return <div>Loading...</div>;
//   // Add these handlers in Secretary.jsx if not already present
//   const handleSocialMediaApprove = async (task) => {
//     // Call the approve handler for social_main
//     await handleApprove(task.task_name, '', { supabase, eventInfo, user, setTaskStatus, tableOverride: 'social_main' });
//   };
//   const handleSocialMediaReject = async (task) => {
//     // Call the reject handler for social_main
//     await handleReject(task, '', { supabase, eventInfo, user, setTaskStatus, tableOverride: 'social_main' });
//   };
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


      
//       <div className="p-3 sm:p-6 animate-fade-in">
//           <div className="mb-4">
//           <Button variant="outline" onClick={() => navigate('/events')} className="text-sm sm:text-base">Back to Events</Button>
//           </div>
//           {/* Enhanced Event Header Component */}
//           <EnhancedEventHeader
//             eventInfo={eventInfo}
//             roleName="Secretary"
//             roleColor="green"
//             showStats={true}
//             stats={{
//               myTasks: myTasksSection.length,
//               uploaded: uploadedSection.length,
//               pendingReviews: pendingReviewTasks.length,
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
//         {section === 'mytasks' && (
//             <div>
//               <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">My Tasks</h2>
//             {myTasksSection.length > 0 ? (
//               myTasksSection.map((task, index) => {
//                   const status = taskStatus[task.task_name];
//                 const dbRow = uploadedRowsMap ? (uploadedRowsMap[task.task_name] || {}) : {};
                
//                 // Debug logging
//                 console.log('DEBUG: Task in My Tasks:', {
//                   taskName: task.task_name,
//                   status: status,
//                   dbRow: dbRow,
//                   isRejected: status?.status === 'rejected',
//                   isUploaded: status?.uploaded
//                 });
                
//                   if (status?.status === 'rejected') {
//                     // Use RejectedTaskHandler for rejected tasks
//                     return (
//                       <RejectedTaskHandler
//                         key={index}
//                         task={task}
//                         status={{ ...status, ...dbRow, event_name: eventInfo?.event_name }}
//                         onDownloadClick={handleDownload}
//                         onRemoveClick={handleRemove}
//                         onReuploadClick={(task, comment) => handleReuploadClick(task, comment)}
//                         role="Secretary"
//                         taskName={task.task_name}
//                       />
//                     );
//                   } else if (status?.uploaded) {
//                     return (
//                       <UploadedTaskRow
//                         key={index}
//                         task={task}
//                         status={{ ...status, ...dbRow, event_name: eventInfo?.event_name }}
//                         onDownloadClick={handleDownload}
//                         onRemoveClick={handleRemove}
//                         onUploadClick={setActiveTask} // Pass for reupload
//                       />
//                     );
//                   } else {
//                     return (
//                       <TaskRow
//                         key={index}
//                         task={task}
//                         status={status}
//                         onUploadClick={setActiveTask}
//                         onApproveClick={async (taskTitle, commentText) => await handleApprove(taskTitle, commentText, { supabase, eventInfo, user, setTaskStatus })}
//                         isReview={false}
//                         locked={eventInfo?.locked}
//                       />
//                     );
//                   }
//                 })
//               ) : (
//                 <div className="min-h-[400px] flex items-center justify-center">
//                   <p className="text-gray-600 dark:text-gray-400">No tasks assigned to you.</p>
//                 </div>
//               )}
//             </div>
//           )}
//         {section === 'uploaded' && (
//             <div>
//               <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Uploaded by Me</h2>
//             {uploadedSection.length > 0 ? (
//               uploadedSection.map((task, index) => {
//                 const status = taskStatus[task.task_name];
//                 const dbRow = uploadedRowsMap ? (uploadedRowsMap[task.task_name] || {}) : {};
//                 return (
//                   <UploadedTaskRow
//                     key={index}
//                     task={task}
//                     status={{ ...status, ...dbRow, event_name: eventInfo?.event_name }}
//                     onDownloadClick={handleDownload}
//                     onRemoveClick={handleRemove}
//                     locked={eventInfo?.locked}
//                   />
//                 );
//               })
//             ) : (
//               <div className="min-h-[400px] flex items-center justify-center">
//                 <p className="text-gray-600 dark:text-gray-400">No tasks uploaded by you.</p>
//               </div>
//             )}
//             </div>
//           )}
//         {section === 'reviews' && (
//           <div className="relative">
//             {/* Current reviewer change loading overlay */}
//             {reviewerChangeLoading && (
//               <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
//                 <div className="flex flex-col items-center gap-3">
//                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//                   <p className="text-sm text-gray-600 dark:text-gray-400">Refreshing pending reviews...</p>
//                 </div>
//               </div>
//             )}
            
//             <PendingReviewsSection
//               sections={(() => {
//                 // Combine all pending review tasks and add tableName property
//                 const reviewsWithTableName = reviewsSection.map(task => ({ ...task, tableName: 'secretary_main' }));
//                 const techCoordWithTableName = techCoordReviewTasks.map(task => ({ ...task, tableName: 'tech_coord_main' }));
//                 const eventCoordWithTableName = eventCoordReviewTasks.map(task => ({ ...task, tableName: 'event_coord_main' }));
//                 const socialMediaWithTableName = socialMediaReviewTasks.map(task => ({ ...task, tableName: 'social_main' }));
                
//                 const allPendingReviews = [
//                   ...reviewsWithTableName,
//                   ...techCoordWithTableName,
//                   ...eventCoordWithTableName,
//                   ...socialMediaWithTableName
//                 ];

//                 // Group tasks by actual sender role using table information
//                 const groupedTasks = {};
//                 allPendingReviews.forEach(task => {
//                   const senderRole = task.tableName ? getSenderRoleFromTable(task.tableName) : 'Unknown Role';
//                   if (!groupedTasks[senderRole]) {
//                     groupedTasks[senderRole] = [];
//                   }
//                   groupedTasks[senderRole].push(task);
//                 });

//                 // Convert grouped tasks to sections format
//                 const sections = Object.entries(groupedTasks).map(([role, tasks], index) => ({
//                   key: `section-${index}`,
//                   title: `From ${role}`,
//                   badgeColor: index === 0 ? 'bg-blue-100 text-blue-800' : 
//                              index === 1 ? 'bg-orange-100 text-orange-800' : 
//                              index === 2 ? 'bg-indigo-100 text-indigo-800' : 
//                              'bg-purple-100 text-purple-800',
//                   tasks: tasks,
//                   taskProps: {}
//                 }));

//                 return sections;
//               })()}
//               onDownloadClick={handleDownload}
//               onRemoveClick={handleRemove}
//               onApproveClick={(task) => {
//                 const status = taskStatus[task.task_name] || {};
//                 const dbRow = uploadedRowsMap ? (uploadedRowsMap[task.task_name] || {}) : {};
//                 const isSocialMediaTableTask = task.task_name === 'Promotion Team Details' || task.sourceTable === 'social_main' || status.sourceTable === 'social_main';
//                 setApprovingTask({ ...task, ...status, ...dbRow, event_name: eventInfo?.event_name, sourceTable: isSocialMediaTableTask ? 'social_main' : undefined });
//               }}
//               onRejectClick={(task) => {
//                 const status = taskStatus[task.task_name] || {};
//                 const dbRow = uploadedRowsMap ? (uploadedRowsMap[task.task_name] || {}) : {};
//                 const isSocialMediaTableTask = task.task_name === 'Promotion Team Details' || task.sourceTable === 'social_main' || status.sourceTable === 'social_main';
//                 setRejectingTask({ ...task, ...status, ...dbRow, event_name: eventInfo?.event_name, sourceTable: isSocialMediaTableTask ? 'social_main' : undefined });
//               }}
//               isLocked={eventInfo?.locked}
//               UploadedTaskRowComponent={UploadedTaskRow}
//             />
//           </div>
//         )}
//         {section === 'approved' && (
//             <div>
//               <h2 className="text-xl font-semibold mb-4 text-green-700 dark:text-green-400">Approved Tasks</h2>
//             {approvedSection.length > 0 ? (
//               approvedSection.map((task, index) => (
//                   <TaskRow
//                     key={index}
//                     task={task}
//                     status={taskStatus[task.task_name]}
//                     onUploadClick={setActiveTask}
//                     onApproveClick={async (taskTitle, commentText) => await handleApprove(taskTitle, commentText, { supabase, eventInfo, user, setTaskStatus })}
//                     isReview={false}
//                     locked={eventInfo?.locked}
//                   />
//                 ))
//               ) : (
//                 <p className="text-gray-600 dark:text-gray-400">No approved tasks.</p>
//               )}
//             </div>
//           )}
//         {section === 'rejected' && (
//             {/* Rejected section removed as per requirements */}
//           )}
//         {/* Dialogs remain unchanged */}
//           <Dialog open={!!activeTask} onOpenChange={() => setActiveTask(null)}>
//             <DialogContent>
//               <DialogHeader>
//                 <DialogTitle>Upload Files for: {activeTask}</DialogTitle>
//               </DialogHeader>
//               <div className="space-y-4">
//                 {/* Drag and drop area */}
//                 <div
//                   style={{ 
//                     border: '2px dashed #ccc', 
//                     borderRadius: 8, 
//                     minHeight: 120, 
//                     display: 'flex', 
//                     alignItems: 'center', 
//                     justifyContent: 'center', 
//                     flexDirection: 'column', 
//                     marginBottom: 16, 
//                     cursor: 'pointer' 
//                   }}
//                   onDrop={(e) => {
//                     e.preventDefault();
//                     const files = Array.from(e.dataTransfer.files);
//                     setSelectedFiles((prev) => ({ ...prev, [activeTask]: files }));
//                     setUploadError(null);
//                   }}
//                   onDragOver={(e) => e.preventDefault()}
//                   onClick={() => document.getElementById('file-input')?.click()}
//                 >
//                   <p>Drag and drop files here, or click to select</p>
//                   <input
//                     id="file-input"
//                     type="file"
//                     multiple
//                     style={{ display: 'none' }}
//                     onChange={handleFileChange}
//                     accept="*/*"
//                   />
//                 </div>
                
//                 {/* Show selected files */}
//                 {selectedFiles[activeTask] && selectedFiles[activeTask].length > 0 && (
//                   <div className="space-y-2">
//                     <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
//                       Selected Files ({selectedFiles[activeTask].length}):
//                     </h4>
//                     <div 
//                       style={selectedFiles[activeTask].length > 5 ? { 
//                         minHeight: 40, 
//                         marginBottom: 16, 
//                         maxHeight: 200, 
//                         overflowY: 'auto' 
//                       } : { 
//                         minHeight: 40, 
//                         marginBottom: 16 
//                       }}
//                     >
//                       {selectedFiles[activeTask].map((file, index) => (
//                         <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
//                           <span style={{ flex: 1 }}>{file.name}</span>
//                           <Button
//                             variant="ghost"
//                             size="icon"
//                             onClick={() => handleRemoveFile(activeTask, index)}
//                             className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300"
//                           >
//                             <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
//                               <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
//                             </svg>
//                           </Button>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 )}
                
//               {uploadError && <p className="text-red-500 text-sm my-2">{uploadError}</p>}
//               </div>
//               <DialogFooter>
//                 <Button 
//                   onClick={handleUpload} 
//                   disabled={!selectedFiles[activeTask] || selectedFiles[activeTask].length === 0 || isUploading}
//                 >
//                   {isUploading ? (
//                     <span className="flex items-center">
//                       <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
//                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
//                       </svg>
//                       Uploading...
//                     </span>
//                   ) : (
//                     `Upload ${selectedFiles[activeTask]?.length || 0} File${selectedFiles[activeTask]?.length !== 1 ? 's' : ''}`
//                   )}
//                 </Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//           <Dialog open={!!rejectingTask} onOpenChange={() => { setRejectingTask(null); setRejectComment(''); }}>
//             <DialogContent>
//               <DialogHeader>
//                 <DialogTitle>Reject Task: {rejectingTask?.task_name}</DialogTitle>
//               </DialogHeader>
//               <Textarea
//                 placeholder="Add a comment (optional)"
//                 value={rejectComment}
//                 onChange={e => setRejectComment(e.target.value)}
//                 className="my-4 min-h-[100px]"
//                 disabled={isRejecting}
//               />
//               <DialogFooter className="flex gap-3">
//                 <Button variant="outline" onClick={() => { setRejectingTask(null); setRejectComment(''); }} disabled={isRejecting}>
//                   Cancel
//                 </Button>
//                 <Button
//                   variant="destructive"
//                   onClick={async () => {
//                     console.log('[DEBUG][Modal Reject Button] clicked', rejectingTask);
//                     try {
//                       await handleReject(rejectingTask, { supabase, eventInfo, user, setIsRejecting, rejectComment, fetchEventDetailsAndTaskStatus, setTaskStatus, setEventInfo, setIsLoading });
                      
//                       // Show processing state and auto-refresh immediately
//                       setIsProcessingAction(true);
//                       setTimeout(() => {
//                         window.location.reload();
//                       }, 1000);
//                     } catch (err) {
//                       console.error('[DEBUG][Modal Reject Button] error:', err);
//                     }
//                   }}
//                   disabled={isRejecting}
//                 >
//                   Reject
//                 </Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//           <Dialog open={!!approvingTask} onOpenChange={() => { setApprovingTask(null); setApproveComment(''); }}>
//             <DialogContent>
//               <DialogHeader>
//                 <DialogTitle>Approve Task: {approvingTask?.task_name}</DialogTitle>
//               </DialogHeader>
//               <Textarea
//                 placeholder="Add a comment (optional)"
//                 value={approveComment}
//                 onChange={e => setApproveComment(e.target.value)}
//                 className="my-4 min-h-[100px]"
//                 disabled={isApproving}
//               />
//               <DialogFooter className="flex gap-3">
//                 <Button variant="outline" onClick={() => { setApprovingTask(null); setApproveComment(''); }} disabled={isApproving}>
//                   Cancel
//                 </Button>
//                 <Button variant="success" onClick={async () => {
//                   setIsApproving(true);
//                   // Determine the correct table for approval
//                   let tableOverride = undefined;
//                   if (approvingTask?.sourceTable) {
//                     tableOverride = approvingTask.sourceTable;
//                   } else if (approvingTask?.id && approvingTask?.event_name && approvingTask?.current_reviewer === 'Secretary') {
//                     // If the task is from event_coord_main (Event Coordinator review)
//                     tableOverride = 'event_coord_main';
//                   }
//                   await handleApproveWithComment(
//                     approvingTask.task_name,
//                     approveComment,
//                     {
//                       supabase,
//                       eventInfo,
//                       user,
//                       setTaskStatus,
//                       fetchEventDetailsAndTaskStatus,
//                       tableOverride
//                     }
//                   );
//                   setIsApproving(false);
//                   setApprovingTask(null);
//                   setApproveComment('');
                  
//                   // Show processing state and auto-refresh immediately
//                   setIsProcessingAction(true);
//                   setTimeout(() => {
//                     window.location.reload();
//                   }, 1000);
//                 }} disabled={isApproving}>
//                   Approve
//                 </Button>
//               </DialogFooter>
//             </DialogContent>
//           </Dialog>
//         </div>
//       </>
//   );
//   }
// };

// // Wrap the export in TasksProvider
// const SecretaryWithTasks = (props) => (
//   <TasksProvider>
//     <Secretary {...props} />
//   </TasksProvider>
// );

// export default SecretaryWithTasks; 