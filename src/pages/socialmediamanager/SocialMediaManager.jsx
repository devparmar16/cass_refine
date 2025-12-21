// // --- MINIMAL SOCIAL MEDIA MANAGER PAGE ---
// // This file now only supports:
// // 1. All roles can see events created by chair in /events tab and view event (with /mytasks, /review, /uploaded tabs, even if empty)
// // 2. The assign button logic as implemented today

// import React, { useEffect, useState } from 'react';
// import supabase from '../../lib/supabase';

// const user = { role: 'Social Media Manager', email: 'smm@example.com' };

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

// const SocialMediaManager = () => {
//   const [selectedEvent, setSelectedEvent] = useState(null);
//   return (
//     <div style={{ padding: 32 }}>
//       <h1>Social Media Manager Events Page</h1>
//       {!selectedEvent ? (
//         <ChairEventsList onSelectEvent={setSelectedEvent} />
//       ) : (
//         <EventView event={selectedEvent} onBack={() => setSelectedEvent(null)} />
//       )}
//     </div>
//   );
// };

// export default SocialMediaManager;
// import { useNavigate, useParams } from 'react-router-dom';
// import { supabase } from '@/lib/supabase';
// import { useAuth } from '@/contexts/AuthContext';
// import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Input } from '@/components/ui/input';
// import { Textarea } from '@/components/ui/textarea';
// import { Clock, CheckCircle, AlertCircle, FileText, Users, TrendingUp, Calendar, X } from 'lucide-react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
// // Remove: import { taskList } from './TaskData';
// import UploadedTaskRow from '../vicechair/UploadedTaskRow';
// import FileViewer from '../components/FileViewer';
// import RemoveButton from '../../components/RemoveButton';
// import RejectedTaskHandler from '../../components/RejectedTaskHandler';
// import { handleSubmitLinks } from './handlesubmitlinks';
// import { handlePhotoUploadToSupabase } from './handlephotouploadtosupabase';
// import { useTaskComments } from '@/hooks/useTaskComments';
// import CommentDisplay from '@/components/CommentDisplay';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { XCircle, Upload, Download, Eye, Trash2, Plus } from 'lucide-react';
// import { insertTaskComment } from '../../lib/insertTaskComment';
// import ReviewProgressBadges from '@/components/ReviewProgressBadges';
// import { getSenderRoleFromTable } from '@/lib/utils';
// import { TasksProvider, useTasks } from '@/contexts/TasksContext';
// import PendingReviewsSection from '@/components/PendingReviewsSection';
// import EnhancedEventHeader from '@/components/EnhancedEventHeader';
// import { useTableChangeTrigger } from '@/hooks/useTableChangeTrigger';
// import { default as AllEventsList } from '@/components/AllEventsList';
// const SocialMediaManager = ({ eventId: propEventId, section: propSection }) => {
//   const params = useParams();
//   console.log('DEBUG: URL params:', params);

//   // State variables (mirroring Vice Chair dashboard)
//   const [eventInfo, setEventInfo] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [stats, setStats] = useState([]);
//   const [recentActivities, setRecentActivities] = useState([]);
//   const [upcomingEvents, setUpcomingEvents] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [tasks, setTasks] = useState([]);
//   const [taskStatus, setTaskStatus] = useState({});
//   const [selectedFiles, setSelectedFiles] = useState({});
//   const [activeTask, setActiveTask] = useState(null);
//   const [viewMode, setViewMode] = useState(params.section || 'mytasks');
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadError, setUploadError] = useState(null);
//   const [rejectingTask, setRejectingTask] = useState(null);
//   const [rejectComment, setRejectComment] = useState('');
//   const [isRejecting, setIsRejecting] = useState(false);
//   const [isProcessingAction, setIsProcessingAction] = useState(false);

//   const [removingTaskId, setRemovingTaskId] = useState(null);
//   const [showPhotoUploadDialog, setShowPhotoUploadDialog] = useState(false);
//   const [photoUploadFiles, setPhotoUploadFiles] = useState([]);
//   const [photoUploadTaskType, setPhotoUploadTaskType] = useState(null); // 'geo' or 'non_geo'
//   const fileInputRef = useRef(null);
//   const [showViewModal, setShowViewModal] = useState(false);
//   const [viewFiles, setViewFiles] = useState([]);
//   const [viewModalTitle, setViewModalTitle] = useState('');

//   // State for social media links modal
//   const [showLinksModal, setShowLinksModal] = useState(false);
//   const [links, setLinks] = useState([{ name: '', url: '' }]);
//   const [linksError, setLinksError] = useState('');
//   const [isLinksUploading, setIsLinksUploading] = useState(false);
//   const [activeLinksTask, setActiveLinksTask] = useState(null);

//   // Add state for viewing links modal
//   const [showLinksViewModal, setShowLinksViewModal] = useState(false);
//   const [viewLinks, setViewLinks] = useState([]);
//   const [viewLinksTitle, setViewLinksTitle] = useState('');

//   // Add state for files modal
//   const [showFilesModal, setShowFilesModal] = useState(false);
//   const [modalFiles, setModalFiles] = useState([]);
//   const [modalTitle, setModalTitle] = useState('');

//   // Add state for link reupload info
//   const [linkReuploadInfo, setLinkReuploadInfo] = useState(null);

//   // Now determine eventId after eventInfo is declared
//   const eventId = propEventId || params.eventId || params.id || eventInfo?.id;
//   console.log('DEBUG: Determined eventId:', eventId);

//   // Table change trigger for monitoring social_main table (only when eventId is available)
//    // Determine if any uploads exist for this event
//     // Determine if any uploads exist for this event
//     const hasAnyUploads = React.useMemo(() => {
//       return taskStatus && Object.keys(taskStatus || {}).length > 0;
//     }, [taskStatus]);
  
//     // Disable polling while modal open OR before any upload exists
//     const tableToMonitor = (!showPhotoUploadDialog && hasAnyUploads) ? 'social_main' : null;
  
//     const { isLoading: tableChangeLoading, lastCheck } = useTableChangeTrigger(
//       tableToMonitor,
//       eventId,
//       'Social Media Manager',
//       async () => {
//         // Never reload the page; just refresh task status in memory
//         await refreshTaskStatus(eventId);
//       },
//       5000,
//       // Only trigger for final state changes
//       (currentData, previousData) => {
//         if (!currentData || !previousData) return false;
//         if (currentData.length < previousData.length) return false;
  
//         for (let i = 0; i < currentData.length; i++) {
//           const c = currentData[i];
//           const p = previousData.find(x => x.id === c.id);
//           if (!p) continue;
  
//           if ((!p.status || p.status === 'null' || p.status === null) && c.status === 'pending') return false; // normal upload
//           if (p.status === 'rejected' && c.status === 'pending') return false; // reupload
//           if (p.status === 'pending' && (c.status === 'approved' || c.status === 'rejected')) return true; // final
//         }
//         return false;
//       }
//     );
//   console.log('DEBUG: Determined eventId:', eventId);
//   const { user } = useAuth();
//   const navigate = useNavigate();

//   // Debug wrapper for setShowFilesModal
//   const setShowFilesModalWithDebug = (value) => {
//     console.log('DEBUG: setShowFilesModal called with:', value);
//     setShowFilesModal(value);
//   };

//   // Debug wrapper for setActiveTask
//   const setActiveTaskWithDebug = (task) => {
//     console.log('DEBUG: setActiveTask called with:', task);
//     setActiveTask(task);
//   };

//   // Helper to refresh task status after removal
//   const refreshTaskStatus = async (eventIdArg) => {
//     const currentEventId = eventIdArg || eventId;
//     if (!currentEventId) {
//       console.error('No eventId available for refreshTaskStatus');
//       return;
//     }
    
//     const { data, error } = await supabase
//       .from('social_main')
//       .select('*')
//       .eq('event_id', currentEventId);
//     if (!error && Array.isArray(data)) {
//       const statusMap = {};
//       data.forEach(row => {
//         statusMap[row.task_id] = row;
//       });
//       setTaskStatus(statusMap);
//     }
//   };

//   // Sync viewMode with URL param
//   useEffect(() => {
//     if (params.section && params.section !== viewMode) {
//       setViewMode(params.section);
//     }
//     // eslint-disable-next-line
//   }, [params.section]);

//   // Listen for task removal events
//   useEffect(() => {
//     const handleTaskRemoved = () => {
//       // Refresh task status when a task is removed
//       refreshTaskStatus();
//     };

//     window.addEventListener('taskRemoved', handleTaskRemoved);
    
//     return () => {
//       window.removeEventListener('taskRemoved', handleTaskRemoved);
//     };
//   }, []);

//   // Fetch event info and analytics
//   useEffect(() => {
//     if (!user) return;
//     setLoading(true);
//     const fetchStats = async () => {
//       // Fetch all events (future or today)
//       const { data: events, error: eventsError } = await supabase
//         .from('events')
//         .select('id, event_name, event_date');
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
//       // Fetch all assigned tasks for social media manager
//       const { data: assignedTasks, error: assignedError } = await supabase
//         .from('social_main')
//         .select('id, status');
//       setStats([
//         {
//           title: 'Events',
//           value: upcoming.length,
//           icon: Calendar,
//           color: 'text-blue-600',
//           clickHandler: () => navigate('/events'),
//         },
//         {
//           title: 'Assigned Tasks',
//           value: assignedTasks?.length || 0,
//           icon: FileText,
//           color: 'text-green-600',
//           clickHandler: () => navigate('/tasks'),
//         },
//         {
//           title: 'Pending Tasks',
//           value: assignedTasks?.filter((t) => t.status === 'pending').length || 0,
//           icon: Clock,
//           color: 'text-orange-600',
//           clickHandler: () => navigate('/tasks'),
//         },
//         {
//           title: 'Completed',
//           value: assignedTasks?.filter((t) => t.status === 'approved').length || 0,
//           icon: CheckCircle,
//           color: 'text-purple-600',
//           clickHandler: () => navigate('/tasks'),
//         },
//       ]);
//       setRecentActivities([]); // Placeholder for now
//       setLoading(false);
//     };
//     fetchStats();
//   }, [user, eventId, navigate]);

//   // Fetch event info if eventId is present
//   useEffect(() => {
//     if (!eventId) return;
//     setIsLoading(true);
//     const fetchEventInfo = async () => {
//       const { data, error } = await supabase
//         .from('events')
//         .select('event_name, event_desc, locked')
//         .eq('id', eventId)
//         .single();
//       if (!error && data) setEventInfo({ ...data, locked: !!data.locked });
//         setIsLoading(false);
//     };
//     fetchEventInfo();
//   }, [eventId]);

//   // Use tasks from context instead of direct query
//   const { tasks: contextTasks, loading: contextLoading } = useTasks();
  
//   // Fetch tasks for Social Media Promotion Manager
//   useEffect(() => {
//     if (contextTasks && Array.isArray(contextTasks)) {
//       // Parse roles if needed and filter for Social Media Promotion Manager
//       const filtered = contextTasks.filter((task) => {
//         let roles = task.roles;
//         if (typeof roles === 'string') {
//           // Split by comma if needed, trim spaces
//           roles = roles.split(',').map(r => r.trim());
//         }
//         const hasRole = roles.includes('Social Media Promotions Manager') || roles.includes('Social Media & Promotions Manager');
//         return hasRole;
//       });
//       setTasks(filtered);
//     }
//   }, [contextTasks]);

//   // Fetch event-specific task status from social_media_main
//   useEffect(() => {
//     if (!eventId) return;
//     setIsLoading(true);
//     const fetchTaskStatus = async () => {
//       console.log('DEBUG: fetchTaskStatus called with eventId:', eventId);
      
//       // First, let's see what event_ids exist in social_main table
//       const { data: allEvents, error: allEventsError } = await supabase
//         .from('social_main')
//         .select('event_id, event_name, task_id, status')
//         .order('event_id');
//       console.log('DEBUG: All events in social_main:', allEvents);
      
//       const { data, error } = await supabase
//         .from('social_main')
//         .select('*')
//         .eq('event_id', eventId);
//       console.log('DEBUG: fetchTaskStatus result:', { data, error, eventId });
//       if (!error && Array.isArray(data)) {
//         const statusMap = {};
//         data.forEach(row => {
//           statusMap[row.task_id] = row;
//         });
//         setTaskStatus(statusMap);
//         console.log('DEBUG: setTaskStatus with:', statusMap);
//       }
//       setIsLoading(false);
//     };
//     fetchTaskStatus();
//   }, [eventId]);

//   // Add this after all your useEffect hooks
//   // Temporary fix for NULL event_id
//   useEffect(() => {
//     if (!eventId) return;
//     const fixNullEventId = async () => {
//       const { error } = await supabase
//         .from('social_main')
//         .update({ event_id: eventId })
//         .is('event_id', null)
//         .eq('task_id', 't_pt');
//       if (error) {
//         console.error('Failed to fix NULL event_id:', error);
//       } else {
//         // Refresh task status
//         const { data, error: refreshError } = await supabase
//           .from('social_main')
//           .select('*')
//           .eq('event_id', eventId);
//         if (!refreshError && Array.isArray(data)) {
//           const statusMap = {};
//           data.forEach(row => {
//             statusMap[row.task_id] = row;
//           });
//           setTaskStatus(statusMap);
//         }
//       }
//     };
//     fixNullEventId();
//   }, [eventId]);

//   // Tab change handler
//   const handleTabChange = (mode) => {
//     setViewMode(mode);
//     // Always use 'socialmediapromotionsmanager' as the URL role segment
//     if (eventId) {
//       navigate(`/event-tasks/${eventId}/socialmediapromotionsmanager/${mode}`);
//     }
//   };

//   // --- Upload logic ---
//   // Handler for upload button click
//     // --- Upload logic ---
//   // Handler for upload button click
//   // --- Upload logic ---
// // Handler for upload button click
// const handleUploadClick = (taskId) => {
//   console.log('DEBUG handleUploadClick: taskId =', taskId);
//   const task = tasks.find(t => t.task_id === taskId);
//   console.log('DEBUG handleUploadClick: found task =', task);
//   if (!task) return;

//   // Parse data_format if present
//   let dataFormat = task.data_format;
//   if (typeof dataFormat === 'string') {
//     try {
//       dataFormat = JSON.parse(dataFormat);
//     } catch {
//       dataFormat = null;
//     }
//   }
//   console.log('DEBUG handleUploadClick: dataFormat =', dataFormat);

//   // Normalize task name for robust matching
//   const normalized = (task.task_name || '')
//     .toLowerCase()
//     .replace(/[\\/]/g, ' ')
//     .replace(/\s+/g, ' ')
//     .trim();
  
//   console.log('DEBUG handleUploadClick: normalized task name =', normalized);

//   // Name-based mapping (modal type), independent of data_format
//   let type = null;
//   if (normalized === 'geo-tagged event photographs') type = 'geo';
//   else if (normalized === 'standard event photos') type = 'non_geo';
//   else if (normalized === 'event banner design') type = 'banner';
//   else if (normalized === 'event highlight video' || normalized === 'event highlights video') type = 'event_highlights';
//   else if (task.task_name === 'Certificates for Volunteers') type = 'certi_volunteers';
//   else if (task.task_name === 'Certificates for Participants') type = 'certi_participants';
//   else if (task.task_name === 'Certificates for Guest Speakers') type = 'certi_guest';

//   console.log('DEBUG handleUploadClick: determined type =', type);

//   // If not determined by name, fall back to doc_type for media-like tasks
//   if (!type && dataFormat && (dataFormat.doc_type === 'photos' || dataFormat.doc_type === 'video' || dataFormat.doc_type === 'multi_file')) {
//     type = 'multi_file';
//     console.log('DEBUG handleUploadClick: using fallback type from doc_type =', type);
//   }

//   // Open the SAME modal used for geo/non-geo for any of the above types
//   if (type) {
//     console.log('DEBUG handleUploadClick: opening photo upload dialog with type =', type);
//     setPhotoUploadTaskType(type);
//     setPhotoUploadFiles([]);
//     setShowPhotoUploadDialog(true);
//     // Don't set activeTask for photo uploads - it uses its own dialog
//     return;
//   }

//   console.log('DEBUG handleUploadClick: checking for table/link tasks...');

//   // Handle Promotion Team Details task (table format)
//   if (task.task_name === 'Promotion Team Details' || (dataFormat && dataFormat.doc_type === 'table')) {
//     console.log('DEBUG handleUploadClick: opening table for Promotion Team Details');
//     // Create a temporary row for table entry (will be properly created on submit)
//     const tempRowId = `temp_${Date.now()}`;
//     // Redirect to the promotion team table page with temp ID and task info
//     navigate(`/promotion-team/${tempRowId}/table`, { 
//       state: { 
//         isTempRow: true,
//         taskId: taskId,
//         taskName: task.task_name,
//         eventName: eventInfo?.event_name,
//         eventId: eventId
//       } 
//     });
//     return;
//   }

//   // Handle Social Media Promotion Links task (link format)
//   if (task.task_name === 'Social Media Promotion Links' || (dataFormat && dataFormat.doc_type === 'link')) {
//     console.log('DEBUG handleUploadClick: opening links modal');
//     setActiveLinksTask(taskId);
//     setLinks([{ name: '', url: '' }]);
//     setLinksError('');
//     setShowLinksModal(true);
//     return;
//   }

//   // Default case - show error or do nothing
//   console.warn('DEBUG handleUploadClick: No handler for task:', task.task_name);
// };

//   // --- File selection handler ---
//   const handleFileChange = (e) => {
//     const files = Array.from(e.target.files);
//     console.log('DEBUG: handleFileChange called with files:', files);
//     console.log('DEBUG: activeTask in handleFileChange:', activeTask);
//     console.log('DEBUG: selectedFiles before update:', selectedFiles);
    
//     // Handle both string and object activeTask values
//     let taskKey;
//     if (activeTask && typeof activeTask === 'object' && activeTask.isReupload) {
//       // For reuploads, use task_id as the key
//       taskKey = activeTask.task_id || activeTask.taskId;
//     } else if (activeTask) {
//       // For regular uploads, use activeTask directly
//       taskKey = activeTask;
//     } else {
//       // Handle null activeTask
//       console.error('activeTask is null in handleFileChange');
//       return;
//     }
    
//     console.log('DEBUG: Using taskKey:', taskKey);
    
//     setSelectedFiles((prev) => {
//       const newState = { ...prev, [taskKey]: files };
//       console.log('DEBUG: selectedFiles after update:', newState);
//       return newState;
//     });
//     setUploadError(null);
//   };

//   // Helper function to get the next rejection number for a task
//   const getNextRejectionNumber = async (eventName, taskId) => {
//     try {
//       // Get task info to determine the correct folder
//       const { data: taskData, error: taskError } = await supabase
//         .from('tasks')
//         .select('task_name')
//         .eq('task_id', taskId)
//         .single();
      
//       if (taskError) {
//         console.log('Error getting task data, defaulting to rejection 1');
//         return 1;
//       }
      
//       // Determine the task-based folder - only for file-based tasks
//       let taskFolder;
//       if (taskData.task_name === 'Geo-tagged Event Photographs') taskFolder = 'geo_tag';
//       else if (taskData.task_name === 'Standard Event Photos') taskFolder = 'non_geo_tag';
//       else if (taskData.task_name === 'Event Banner Design') taskFolder = 'event_banner';
//       else if (taskData.task_name === 'Social Media Promotion Links') taskFolder = 'none';
//       else if (taskData.task_name === 'Event Highlight Video') taskFolder = 'event_highlights';
//       else if (taskData.task_name === 'Certificates for Volunteers') taskFolder = 'certi_volunteers';
//       else if (taskData.task_name === 'Certificates for Participants') taskFolder = 'certi_participants';
//       else if (taskData.task_name === 'Certificates for Guest Speakers') taskFolder = 'certi_guest';
//       else taskFolder = 'none'; // No folder for other tasks - they store data directly in tables
      
//       // List all files in the rejected folder to find the highest rejection number
//       const eventFolder = `${eventName.replace(/\s+/g, '_')}_${eventId}`;
//       const rejectedFolderPath = taskFolder === 'none' 
//         ? `${eventFolder}/rejected`
//         : `${taskFolder}/${eventFolder}/rejected`;
      
//       const { data: files, error } = await supabase.storage
//         .from('social')
//         .list(rejectedFolderPath);
      
//       if (error) {
//         console.log('No rejected folder exists yet, starting with rejection 1');
//         return 1;
//       }
      
//       // Find files with rejection prefixes for this task
//       const taskRejectionFiles = files.filter(file => 
//         file.name.startsWith(`rejected`) && file.name.includes(taskId)
//       );
      
//       if (taskRejectionFiles.length === 0) {
//         return 1;
//       }
      
//       // Extract rejection numbers and find the highest
//       const rejectionNumbers = taskRejectionFiles.map(file => {
//         const match = file.name.match(/rejected(\d+)_/);
//         return match ? parseInt(match[1]) : 0;
//       });
      
//       const maxRejectionNumber = Math.max(...rejectionNumbers, 0);
//       return maxRejectionNumber + 1;
//     } catch (error) {
//       console.log('Error getting rejection number, defaulting to 1:', error);
//       return 1;
//     }
//   };

//   // Helper function to ensure rejected folder exists
//   const ensureRejectedFolderExists = async (eventName, taskId) => {
//     try {
//       // Get task info to determine the correct folder
//       const { data: taskData, error: taskError } = await supabase
//         .from('tasks')
//         .select('task_name')
//         .eq('task_id', taskId)
//         .single();
      
//       if (taskError) {
//         console.log('Error getting task data for rejected folder creation');
//         return;
//       }
      
//       // Determine the task-based folder - only for file-based tasks
//       let taskFolder;
//       if (taskData.task_name === 'Geo-tagged Event Photographs') taskFolder = 'geo_tag';
//       else if (taskData.task_name === 'Standard Event Photos') taskFolder = 'non_geo_tag';
//       else if (taskData.task_name === 'Event Banner Design') taskFolder = 'event_banner';
//       else if (taskData.task_name === 'Social Media Promotion Links') taskFolder = 'none';
//       else if (taskData.task_name === 'Event Highlight Video') taskFolder = 'event_highlights';
//       else if (taskData.task_name === 'Certificates for Volunteers') taskFolder = 'certi_volunteers';
//       else if (taskData.task_name === 'Certificates for Participants') taskFolder = 'certi_participants';
//       else if (taskData.task_name === 'Certificates for Guest Speakers') taskFolder = 'certi_guest';
//       else taskFolder = 'none'; // No folder for other tasks - they store data directly in tables
      
//       const eventFolder = `${eventName.replace(/\s+/g, '_')}_${eventId}`;
//       const rejectedFolderPath = taskFolder === 'none' 
//         ? `${eventFolder}/rejected`
//         : `${taskFolder}/${eventFolder}/rejected`;
      
//       // Try to list the folder to see if it exists
//       const { data, error } = await supabase.storage
//         .from('social')
//         .list(rejectedFolderPath);
      
//       if (error) {
//         // Folder doesn't exist, create it by uploading a placeholder file
//         const placeholderBlob = new Blob([''], { type: 'text/plain' });
//         await supabase.storage
//           .from('social')
//           .upload(`${rejectedFolderPath}/.placeholder`, placeholderBlob);
        
//         // Remove the placeholder file
//         await supabase.storage
//           .from('social')
//           .remove([`${rejectedFolderPath}/.placeholder`]);
//       }
//     } catch (error) {
//       console.log('Error ensuring rejected folder exists:', error);
//     }
//   };

//   // --- File upload handler ---
//   const handleUpload = async () => {
//     try {
//       // DEBUG LOG
//       console.log('DEBUG: Upload handler triggered (file)');
//       console.log('DEBUG: activeTask:', activeTask);
//       console.log('DEBUG: typeof activeTask:', typeof activeTask);
//       console.log('DEBUG: activeTask.isReupload:', activeTask?.isReupload);
//       console.log('DEBUG: activeTask.existingRowId:', activeTask?.existingRowId);
      
//       setIsUploading(true);
//       setUploadError(null);
      
//       // Handle both regular uploads and reuploads
//       let taskId = activeTask;
//       let taskObj = null;
//       let isReupload = false;
//       let existingRowId = null;
      
//       if (typeof activeTask === 'object' && activeTask.isReupload) {
//         // This is a reupload
//         taskId = activeTask.task_id || activeTask.taskId;
//         taskObj = activeTask;
//         isReupload = true;
//         existingRowId = activeTask.existingRowId;
//         console.log('DEBUG: Reupload detected for task:', taskId);
//         console.log('DEBUG: existingRowId:', existingRowId);
//       } else {
//         // This is a regular upload
//         taskId = activeTask;
//         taskObj = tasks.find(t => t.task_id === activeTask);
//         console.log('DEBUG: Regular upload for task:', taskId);
//       }
      
//       console.log('DEBUG: Final values - taskId:', taskId, 'isReupload:', isReupload, 'existingRowId:', existingRowId);
      
//       if (!taskObj) throw new Error('Task not found.');
      
//       const files = selectedFiles[taskId];
//       if (!files || files.length === 0) throw new Error('No files selected.');
      
//       // Fetch review_role from tasks table using task_id
//       const { data: taskDef, error: taskError } = await supabase
//         .from('tasks')
//         .select('review_role')
//         .eq('task_id', taskId)
//         .single();
//       let reviewRoleArr = [];
//       if (Array.isArray(taskDef?.review_role)) {
//         reviewRoleArr = taskDef.review_role;
//       } else if (typeof taskDef?.review_role === 'string') {
//         try {
//           reviewRoleArr = JSON.parse(taskDef.review_role);
//         } catch {
//           reviewRoleArr = taskDef.review_role.replace(/[{}]/g, '').split(',').map(r => r.trim()).filter(r => r.length > 0);
//         }
//       }
//       const firstReviewer = reviewRoleArr.length > 0 ? reviewRoleArr[0] : null;
//       console.log('DEBUG: taskDef:', taskDef);
//       console.log('DEBUG: review_role type:', typeof taskDef?.review_role, 'value:', taskDef?.review_role);
      
//       // Log right before insert
//       console.log('DEBUG: About to insert with current_reviewer:', firstReviewer, 'review_role:', reviewRoleArr);
      
//       // Use the correct bucket and folder for social media manager
//       const bucket = 'social';
//       // Event folder name
//       const eventFolder = `${eventInfo.event_name.replace(/\s+/g, '_')}_${eventId}`;
      
//       // Determine the task-based folder - only for file-based tasks
//       let taskFolder;
//       if (taskObj.task_name === 'Geo-tagged Event Photographs') taskFolder = 'geo_tag';
//       else if (taskObj.task_name === 'Standard Event Photos') taskFolder = 'non_geo_tag';
//       else if (taskObj.task_name === 'Event Banner Design') taskFolder = 'event_banner';
//       else if (taskObj.task_name === 'Social Media Promotion Links') taskFolder = 'none';
//       else if (taskObj.task_name === 'Event Highlight Video') taskFolder = 'event_highlights';
//       else if (taskObj.task_name === 'Certificates for Volunteers') taskFolder = 'certi_volunteers';
//       else if (taskObj.task_name === 'Certificates for Participants') taskFolder = 'certi_participants';
//       else if (taskObj.task_name === 'Certificates for Guest Speakers') taskFolder = 'certi_guest';
//       else taskFolder = 'none'; // No folder for other tasks - they store data directly in tables
      
//       // Upload multiple files
//       const fileLinkArr = [];
      
//       for (let i = 0; i < files.length; i++) {
//         const file = files[i];
//       const ext = file.name.split('.').pop();
//         const base = `${eventId}_${taskId}`;
//         let finalFileName = `${base}_${i + 1}.${ext}`;
//       let finalFilePath = taskFolder === 'none' ? `${eventFolder}/${finalFileName}` : `${taskFolder}/${eventFolder}/${finalFileName}`;
        
//         // Add "reuploaded" prefix for reuploads
//         if (isReupload) {
//           finalFileName = `reuploaded_${finalFileName}`;
//           finalFilePath = taskFolder === 'none' ? `${eventFolder}/${finalFileName}` : `${taskFolder}/${eventFolder}/${finalFileName}`;
//         }
        
//       // Ensure no overwrite
//       let counter = 1;
//       while (true) {
//         const listPath = taskFolder === 'none' ? `${eventFolder}` : `${taskFolder}/${eventFolder}`;
//         const { data: exists } = await supabase.storage.from(bucket).list(listPath, { search: finalFileName });
//         if (!exists || !exists.find(f => f.name === finalFileName)) break;
//           finalFileName = `${base}_${i + 1}_${counter++}.${ext}`;
//           if (isReupload) {
//             finalFileName = `reuploaded_${finalFileName}`;
//           }
//         finalFilePath = taskFolder === 'none' ? `${eventFolder}/${finalFileName}` : `${taskFolder}/${eventFolder}/${finalFileName}`;
//       }
        
//       // Upload file
//       const { error: uploadError } = await supabase.storage.from(bucket).upload(finalFilePath, file);
//         if (uploadError) throw new Error(`File upload failed for ${file.name}: ${uploadError.message}`);
        
//       // Store as array of file objects for consistency
//       const publicUrl = taskFolder === 'none' 
//         ? `https://pfitttbkoyglznojhozc.supabase.co/storage/v1/object/public/${bucket}/${eventFolder}/${finalFileName}`
//         : `https://pfitttbkoyglznojhozc.supabase.co/storage/v1/object/public/${bucket}/${taskFolder}/${eventFolder}/${finalFileName}`;
//         fileLinkArr.push({ name: finalFileName, url: publicUrl });
//       }
      
//       // Insert or update in social_main
//       const { data: eventData, error: eventError } = await supabase
//         .from('events')
//         .select('event_name')
//         .eq('id', eventId)
//         .single();
//       if (eventError || !eventData) throw new Error('Failed to fetch event name.');
//       const eventName = eventData.event_name;
      
//       console.log('DEBUG: About to handle database operation - isReupload:', isReupload, 'existingRowId:', existingRowId);
      
//       if (isReupload && existingRowId) {
//         // Update the existing rejected row using the provided ID
//         console.log('DEBUG: Updating existing row with ID:', existingRowId);
//         const { data: updatedRows, error: updateError } = await supabase
//           .from('social_main')
//           .update({
//             file_link: fileLinkArr,
//             status: 'pending',
//             uploaded_at: new Date().toISOString(),
//             current_reviewer: firstReviewer,
//             review_status: [],
//           })
//           .eq('id', existingRowId)
//           .select();
//         console.log('DEBUG: Updated rows:', updatedRows, 'Error:', updateError);
//         if (updateError) throw new Error('Failed to update rejected row.');
//       } else if (isReupload) {
//         // For reuploads without existingRowId, find the rejected row and update it
//         console.log('DEBUG: Reupload without existingRowId, finding rejected row...');
//         const { data: existingRows, error: existingError } = await supabase
//           .from('social_main')
//           .select('id')
//           .eq('event_name', eventName)
//           .eq('task_id', taskId)
//           .eq('status', 'rejected')
//           .single();
        
//         console.log('DEBUG: Found rejected row:', existingRows, 'Error:', existingError);
        
//         if (existingError && existingError.code !== 'PGRST116') {
//           console.error('Error finding rejected row:', existingError);
//           throw new Error('Failed to find rejected row for reupload.');
//         }
        
//         if (existingRows) {
//           // Update the existing rejected row
//           console.log('DEBUG: Updating existing rejected row with ID:', existingRows.id);
//           const { data: updatedRows, error: updateError } = await supabase
//             .from('social_main')
//             .update({
//               file_link: fileLinkArr,
//               status: 'pending',
//               uploaded_at: new Date().toISOString(),
//               current_reviewer: firstReviewer,
//               review_status: [],
//             })
//             .eq('id', existingRows.id)
//             .select();
//           console.log('DEBUG: Updated rows:', updatedRows, 'Error:', updateError);
//           if (updateError) throw new Error('Failed to update rejected row.');
//         } else {
//           throw new Error('No rejected row found to reupload.');
//         }
//       } else {
//         console.log('DEBUG: Not a reupload, checking for existing rejected row...');
//       // Check for existing rejected row for this task/event
//       const { data: existingRows, error: existingError } = await supabase
//         .from('social_main')
//         .select('id')
//         .eq('event_name', eventName)
//           .eq('task_id', taskId)
//         .eq('status', 'rejected');
//         console.log('DEBUG: Existing rows check:', existingRows, 'Error:', existingError);
//       if (existingError) throw new Error('Failed to check for existing rejected row.');
//       if (existingRows && existingRows.length > 0) {
//         // Update the existing rejected row
//           console.log('DEBUG: Found existing rejected row, updating...');
//         const { data: updatedRows, error: updateError } = await supabase
//           .from('social_main')
//           .update({
//             file_link: fileLinkArr,
//             status: 'pending',
//             uploaded_at: new Date().toISOString(),
//             current_reviewer: firstReviewer,
//             review_status: [],
//           })
//           .eq('id', existingRows[0].id)
//           .select();
//         console.log('DEBUG: Updated rows:', updatedRows, 'Error:', updateError);
//         if (updateError) throw new Error('Failed to update rejected row.');
//       } else {
//         // Insert new row
//           console.log('DEBUG: No existing rejected row found, inserting new row...');
//         const insertObj = {
//           event_id: eventId,
//           event_name: eventName,
//           task_name: taskObj.task_name,
//             task_id: taskId,
//           file_link: fileLinkArr,
//           uploaded_at: new Date().toISOString(),
//           status: 'pending',
//           current_reviewer: firstReviewer,
//           review_status: [],
//         };
//         console.log('DEBUG: Insert object for social_main:', insertObj);
//         const { error: insertError } = await supabase
//           .from('social_main')
//           .insert(insertObj);
//         // After insert
//         console.log('DEBUG: Insert attempted, error:', insertError);
//         if (insertError) throw new Error('Failed to insert into social_main table.');
//       }
//       }
      
//       setSelectedFiles((prev) => ({ ...prev, [taskId]: null }));
//       setActiveTask(null);
//       // Refresh task status
//       const { data, error } = await supabase
//         .from('social_main')
//         .select('*')
//         .eq('event_id', eventId);
//       if (!error && Array.isArray(data)) {
//         const statusMap = {};
//         data.forEach(row => {
//           statusMap[row.task_id] = row;
//         });
//         setTaskStatus(statusMap);
//       }
//     } catch (err) {
//       setUploadError(err.message || 'Something went wrong.');
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   // --- Approve/Reject logic (simplified for now) ---
//   const handleApprove = async (taskId, comment) => {
//     setIsReviewing(true);
//     try {
//       // Update status to approved in social_media_main
//       await supabase
//         .from('social_main')
//         .update({ status: 'approved' })
//         .eq('task_id', taskId)
//         .eq('event_id', eventId);
//       // Optionally insert comment into a comments table
//       // Insert approval comment if provided
//       if (comment && comment.trim()) {
//         const task = tasks.find(t => t.task_id === taskId);
//         await insertTaskComment({
//           supabase,
//           comment_text: comment,
//           task_name: task?.task_name,
//           event_name: eventInfo?.event_name,
//           commenter_role: user?.role || 'Social Media Manager',
//           commenter_name: user?.user_metadata?.full_name || user?.email,
//           sender_table: 'social_main',
//           task_uuid: taskId,
//           event_id: eventId,
//           comment_type: { type: 'review', action: 'approved' }
//         });
//       }
      
//       // Show processing state and auto-refresh immediately
//       setIsProcessingAction(true);
//       setTimeout(() => {
//         window.location.reload();
//       }, 1000);
//     } catch (err) {
//       setUploadError(err.message || 'Something went wrong.');
//     } finally {
//       setIsReviewing(false);
//     }
//   };

//   const handleReject = async (taskId, comment) => {
//     setIsRejecting(true);
//     try {
//       // Get the task details to find the files
//       const { data: taskData, error: taskError } = await supabase
//         .from('social_main')
//         .select('*')
//         .eq('task_id', taskId)
//         .eq('event_id', eventId)
//         .single();
      
//       if (taskError) {
//         console.error('Error fetching task data:', taskError);
//         throw new Error('Failed to fetch task data for rejection.');
//       }
      
//       // Get event name for folder structure
//       const { data: eventData, error: eventError } = await supabase
//         .from('events')
//         .select('event_name')
//         .eq('id', eventId)
//         .single();
      
//       if (eventError || !eventData) {
//         throw new Error('Failed to fetch event name for rejection.');
//       }
      
//       const eventName = eventData.event_name;
//       const eventFolder = `${eventName.replace(/\s+/g, '_')}_${eventId}`;
      
//       // Ensure rejected folder exists
//       await ensureRejectedFolderExists(eventName, taskId);
      
//       // Get the next rejection number for this task
//       const rejectionNumber = await getNextRejectionNumber(eventName, taskId);
//       console.log(`DEBUG: Moving files to rejected folder with prefix rejected${rejectionNumber}_`);
      
//       // Move files to rejected folder if they exist
//       if (taskData.file_link && Array.isArray(taskData.file_link) && taskData.file_link.length > 0) {
//         const bucket = 'social';
        
//         // Get task info to determine the correct folder
//         const { data: taskInfo, error: taskInfoError } = await supabase
//           .from('tasks')
//           .select('task_name')
//           .eq('task_id', taskId)
//           .single();
        
//         if (taskInfoError) {
//           console.error('Error getting task info for rejection:', taskInfoError);
//           throw new Error('Failed to get task info for rejection.');
//         }
        
//         // Determine the task-based folder - only for file-based tasks
//         let taskFolder;
//         if (taskInfo.task_name === 'Geo-tagged Event Photographs') taskFolder = 'geo_tag';
//         else if (taskInfo.task_name === 'Standard Event Photos') taskFolder = 'non_geo_tag';
//         else if (taskInfo.task_name === 'Event Banner Design') taskFolder = 'event_banner';
//         else if (taskInfo.task_name === 'Social Media Promotion Links') taskFolder = 'none';
//         else if (taskInfo.task_name === 'Event Highlight Video') taskFolder = 'event_highlights';
//         else if (taskInfo.task_name === 'Certificates for Volunteers') taskFolder = 'certi_volunteers';
//         else if (taskInfo.task_name === 'Certificates for Participants') taskFolder = 'certi_participants';
//         else if (taskInfo.task_name === 'Certificates for Guest Speakers') taskFolder = 'certi_guest';
//         else taskFolder = 'none'; // No folder for other tasks - they store data directly in tables
        
//         const sourceFolder = taskFolder === 'none' ? eventFolder : `${taskFolder}/${eventFolder}`;
//         const rejectedFolder = taskFolder === 'none' ? `${eventFolder}/rejected` : `${taskFolder}/${eventFolder}/rejected`;
        
//         for (const fileObj of taskData.file_link) {
//           if (fileObj.name && fileObj.url) {
//             try {
//               // Extract the original file name from the URL
//               const urlParts = fileObj.url.split('/');
//               const originalFileName = urlParts[urlParts.length - 1];
              
//               // Create new file name with rejection prefix
//               const rejectedFileName = `rejected${rejectionNumber}_${originalFileName}`;
              
//               // Download the file from source location
//               const { data: fileData, error: downloadError } = await supabase.storage
//                 .from(bucket)
//                 .download(`${sourceFolder}/${originalFileName}`);
              
//               if (downloadError) {
//                 console.error(`Error downloading file ${originalFileName}:`, downloadError);
//                 continue;
//               }
              
//               // Upload to rejected folder with new name
//               const { error: uploadError } = await supabase.storage
//                 .from(bucket)
//                 .upload(`${rejectedFolder}/${rejectedFileName}`, fileData);
              
//               if (uploadError) {
//                 console.error(`Error uploading file to rejected folder:`, uploadError);
//                 continue;
//               }
              
//               // Remove the original file
//               const { error: removeError } = await supabase.storage
//                 .from(bucket)
//                 .remove([`${sourceFolder}/${originalFileName}`]);
              
//               if (removeError) {
//                 console.error(`Error removing original file ${originalFileName}:`, removeError);
//               }
              
//               console.log(`Successfully moved ${originalFileName} to rejected folder as ${rejectedFileName}`);
//             } catch (fileError) {
//               console.error(`Error processing file ${fileObj.name}:`, fileError);
//             }
//           }
//         }
//       }
      
//       // Update the task status to rejected
//       const { error: updateError } = await supabase
//       .from('social_main')
//       .update({ status: 'rejected' })
//       .eq('task_id', taskId)
//       .eq('event_id', eventId);
      
//       if (updateError) {
//         console.error('Error updating task status to rejected:', updateError);
//         throw new Error('Failed to update task status.');
//       }
      
//       console.log(`Task ${taskId} rejected successfully. Files moved to rejected folder with prefix rejected${rejectionNumber}_`);
//       // Insert rejection comment if provided
//       if (comment && comment.trim()) {
//         const task = tasks.find(t => t.task_id === taskId);
//         await insertTaskComment({
//           supabase,
//           comment_text: comment,
//           task_name: task?.task_name,
//           event_name: eventInfo?.event_name,
//           commenter_role: user?.role || 'Social Media Manager',
//           commenter_name: user?.user_metadata?.full_name || user?.email,
//           sender_table: 'social_main',
//           task_uuid: taskId,
//           event_id: eventId,
//           comment_type: { type: 'review', action: 'rejected' }
//         });
//       }
      
//       // Show processing state and auto-refresh immediately
//       setIsProcessingAction(true);
//       setTimeout(() => {
//         window.location.reload();
//       }, 1000);
//     } catch (error) {
//       console.error('Error in handleReject:', error);
//       alert('Failed to reject task: ' + error.message);
//     } finally {
//     setRejectingTask(null);
//     setRejectComment('');
//     setIsRejecting(false);
//     }
//   };

//   // --- TaskRow with status badges and actions ---
//   // Separate component for uploaded task row to avoid hooks in map
//   const UploadedTaskRow = ({ task, eventIdForRemove, eventNameForRemove, docType, onRemoved }) => {
//     // Comments logic (like Secretary role)
//     let reviewStat = null;
//     if (task.status === 'approved') reviewStat = 'A';
//     else if (task.status === 'rejected') reviewStat = 'R';
//     const commentTaskUuid = task.id;
//     const isValidUuid = commentTaskUuid && /^[0-9a-fA-F-]{36}$/.test(commentTaskUuid);
//     const { comments } = useTaskComments(
//       isValidUuid ? commentTaskUuid : null,
//       reviewStat,
//       task.task_id || status?.task_id,
//       task.event_id || status?.event_id
//     );
//     const [commentPopoverOpen, setCommentPopoverOpen] = useState(false);
    
//     return (
//       <div key={task.id} className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
//         <div className="flex items-center justify-between mb-1">
//           <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{task.task_name}</div>
//           <span className={`px-3 py-1 rounded-full text-xs font-medium ${task.status === 'approved' ? 'bg-green-100 text-green-800' : task.status === 'rejected' ? 'bg-red-100 text-red-800' : task.uploaded ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{task.status === 'approved' ? 'Approved' : task.status === 'rejected' ? 'Rejected' : task.uploaded ? 'Uploaded' : 'Pending'}</span>
//         </div>
//         <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.task_desc}</div>
        
//         {/* Review Progress Badges */}
//         <ReviewProgressBadges status={task} roleType="social_media" />
        
//         <div className="flex gap-2 mt-2 items-center">
//           <FileViewer 
//             files={task.file_link} 
//             tableData={task.table_data} 
//             taskName={task.task_name} 
//             docType={docType} 
//             links={task.link_holder} 
//           />
//           <RemoveButton
//             task={{
//               ...task,
//               event_id: eventIdForRemove,
//               event_name: eventNameForRemove,
//               task_id: task.id || task.task_id,
//               task_name: task.task_name
//             }}
//             status={{
//               ...task,
//               event_id: eventIdForRemove,
//               event_name: eventNameForRemove,
//               file_link: task.file_link
//             }}
//             role="Social Media Manager"
//             bucket="social"
//             folder="social_media_manager"
//             onRemoved={onRemoved}
//             buttonClass="transition-transform hover:scale-105 flex items-center gap-1"
//             disabled={eventInfo?.locked}
//           />
//           {comments.length > 0 && (
//             <Popover open={commentPopoverOpen} onOpenChange={setCommentPopoverOpen}>
//               <PopoverTrigger asChild>
//                 <Button size="sm" variant="outline" className="flex items-center gap-1">
//                   <svg className={`w-4 h-4 transition-transform ${commentPopoverOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
//                   Comments ({comments.length})
//                 </Button>
//               </PopoverTrigger>
//               <PopoverContent className="w-96 max-h-96 overflow-y-auto">
//                 <CommentDisplay comments={comments} />
//               </PopoverContent>
//             </Popover>
//           )}
//         </div>
//       </div>
//     );
//   };

//   const TaskRow = ({ task, status, onUploadClick, onReuploadClick, locked }) => {
//     let statusLabel = 'Pending';
//     let statusColor = 'bg-yellow-100 text-yellow-800';
//     if (status?.uploaded) {
//       statusLabel = 'Uploaded';
//       statusColor = 'bg-blue-100 text-blue-800';
//     }
//     if (status?.status === 'rejected') {
//       statusLabel = 'Rejected';
//       statusColor = 'bg-red-100 text-red-800';
//     }
//     const canUpload = !status?.uploaded && status?.status !== 'rejected';
//     const canReupload = status?.status === 'rejected' && !locked;
    
//     // Comments logic (like Secretary role)
//     let reviewStat = null;
//     if (status?.status === 'approved') reviewStat = 'A';
//     else if (status?.status === 'rejected') reviewStat = 'R';
//     const commentTaskUuid = status?.id || status?.task_uuid;
//     const isValidUuid = commentTaskUuid && /^[0-9a-fA-F-]{36}$/.test(commentTaskUuid);
//     const { comments } = useTaskComments(
//       isValidUuid ? commentTaskUuid : null,
//       reviewStat,
//       task.task_id || status?.task_id,
//       task.event_id || status?.event_id
//     );
//     const [commentPopoverOpen, setCommentPopoverOpen] = useState(false);
    
//     // Reupload comment modal state
//     const [showReuploadCommentDialog, setShowReuploadCommentDialog] = useState(false);
//     const [reuploadCommentText, setReuploadCommentText] = useState('');
//     const [isProcessingReupload, setIsProcessingReupload] = useState(false);

//     // Handle Reupload with Comment
//     const handleReuploadWithComment = async () => {
//       setIsProcessingReupload(true);
//       try {
//         if (onReuploadClick) onReuploadClick(task, reuploadCommentText.trim() || '');
//         setShowReuploadCommentDialog(false);
//         setReuploadCommentText('');
//       } catch (error) {
//         console.error('Error during reupload:', error);
//       } finally {
//         setIsProcessingReupload(false);
//       }
//     };
    
//     return (
//       <div className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
//         <div className="flex items-center justify-between mb-1">
//           <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{task.task_name}</div>
//           <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>{statusLabel}</span>
//         </div>
//         <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.desc}</div>
        
//         {/* Review Progress Badges */}
//         <ReviewProgressBadges status={status} roleType="social_media" />
        
//         <div className="flex gap-2 mt-2 items-center">
//           {canUpload && (
//             <Button size="sm" onClick={() => onUploadClick(task.task_id)} className={`transition-transform hover:scale-105 flex items-center gap-1 ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
//               Upload
//             </Button>
//           )}
//           {canReupload && (
//             <Button size="sm" variant="default" onClick={() => setShowReuploadCommentDialog(true)} className={`transition-transform hover:scale-105 flex items-center gap-1 ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
//               Re-upload
//             </Button>
//           )}
//           {comments.length > 0 && (
//             <Popover open={commentPopoverOpen} onOpenChange={setCommentPopoverOpen}>
//               <PopoverTrigger asChild>
//                 <Button size="sm" variant="outline" className="flex items-center gap-1">
//                   <svg className={`w-4 h-4 transition-transform ${commentPopoverOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
//                   Comments ({comments.length})
//                 </Button>
//               </PopoverTrigger>
//               <PopoverContent className="w-96 max-h-96 overflow-y-auto">
//                 <CommentDisplay comments={comments} />
//               </PopoverContent>
//             </Popover>
//           )}
//         </div>
//         {/* Reupload Comment Dialog */}
//         <Dialog open={showReuploadCommentDialog} onOpenChange={setShowReuploadCommentDialog}>
//           <DialogContent>
//             <DialogHeader>
//               <DialogTitle>Add a comment for reupload (optional)</DialogTitle>
//             </DialogHeader>
//             <div className="space-y-4">
//               <div className="text-sm text-gray-600 dark:text-gray-400">
//                 Please provide a comment explaining why you are reuploading this task. This comment will be recorded with the reupload.
//               </div>
//               <Input
//                 type="text"
//                 placeholder="Enter your comment (optional)"
//                 value={reuploadCommentText}
//                 onChange={e => setReuploadCommentText(e.target.value)}
//                 disabled={isProcessingReupload}
//               />
//             </div>
//             <DialogFooter className="flex gap-3">
//               <Button 
//                 variant="outline" 
//                 onClick={() => {
//                   setShowReuploadCommentDialog(false);
//                   setReuploadCommentText('');
//                 }} 
//                 disabled={isProcessingReupload}
//               >
//                 Cancel
//               </Button>
//               <Button 
//                 onClick={handleReuploadWithComment}
//                 disabled={isProcessingReupload}
//               >
//                 {isProcessingReupload ? 'Processing...' : 'Proceed to Upload'}
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>
//       </div>
//     );
//   };

//   // --- Dialogs for upload, approve, reject ---
//   // Function to remove individual files from selection
//   const handleRemoveFile = (taskId, fileIndex) => {
//     // Handle both string and object activeTask values
//     let taskKey;
//     if (activeTask && typeof activeTask === 'object' && activeTask.isReupload) {
//       // For reuploads, use task_id as the key
//       taskKey = activeTask.task_id || activeTask.taskId;
//     } else if (activeTask) {
//       // For regular uploads, use activeTask directly
//       taskKey = activeTask;
//     } else {
//       // Handle null activeTask
//       console.error('activeTask is null in handleRemoveFile');
//       return;
//     }
    
//     console.log('DEBUG: handleRemoveFile - taskKey:', taskKey, 'fileIndex:', fileIndex);
    
//     setSelectedFiles((prev) => {
//       const currentFiles = prev[taskKey];
//       if (!currentFiles) return prev;
//       const newFiles = currentFiles.filter((_, index) => index !== fileIndex);
//       return { ...prev, [taskKey]: newFiles };
//     });
//   };

//   const UploadDialog = () => {
//     // Add debugging
//     console.log('DEBUG: UploadDialog render - activeTask:', activeTask);
//     console.log('DEBUG: UploadDialog render - selectedFiles:', selectedFiles);
//     console.log('DEBUG: UploadDialog render - selectedFiles[activeTask]:', selectedFiles[activeTask]);
//     console.log('DEBUG: UploadDialog render - uploadError:', uploadError);
    
//     // Handle both string and object activeTask values
//     let taskKey;
//     let taskName;
//     if (activeTask && typeof activeTask === 'object' && activeTask.isReupload) {
//       // For reuploads, use task_id as the key
//       taskKey = activeTask.task_id || activeTask.taskId;
//       taskName = activeTask.task_name || activeTask.taskName;
//     } else if (activeTask) {
//       // For regular uploads, use activeTask directly
//       taskKey = activeTask;
//       taskName = tasks.find(t => t.task_id === activeTask)?.task_name;
//     } else {
//       // Handle null activeTask
//       taskKey = null;
//       taskName = 'Unknown Task';
//     }
    
//     // Drag-and-drop handlers (reuse from photo upload dialog)
//     const handleDrop = (e) => {
//       e.preventDefault();
//       const files = Array.from(e.dataTransfer.files);
//       setSelectedFiles((prev) => ({
//         ...prev,
//         [taskKey]: [...(prev[taskKey] || []), ...files],
//       }));
//     };
//     const fileInputRef = useRef(null);
//     const handleFileSelect = (e) => {
//       const files = Array.from(e.target.files);
//       setSelectedFiles((prev) => ({
//         ...prev,
//         [taskKey]: [...(prev[taskKey] || []), ...files],
//       }));
//     };
    
//     return (
//       <Dialog 
//         open={!!activeTask} 
//         onOpenChange={(open) => {
//           if (!open) {
//             setActiveTask(null);
//             if (taskKey) {
//               setSelectedFiles((prev) => ({ ...prev, [taskKey]: null }));
//             }
//             setUploadError(null);
//           }
//         }}
//       >
//         <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-6">
//           <DialogHeader>
//             <DialogTitle className="text-lg font-semibold mb-2">Upload Files for Task: {taskName}</DialogTitle>
//           </DialogHeader>
//           <div
//             className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors mb-6"
//             onDrop={handleDrop}
//             onDragOver={e => e.preventDefault()}
//             onClick={() => fileInputRef.current && fileInputRef.current.click()}
//           >
//             <p className="text-gray-700">Drag and drop files here, or click to select</p>
//             <input
//               ref={fileInputRef}
//               key={taskKey || 'default'}
//               type="file"
//               multiple
//               className="hidden"
//               id="file-upload"
//               onChange={handleFileSelect}
//             />
//           </div>
//           {/* Show selected files */}
//           {taskKey && selectedFiles[taskKey] && selectedFiles[taskKey].length > 0 && (
//             <div className="space-y-3 mb-6">
//               <h4 className="font-medium">Selected Files:</h4>
//               <div className="max-h-40 overflow-y-auto space-y-3 pr-2">
//                 {selectedFiles[taskKey].map((file, index) => (
//                   <div key={index} className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-2 gap-3">
//                     <span className="truncate max-w-xs text-gray-900 min-w-0 flex-1" title={file.name}>{file.name}</span>
//                     <button
//                       type="button"
//                       aria-label="Remove file"
//                       onClick={() => handleRemoveFile(taskKey, index)}
//                       className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors ml-auto"
//                     >
//                       <X size={18} />
//                     </button>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//           {uploadError && <p className="text-red-500">{uploadError}</p>}
//           <DialogFooter>
//             <Button 
//               onClick={() => { 
//                 if (!eventInfo?.locked) {
//                   console.log('DEBUG: Upload button clicked'); 
//                   handleUpload(); 
//                 }
//               }} 
//               disabled={isUploading || !taskKey || !selectedFiles[taskKey] || selectedFiles[taskKey].length === 0 || eventInfo?.locked}
//               className={`w-full mt-2 ${eventInfo?.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
//             >
//               {isUploading ? 'Uploading...' : `Upload ${selectedFiles[taskKey]?.length || 0} File${selectedFiles[taskKey]?.length !== 1 ? 's' : ''}`}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     );
//   };

//   const ApproveDialog = () => (
//     <Dialog open={!!rejectingTask} onOpenChange={setRejectingTask}>
//       <DialogContent className="max-w-md w-[95vw]">
//         <DialogHeader>
//           <DialogTitle>Approve Task: {tasks.find(t => t.task_id === rejectingTask)?.task_name}</DialogTitle>
//         </DialogHeader>
//         <div className="space-y-4">
//           <p>Are you sure you want to approve this task?</p>
//           <Textarea
//             placeholder="Comment (optional)"
//             value={rejectComment}
//             onChange={(e) => setRejectComment(e.target.value)}
//             rows={4}
//           />
//           <div className="flex gap-2">
//             <Button 
//               onClick={() => !eventInfo?.locked && handleApprove(rejectingTask, rejectComment)} 
//               className={`flex-1 transition-transform hover:scale-105 flex items-center gap-1 ${eventInfo?.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
//               disabled={eventInfo?.locked}
//             >
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
//               Approve
//             </Button>
//             <Button variant="outline" onClick={() => setRejectingTask(null)} className="flex-1">Cancel</Button>
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );

//   const RejectDialog = () => (
//     <Dialog open={!!rejectingTask} onOpenChange={setRejectingTask}>
//       <DialogContent className="max-w-md w-[95vw]">
//         <DialogHeader>
//           <DialogTitle>Reject Task: {tasks.find(t => t.task_id === rejectingTask)?.task_name}</DialogTitle>
//         </DialogHeader>
//         <div className="space-y-4">
//           <p>Are you sure you want to reject this task?</p>
//           <Textarea
//             placeholder="Comment (optional)"
//             value={rejectComment}
//             onChange={(e) => setRejectComment(e.target.value)}
//             rows={4}
//           />
//           <div className="flex gap-2">
//             <Button 
//               onClick={() => !eventInfo?.locked && handleReject(rejectingTask, rejectComment)} 
//               className={`flex-1 ${eventInfo?.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
//               disabled={eventInfo?.locked}
//             >
//               Reject
//             </Button>
//             <Button variant="outline" onClick={() => setRejectingTask(null)} className="flex-1">Cancel</Button>
//           </div>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );

//   // --- My Tasks logic (mirroring Vice Chair) ---
//   // Build a map from task_id to task for easy lookup
//   const taskMap = tasks.reduce((acc, t) => { acc[t.task_id] = t; return acc; }, {});

//   // Build a set of task_ids that have a pending/approved row in social_main
//   const uploadedTaskIds = new Set(
//     Object.values(taskStatus)
//       .filter(status => status.status && ['pending', 'approved'].includes(status.status.trim().toLowerCase()))
//       .map(status => status.task_id)
//   );

//   // Debug: Log all status values
//   console.log('DEBUG: All task status values:', Object.values(taskStatus).map(s => ({ task_id: s.task_id, status: s.status })));
  
//   // Debug: Check each task status individually
//   Object.values(taskStatus).forEach(status => {
//     console.log('DEBUG: Task status check:', {
//       task_id: status.task_id,
//       status: status.status,
//       statusType: typeof status.status,
//       trimmedStatus: status.status ? status.status.trim().toLowerCase() : 'null',
//       isPending: status.status && status.status.trim().toLowerCase() === 'pending',
//       isApproved: status.status && status.status.trim().toLowerCase() === 'approved',
//       shouldBeInUploaded: status.status && ['pending', 'approved'].includes(status.status.trim().toLowerCase())
//     });
//   });

//   // Debug: Check what's in social_main table directly
//   console.log('DEBUG: Raw social_main data:', Object.values(taskStatus));
//   console.log('DEBUG: Tasks from tasks table:', tasks.map(t => ({ task_id: t.task_id, task_name: t.task_name })));

//   // Uploaded by Me: all tasks from social_main with status 'pending' or 'approved' for this event, merged with tasks table row
//   const uploadedByMeTasks = Object.values(taskStatus)
//     .filter(status => status.status && ['pending', 'approved'].includes(status.status.trim().toLowerCase()))
//     .map(status => {
//       const task = tasks.find(t => t.task_id === status.task_id) || {};
//       return {
//         ...task,
//         ...status,
//         data_format: task.data_format // always use from tasks table
//       };
//     });

//   // My Tasks: all tasks that do NOT have a pending/approved row
//   const myTasks = tasks.filter(task => !uploadedTaskIds.has(task.task_id));

//   // Debug logging
//   console.log('DEBUG: Task categorization:', {
//     totalTasks: tasks.length,
//     uploadedTaskIds: Array.from(uploadedTaskIds),
//     uploadedByMeTasks: uploadedByMeTasks.length,
//     myTasks: myTasks.length,
//     taskStatus: Object.keys(taskStatus).length
//   });

//   const handleView = (task) => {
//     const status = taskStatus[task.task_id];
//     if (Array.isArray(status?.file_link) && status.file_link.length > 0) {
//       window.open(status.file_link[0].url, '_blank');
//     } else if (typeof status?.file_link === 'string') {
//       window.open(status.file_link, '_blank');
//     }
//   };

//   const handleDownload = (task_name) => {
//     const status = taskStatus[task_name];
//     if (Array.isArray(status?.file_link)) {
//       status.file_link.forEach(linkObj => {
//         const a = document.createElement('a');
//         a.href = linkObj.url;
//         a.download = linkObj.name;
//         document.body.appendChild(a);
//         a.click();
//         document.body.removeChild(a);
//       });
//     } else if (typeof status?.file_link === 'string') {
//       const a = document.createElement('a');
//       a.href = status.file_link;
//       a.download = status.file_link.split('/').pop();
//       document.body.appendChild(a);
//       a.click();
//       document.body.removeChild(a);
//     }
//   };

//   // Update handleRemove to delete specific files and the row from social_main
//   const handleRemove = async (taskId) => {
//     try {
//       // Get the task status to find file links
//       const status = taskStatus[taskId];
//       if (!status) {
//         throw new Error('Task status not found for removal.');
//       }

//       // Handle file_link array format
//       let filesToRemove = [];
//       if (status?.file_link && Array.isArray(status.file_link)) {
//         // Extract file paths from file_link array
//         filesToRemove = status.file_link.map(file => {
//           if (file.url && file.url.startsWith('http')) {
//             const urlParts = file.url.split('/');
//             const bucketIdx = urlParts.findIndex(p => p === 'social');
//             if (bucketIdx !== -1) {
//               return urlParts.slice(bucketIdx + 1).join('/');
//             }
//           }
//           return null;
//         }).filter(Boolean);
//       } else if (status?.filePath) {
//         // Fallback for old format
//         let filePath = status.filePath;
//         if (filePath.startsWith('http')) {
//           const urlParts = filePath.split('/');
//           const bucketIdx = urlParts.findIndex(p => p === 'social');
//           if (bucketIdx !== -1) {
//             filePath = urlParts.slice(bucketIdx + 1).join('/');
//           }
//         }
//         filesToRemove = [filePath];
//       }
      
//       if (filesToRemove.length === 0) {
//         console.warn('No files to remove from storage');
//       } else {
//         // 1. Remove specific files from Supabase storage (bucket 'social')
//         const { error: storageError } = await supabase.storage.from('social').remove(filesToRemove);
//         if (storageError) {
//           console.error('Storage removal error:', storageError);
//           throw new Error('Failed to remove files from storage.');
//         }
//         console.log('Files removed from storage successfully');
//       }

//       // 2. Remove row from social_main for this event/task
//       const { error: dbError } = await supabase
//         .from('social_main')
//         .delete()
//         .eq('task_id', taskId)
//         .eq('event_id', eventId);
//       if (dbError) throw new Error('Failed to remove row from social_main.');

//       // 3. Refresh task status
//       const { data, error: fetchError } = await supabase
//         .from('social_main')
//         .select('*')
//         .eq('event_id', eventId);
//       if (!fetchError && Array.isArray(data)) {
//         const statusMap = {};
//         data.forEach(row => {
//           statusMap[row.task_id] = row;
//         });
//         setTaskStatus(statusMap);
//       }
      
//       alert('Files and task removed successfully.');
//     } catch (err) {
//       console.error('Remove error:', err);
//       alert(`Failed to remove files: ${err.message}`);
//     }
//   };

//   // --- TaskRow and UploadedTaskRow handlers (mirroring Vice Chair) ---
//   const handleReuploadClick = async (task, comment = '', options = {}) => {
//     let taskId = task.task_id || task.taskId;
//     const taskName = task.task_name || task.taskName;
//     // If taskId is not a UUID, look it up
//     if (taskId && typeof taskId === 'string' && taskId.startsWith('t_')) {
//       const taskDef = tasks.find(t => t.task_name === taskId);
//       if (taskDef) {
//         taskId = taskDef.task_id;
//       }
//     }
//     const eventIdToUse = task.event_id || eventId;
//     if (!eventIdToUse || !taskId) {
//       alert('Could not determine event or task ID for reupload.');
//       return;
//     }

//     try {
//       // Check if task is actually rejected
//       const { data: existingRow, error: existingError } = await supabase
//         .from('social_main')
//         .select('*')
//         .eq('event_id', eventIdToUse)
//         .eq('task_id', taskId)
//         .eq('status', 'rejected')
//         .single();
      
//       if (existingError && existingError.code !== 'PGRST116') {
//         console.error('Error checking existing rejected row:', existingError);
//         alert('Failed to check existing task status');
//         return;
//       }
      
//       if (!existingRow) {
//         alert('No rejected row found to reupload.');
//         return;
//       }

//       // Insert reupload comment if provided
//       if (comment && comment.trim() && taskId && /^[0-9a-fA-F-]{36}$/.test(taskId)) {
//         const { error: commentError } = await supabase
//           .from('comments')
//           .insert({
//             comment_text: comment,
//             task_name: taskName,
//             event_name: eventInfo?.event_name,
//             commenter_role: 'Social Media Manager',
//             commenter_name: user?.user_metadata?.full_name || user?.email,
//             sender_table: 'social_main',
//             task_uuid: taskId,
//             event_id: eventIdToUse,
//             comment_type: {
//               type: 'reupload',
//               role: 'Social Media Manager'
//             },
//             created_at: new Date().toISOString()
//           });
//         if (commentError) {
//           console.error('Error inserting reupload comment:', commentError);
//         }
//       }

//       // Use the same modal logic as handleUploadClick based on task data format
//       const taskObj = tasks.find(t => t.task_id === taskId) || task;
      
//       console.log('DEBUG: Reupload - taskObj:', taskObj);
//       console.log('DEBUG: Reupload - taskObj.data_format:', taskObj.data_format);
//       console.log('DEBUG: Reupload - taskObj.task_name:', taskObj.task_name);
      
//       // Parse data_format to determine upload type
//       let dataFormat = taskObj.data_format;
//       if (typeof dataFormat === 'string') {
//         try {
//           dataFormat = JSON.parse(dataFormat);
//         } catch {
//           dataFormat = null;
//         }
//       }
      
//       console.log('DEBUG: Reupload - parsed dataFormat:', dataFormat);
//       console.log('DEBUG: Reupload - dataFormat.doc_type:', dataFormat?.doc_type);

//       // Handle Promotion Team Details task (table format)
//       if (taskObj.task_name === 'Promotion Team Details' || (dataFormat && dataFormat.doc_type === 'table')) {
//         console.log('DEBUG: Reupload - Opening TABLE modal');
//         // Create a temporary row for table entry (will be properly created on submit)
//         const tempRowId = `temp_${Date.now()}`;
//         // Redirect to the promotion team table page with temp ID and task info
//         navigate(`/promotion-team/${tempRowId}/table`, { 
//           state: { 
//             isTempRow: true,
//             taskId: taskId,
//             taskName: taskObj.task_name,
//             eventName: eventInfo?.event_name,
//             eventId: eventIdToUse,
//             isReupload: true,
//             existingRowId: existingRow.id
//           } 
//         });
//         return;
//       }

//       // Handle Social Media Promotion Links task (link format)
//       if (taskObj.task_name === 'Social Media Promotion Links' || (dataFormat && dataFormat.doc_type === 'link')) {
//         console.log('DEBUG: Reupload - Opening LINKS modal');
//         setActiveLinksTask(taskId);
//         setLinks([{ name: '', url: '' }]);
//         setLinksError('');
//         setShowLinksModal(true);
//         // Store reupload info for link-type tasks separately
//         setLinkReuploadInfo({ 
//           taskObj, 
//           existingRowId: existingRow.id 
//         });
//         return;
//       }

//       // Handle photo upload tasks (multi-file format)
//       if (dataFormat && dataFormat.doc_type === 'multi_file') {
//         console.log('DEBUG: Reupload - Opening MULTI-FILE modal');
//         let type = null;
//         if (taskObj.task_name === 'Geo-tagged Event Photographs') type = 'geo';
//         else if (taskObj.task_name.toLowerCase() === 'standard event photos') type = 'non_geo';
//         else if (taskObj.task_name.toLowerCase().replace(/[\\/]/g, ' ').replace(/\s+/g, ' ').trim() === 'event banner design') type = 'banner';
//         else if (taskObj.task_name.toLowerCase().replace(/[\\/]/g, ' ').replace(/\s+/g, ' ').trim() === 'event highlight video') type = 'event_highlights';
//         else type = 'multi_file'; // generic multi-file upload
        
//         setPhotoUploadTaskType(type);
//         setPhotoUploadFiles([]);
//         setShowPhotoUploadDialog(true);
//         // Store reupload info for when photos are uploaded
//         setActiveTaskWithDebug({ 
//           ...taskObj, 
//           isReupload: true, 
//           existingRowId: existingRow.id 
//         });
//         return;
//       }

//       // Default: single file upload
//       console.log('DEBUG: Reupload - Opening DEFAULT FILE modal');
//       setActiveTaskWithDebug({ 
//         ...taskObj, 
//         isReupload: true, 
//         existingRowId: existingRow.id 
//       });

//     } catch (error) {
//       console.error('Reupload error:', error);
//       alert('Failed to reupload task: ' + error.message);
//     }
//   };

//   const getLatestRejectionComment = (taskId) => {
//     // This function is no longer needed with the new comment approach
//     return null;
//   };

//   const handlePhotoUploadClick = (taskType) => {
//     setPhotoUploadTaskType(taskType);
//     setPhotoUploadFiles([]);
//     setShowPhotoUploadDialog(true);
//   };

//   const handlePhotoDrop = (e) => {
//     e.preventDefault();
//     const files = Array.from(e.dataTransfer.files);
//     setPhotoUploadFiles((prev) => [...prev, ...files]);
//   };

//   const handlePhotoSelect = (e) => {
//     const files = Array.from(e.target.files);
//     setPhotoUploadFiles((prev) => [...prev, ...files]);
//   };

//   const handleRemovePhotoFile = (idx) => {
//     setPhotoUploadFiles((prev) => prev.filter((_, i) => i !== idx));
//   };

//   // Use the imported handlePhotoUploadToSupabase function
//   const handlePhotoUpload = async () => {
//     console.log('DEBUG: handlePhotoUpload called');
//     console.log('DEBUG: photoUploadFiles:', photoUploadFiles);
//     console.log('DEBUG: photoUploadTaskType:', photoUploadTaskType);
//     console.log('DEBUG: eventInfo:', eventInfo);
//     console.log('DEBUG: eventId:', eventId);
    
//     if (!photoUploadFiles || photoUploadFiles.length === 0) {
//       alert('Please select files to upload.');
//       return;
//     }
    
//     if (!eventInfo || !eventId) {
//       alert('Event information is missing.');
//       return;
//     }

//     setIsUploading(true);
    
//     try {
//       // Determine the task name based on photoUploadTaskType
//       let taskName;
//       if (photoUploadTaskType === 'geo') taskName = 'Geo-tagged Event Photographs';
//       else if (photoUploadTaskType === 'non_geo') taskName = 'Standard Event Photos';
//       else if (photoUploadTaskType === 'banner') taskName = 'Event Banner Design';
//       else if (photoUploadTaskType === 'event_highlights') taskName = 'Event Highlights Video';
//       else if (photoUploadTaskType === 'certi_volunteers') taskName = 'Certificates for Volunteers';
//       else if (photoUploadTaskType === 'certi_participants') taskName = 'Certificates for Participants';
//       else if (photoUploadTaskType === 'certi_guest') taskName = 'Certificates for Guest Speakers';
//       else {
//         alert('Invalid task type');
//         setIsUploading(false);
//         return;
//       }
      
//       console.log('DEBUG: taskName determined:', taskName);
      
//       // Get task definition
//       const taskDef = tasks.find(t => t.task_name === taskName);
//       if (!taskDef) {
//         alert(`Task "${taskName}" not found in tasks list`);
//         setIsUploading(false);
//         return;
//       }
      
//       console.log('DEBUG: taskDef found:', taskDef);
      
//       const taskId = taskDef.task_id;
//       const review_role = Array.isArray(taskDef.review_role) ? taskDef.review_role : 
//                           (typeof taskDef.review_role === 'string' ? JSON.parse(taskDef.review_role) : []);
//       const firstReviewer = review_role[0] || null;
      
//       // Determine folder
//       let folder;
//       if (photoUploadTaskType === 'geo') folder = 'geo_tag';
//       else if (photoUploadTaskType === 'non_geo') folder = 'non_geo_tag';
//       else if (photoUploadTaskType === 'banner') folder = 'event_banner';
//       else if (photoUploadTaskType === 'event_highlights') folder = 'event_highlights';
//       else if (photoUploadTaskType === 'certi_volunteers') folder = 'certi_volunteers';
//       else if (photoUploadTaskType === 'certi_participants') folder = 'certi_participants';
//       else if (photoUploadTaskType === 'certi_guest') folder = 'certi_guest';
//       else folder = 'misc';
      
//       const bucket = 'social';
//       const eventFolder = `${eventInfo.event_name.replace(/\s+/g, '_')}_${eventId}`;
      
//       console.log('DEBUG: Starting file upload to', folder, eventFolder);
      
//       // Upload files
//       const fileLinkArr = [];
//       for (let i = 0; i < photoUploadFiles.length; i++) {
//         const file = photoUploadFiles[i];
//         const fileName = file.name.replace(/\s+/g, '_');
//         const filePath = `${folder}/${eventFolder}/${fileName}`;
        
//         console.log('DEBUG: Uploading file:', fileName);
        
//         const { error: uploadError } = await supabase.storage
//           .from(bucket)
//           .upload(filePath, file, { upsert: true });
          
//         if (uploadError) {
//           console.error('Upload error:', uploadError);
//           throw new Error(`Upload failed: ${uploadError.message}`);
//         }
        
//         const publicUrl = `https://pfitttbkoyglznojhozc.supabase.co/storage/v1/object/public/${bucket}/${folder}/${eventFolder}/${fileName}`;
//         fileLinkArr.push({ name: fileName, url: publicUrl });
//       }
      
//       console.log('DEBUG: Files uploaded, inserting to database');
      
//       // Check if row exists
//       const { data: existingRows } = await supabase
//         .from('social_main')
//         .select('id')
//         .eq('event_id', eventId)
//         .eq('task_name', taskName);
      
//       if (existingRows && existingRows.length > 0) {
//         // Update existing row
//         const { error: updateError } = await supabase
//           .from('social_main')
//           .update({
//             event_name: eventInfo.event_name,
//             file_link: fileLinkArr,
//             status: 'pending',
//             uploaded_at: new Date().toISOString(),
//             current_reviewer: firstReviewer,
//             review_status: [],
//             task_id: taskId,
//           })
//           .eq('id', existingRows[0].id);
          
//         if (updateError) throw new Error(`Database update failed: ${updateError.message}`);
//       } else {
//         // Insert new row
//         const { error: insertError } = await supabase
//           .from('social_main')
//           .insert({
//             event_id: eventId,
//             event_name: eventInfo.event_name,
//             task_name: taskName,
//             file_link: fileLinkArr,
//             status: 'pending',
//             uploaded_at: new Date().toISOString(),
//             current_reviewer: firstReviewer,
//             review_status: [],
//             task_id: taskId,
//           });
          
//         if (insertError) throw new Error(`Database insert failed: ${insertError.message}`);
//       }
      
//       console.log('DEBUG: Upload complete, updating UI');
      
//       // Update task status
//       setTaskStatus((prev) => ({
//         ...prev,
//         [taskName]: {
//           uploaded: true,
//           file_link: fileLinkArr,
//           status: 'pending',
//         },
//       }));
      
//       // Close dialog and reset
//       setShowPhotoUploadDialog(false);
//       setPhotoUploadFiles([]);
//       setPhotoUploadTaskType(null);
      
//       alert('Upload successful!');
      
//     } catch (error) {
//       console.error('Upload error:', error);
//       alert(`Upload failed: ${error.message}`);
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   // --- Add ViewFilesModal component ---
//   const ViewFilesModal = ({ open, onClose, files, title }) => {
//     const [previewIdx, setPreviewIdx] = React.useState(null);
//     React.useEffect(() => { setPreviewIdx(null); }, [files, open]);
//     const previewFile = files && previewIdx !== null ? files[previewIdx] : null;
//     const isImage = previewFile && /\.(jpg|jpeg|png|gif|webp)$/i.test(previewFile.name);
//     const isPDF = previewFile && /\.pdf$/i.test(previewFile.name);
//     const isOffice = previewFile && /\.(docx?|xlsx?|pptx?)$/i.test(previewFile.name);
//     const officeViewerUrl = isOffice
//       ? `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(previewFile.url)}`
//       : null;
//     // Helper to handle view click
//     const handleViewClick = (file, idx) => {
//       if (/\.docx?$/i.test(file.name)) {
//         const officeViewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(file.url)}`;
//         window.open(officeViewerUrl, '_blank', 'noopener,noreferrer');
//       } else {
//         window.open(file.url, '_blank', 'noopener,noreferrer');
//       }
//     };
//     return (
//       <>
//         <Dialog open={open} onOpenChange={onClose}>
//           <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
//             <DialogHeader>
//               <DialogTitle>Files for: {title}</DialogTitle>
//             </DialogHeader>
//             <div className="space-y-4">
//               {(!files || files.length === 0) ? (
//                 <div className="text-gray-500">No files uploaded.</div>
//               ) : (
//                 files.map((file, idx) => (
//                   <div key={idx} className="flex items-center gap-2 p-2 border rounded">
//                     <span className="flex-1 break-all truncate max-w-xs" title={file.name}>{file.name}</span>
//                     <Button
//                       variant="link"
//                       onClick={() => handleViewClick(file, idx)}
//                       className="text-blue-600 flex-shrink-0"
//                     >
//                       View
//                     </Button>
//                     <Button
//                       variant="ghost"
//                       onClick={() => window.open(file.url, '_blank', 'noopener,noreferrer')}
//                       className="text-blue-600 flex-shrink-0"
//                     >
//                       Download
//                     </Button>
//                   </div>
//                 ))
//               )}
//             </div>
//             <DialogFooter>
//               <Button variant="outline" onClick={onClose}>Back</Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>
//       </>
//     );
//   };

//   // Handler to open modal for Social Media Promotion Links
//   const handleLinksUploadClick = (taskId) => {
//     setActiveLinksTask(taskId);
//     setLinks([{ name: '', url: '' }]);
//     setLinksError('');
//     setShowLinksModal(true);
//   };

//   // Add/remove link fields
//   const handleAddLink = () => setLinks((prev) => [...prev, { name: '', url: '' }]);

//   const handleRemoveLink = (idx) => {
//     setLinks((prev) => prev.filter((_, i) => i !== idx));
//   };

//   // Update a link field (name or url) in the links array
//   const handleLinkChange = (idx, field, value) => {
//     console.log('DEBUG: handleLinkChange called:', { idx, field, value });
//     console.log('DEBUG: activeTask before link change:', activeTask);
//     setLinks((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
//     console.log('DEBUG: activeTask after link change:', activeTask);
//   };

//   // Validate and submit links
//   const handleSubmitLinks = async () => {
//     setLinksError('');
//     if (links.some(l => !l.name.trim() || !l.url.trim())) {
//       setLinksError('All fields are required.');
//       return;
//     }
//     setIsLinksUploading(true);
//     try {
//       // Always fetch event_name from events table using eventId from URL
//       const cleanEventId = (eventId || '').toString().trim();
//       if (!cleanEventId) throw new Error('Event ID is missing or invalid.');
//       const { data: eventData, error: eventError } = await supabase
//         .from('events')
//         .select('event_name')
//         .eq('id', cleanEventId)
//         .single();
//       if (eventError || !eventData) throw new Error('Failed to fetch event name.');
//       const eventName = eventData.event_name;
//       // Check for existing rejected row for this task/event
//       const { data: existingRows, error: existingError } = await supabase
//         .from('social_main')
//         .select('id')
//         .eq('event_name', eventName)
//         .eq('task_id', activeLinksTask)
//         .eq('status', 'rejected');
//       if (existingError) throw new Error('Failed to check for existing rejected row.');
//       if (existingRows && existingRows.length > 0) {
//         // Always fetch review_role before update
//         const { data: taskDef, error: taskError } = await supabase
//           .from('tasks')
//           .select('review_role')
//           .eq('task_id', activeLinksTask)
//           .single();
//         let reviewRoleArr = [];
//         if (Array.isArray(taskDef?.review_role)) {
//           reviewRoleArr = taskDef.review_role;
//         } else if (typeof taskDef?.review_role === 'string') {
//           try {
//             reviewRoleArr = JSON.parse(taskDef.review_role);
//           } catch {
//             reviewRoleArr = taskDef.review_role.replace(/[{}]/g, '').split(',').map(r => r.trim()).filter(r => r.length > 0);
//           }
//         }
//         const firstReviewer = reviewRoleArr.length > 0 ? reviewRoleArr[0] : null;
//         // Update the existing rejected row
//         const { data: updatedRows, error: updateError } = await supabase
//           .from('social_main')
//           .update({
//             link_holder: links,
//             status: 'pending',
//             uploaded_at: new Date().toISOString(),
//             current_reviewer: firstReviewer,
//             review_status: [],
//           })
//           .eq('id', existingRows[0].id)
//           .select();
//         console.log('DEBUG: Updated rows:', updatedRows, 'Error:', updateError);
//         // Immediately fetch and log the row after update
//         const { data: checkRow } = await supabase
//           .from('social_main')
//           .select('*')
//           .eq('id', existingRows[0].id)
//           .single();
//         console.log('DEBUG: Row after update:', checkRow);
//         if (updateError) throw new Error('Failed to update rejected row.');
//       } else {
//         // Insert new row
//         const taskObj = tasks.find(t => t.task_id === activeLinksTask);
//         // Fetch review_role from tasks table using task_id (activeLinksTask)
//         const { data: taskDef, error: taskError } = await supabase
//           .from('tasks')
//           .select('review_role')
//           .eq('task_id', activeLinksTask)
//           .single();
//         let reviewRoleArr = [];
//         if (Array.isArray(taskDef?.review_role)) {
//           reviewRoleArr = taskDef.review_role;
//         } else if (typeof taskDef?.review_role === 'string') {
//           try {
//             reviewRoleArr = JSON.parse(taskDef.review_role);
//           } catch {
//             reviewRoleArr = taskDef.review_role.replace(/[{}]/g, '').split(',').map(r => r.trim()).filter(r => r.length > 0);
//           }
//         }
//         const firstReviewer = reviewRoleArr.length > 0 ? reviewRoleArr[0] : null;
//         console.log('DEBUG: taskDef (links):', taskDef);
//         console.log('DEBUG: review_role type (links):', typeof taskDef?.review_role, 'value:', taskDef?.review_role);
        
//         // At the start of the links upload handler
//         console.log('DEBUG: Upload handler triggered (links)');
//         // ...
//         // After fetching taskDef
//         console.log('DEBUG: taskDef after fetch:', taskDef, 'taskError:', taskError);
//         // ...
//         // Log right before insert
//         console.log('DEBUG: About to insert with current_reviewer:', firstReviewer, 'review_role:', reviewRoleArr);
//         const { error: insertError } = await supabase
//           .from('social_main')
//           .insert({
//             event_id: eventId,
//             event_name: eventName,
//             task_name: taskObj?.task_name || '',
//             task_id: activeLinksTask,
//             link_holder: links,
//             uploaded_at: new Date().toISOString(),
//             status: 'pending',
//             current_reviewer: firstReviewer,
//             review_status: [],
//           });
//         // After insert
//         console.log('DEBUG: Insert attempted, error:', insertError);
//         if (insertError) throw new Error('Failed to insert into social_main table.');
//       }
//       setShowLinksModal(false);
//       setActiveLinksTask(null);
//       // Refresh task status
//       const { data, error } = await supabase
//         .from('social_main')
//         .select('*')
//         .eq('event_id', eventId);
//       if (!error && Array.isArray(data)) {
//         const statusMap = {};
//         data.forEach(row => {
//           statusMap[row.task_id] = row;
//         });
//         setTaskStatus(statusMap);
//       }
//     } catch (err) {
//       setLinksError(err.message || 'Something went wrong.');
//     } finally {
//       setIsLinksUploading(false);
//     }
//   };

//   // Handler to open view modal for links
//   const handleViewLinks = (task) => {
//     setViewLinks(task.link_holder || []);
//     setViewLinksTitle(task.task_name || 'Links');
//     setShowLinksViewModal(true);
//   };

//   // Handler to remove a social_main row by id
//   const handleRemoveLinksTask = async (rowId) => {
//     await supabase.from('social_main').delete().eq('id', rowId);
//     // Refresh task status
//     const { data, error } = await supabase
//       .from('social_main')
//       .select('*')
//       .eq('event_id', eventId);
//     if (!error && Array.isArray(data)) {
//       const statusMap = {};
//       data.forEach(row => {
//         statusMap[row.task_id] = row;
//       });
//       setTaskStatus(statusMap);
//     }
//   };

//   // Add review logic state
//   const [reviewingTask, setReviewingTask] = useState(null);
//   const [reviewComment, setReviewComment] = useState('');
//   const [isReviewing, setIsReviewing] = useState(false);

//   // Approve review handler
//   const handleApproveReview = async (task) => {
//     setIsReviewing(true);
//     try {
//       // Always fetch review_role from tasks table
//       let reviewRoleArr = [];
//       const { data: taskDef, error: taskError } = await supabase
//         .from('tasks')
//         .select('review_role')
//         .or(`task_id.eq.${task.task_id},task_name.eq.${task.task_name}`)
//         .limit(1)
//         .single();
//       if (!taskError && taskDef && taskDef.review_role) {
//         if (Array.isArray(taskDef.review_role)) {
//           reviewRoleArr = taskDef.review_role;
//         } else if (typeof taskDef.review_role === 'string') {
//           try {
//             reviewRoleArr = JSON.parse(taskDef.review_role);
//           } catch {
//             reviewRoleArr = taskDef.review_role.replace(/[{}]/g, '').split(',').map(r => r.trim());
//           }
//         }
//       }
//       const reviewerIdx = reviewRoleArr ? reviewRoleArr.findIndex(r => r && r.trim().toLowerCase() === String(task.current_reviewer).trim().toLowerCase()) : 0;
//       const review_status = Array.isArray(task.review_status) ? task.review_status : [];
//       const wasRejected = review_status.some(s => s.status === 'R');
//       const newReviewStatus = [...review_status, {
//         step: reviewerIdx + 1,
//         role: task.current_reviewer,
//         status: 'A',
//         timestamp: new Date().toISOString(),
//         ...(wasRejected ? { reuploaded: true } : {})
//       }];
//       let nextReviewer = null;
//       const isFinal = reviewerIdx === reviewRoleArr.length - 1;
//       if (!isFinal && reviewRoleArr && reviewerIdx < reviewRoleArr.length - 1) {
//         nextReviewer = reviewRoleArr[reviewerIdx + 1];
//       }
//       const updates = {
//         current_reviewer: isFinal ? 'None' : nextReviewer,
//         review_status: newReviewStatus,
//         status: isFinal ? 'approved' : 'pending',
//       };
//       await supabase
//         .from('social_main')
//         .update(updates)
//         .eq('id', task.id);
//       // Insert comment if provided
//       if (reviewComment && reviewComment.trim().length > 0) {
//         await supabase.from('comments').insert({
//           event_name: task.event_name,
//           event_id: task.event_id,
//           task_name: task.task_name,
//           commenter_role: task.current_reviewer,
//           commenter_name: user?.disp_name || user?.email || 'Reviewer',
//           comment_text: reviewComment,
//           created_at: new Date().toISOString(),
//           sender_table: 'social_main',
//           task_uuid: task.id,
//           review_stat: 'A',
//           review_step: reviewerIdx + 1,
//         });
//       }
//       // Refresh task status
//       const { data, error } = await supabase
//         .from('social_main')
//         .select('*')
//         .eq('event_id', task.event_id);
//       if (!error && Array.isArray(data)) {
//         const statusMap = {};
//         data.forEach(row => {
//           statusMap[row.task_id] = row;
//         });
//         setTaskStatus(statusMap);
//       }
//       setReviewingTask(null);
//       setReviewComment('');
      
//       // Show processing state and auto-refresh after 1 second
//       setIsProcessingAction(true);
//       setTimeout(() => {
//         window.location.reload();
//       }, 1000);
//     } catch (err) {
//       alert('Failed to approve review: ' + err.message);
//     } finally {
//       setIsReviewing(false);
//     }
//   };

//   // Reject review handler
//   const handleRejectReview = async (task) => {
//     setIsReviewing(true);
//     try {
//       console.log('[DEBUG][handleRejectReview] task:', task);
//       // Always fetch review_role from tasks table
//       let reviewRoleArr = [];
//       const { data: taskDef, error: taskError } = await supabase
//         .from('tasks')
//         .select('review_role')
//         .or(`task_id.eq.${task.task_id},task_name.eq.${task.task_name}`)
//         .limit(1)
//         .single();
//       if (!taskError && taskDef && taskDef.review_role) {
//         if (Array.isArray(taskDef.review_role)) {
//           reviewRoleArr = taskDef.review_role;
//         } else if (typeof taskDef.review_role === 'string') {
//           try {
//             reviewRoleArr = JSON.parse(taskDef.review_role);
//           } catch {
//             reviewRoleArr = taskDef.review_role.replace(/[{}]/g, '').split(',').map(r => r.trim());
//           }
//         }
//       }
//       const reviewerIdx = reviewRoleArr ? reviewRoleArr.findIndex(r => r && r.trim().toLowerCase() === String(task.current_reviewer).trim().toLowerCase()) : 0;
//       const review_status = Array.isArray(task.review_status) ? task.review_status : [];
//       const wasRejected = review_status.some(s => s.status === 'R');
//       const newReviewStatus = [...review_status, {
//         step: reviewerIdx + 1,
//         role: task.current_reviewer,
//         status: 'R',
//         timestamp: new Date().toISOString(),
//         ...(wasRejected ? { reuploaded: true } : {})
//       }];
//       const updates = {
//         current_reviewer: null,
//         review_status: newReviewStatus,
//         status: 'rejected',
//       };
//       // Check if row exists before update
//       const { data: rows, error: selectError } = await supabase
//         .from('social_main')
//         .select('*')
//         .eq('id', task.id);
//       if (!rows || rows.length === 0) {
//         alert('No pending row found for this task. Please check the database.');
//         setIsReviewing(false);
//         return;
//       }
//       await supabase
//         .from('social_main')
//         .update(updates)
//         .eq('id', task.id);
//       // Insert rejection comment if provided
//       if (reviewComment && reviewComment.trim().length > 0) {
//         await supabase.from('comments').insert({
//           event_name: task.event_name,
//           event_id: task.event_id,
//           task_name: task.task_name,
//           commenter_role: task.current_reviewer,
//           commenter_name: user?.disp_name || user?.email || 'Reviewer',
//           comment_text: reviewComment,
//           created_at: new Date().toISOString(),
//           sender_table: 'social_main',
//           task_uuid: task.id,
//           review_stat: 'R',
//           review_step: reviewerIdx + 1,
//         });
//       }
//       // Refresh task status
//       const { data, error } = await supabase
//         .from('social_main')
//         .select('*')
//         .eq('event_id', task.event_id);
//       if (!error && Array.isArray(data)) {
//         const statusMap = {};
//         data.forEach(row => {
//           statusMap[row.task_id] = row;
//         });
//         setTaskStatus(statusMap);
//       }
//       setReviewingTask(null);
//       setReviewComment('');
      
//       // Show processing state and auto-refresh after 1 second
//       setIsProcessingAction(true);
//       setTimeout(() => {
//         window.location.reload();
//       }, 1000);
//     } catch (err) {
//       alert('Failed to reject review: ' + err.message);
//     } finally {
//       setIsReviewing(false);
//     }
//   };

//   // Pending Reviews section: tasks where current_reviewer matches user role and status is pending
//   const pendingReviewTasks = Object.values(taskStatus).filter(task => {
//     if (!task.current_reviewer || !user?.role) return false;
//     return (
//       String(task.current_reviewer).trim().toLowerCase() === String(user.role).trim().toLowerCase() &&
//       task.status === 'pending'
//     );
//   });

//   // Dashboard view (no eventId)
//   if (!eventId) {
//     return (
//       <div className="px-4 py-6 space-y-6">
//         {/* Welcome Section */}
//         <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
//           <h1 className="text-2xl font-bold">Welcome back, {user?.disp_name}!</h1>
//           <p className="text-blue-100 mt-2">
//             Here's what's happening with your club activities today.
//           </p>
//         </div>
//         {/* Analytics Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//           {stats?.map((stat, index) => (
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
//         {/* Recent Activities */}
//           <Card className="lg:col-span-3">
//             <CardHeader>
              
//             </CardHeader>
//              <CardContent>
//                 <AllEventsList roleType="socialmediapromotionmanager" roleTable="social_main" userRole="Social Media Promotions Manager" />
//               </CardContent>
//           </Card>
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
//         </div>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   // Main event-specific render
//   if (eventId) {
//     return (
//       <>
//         {/* Processing Overlay */}
//         {isProcessingAction && (
//           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//             <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
//               <div className="flex items-center space-x-3">
//                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//                 <div>
//                   <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Processing...</p>
//                   <p className="text-sm text-gray-600 dark:text-gray-400">Please wait while we update the system</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}


        
//         <div className="p-6 animate-fade-in">
//         <div className="mb-4">
//           <Button variant="outline" onClick={() => navigate('/events')}>
//             Back to Events
//           </Button>
//         </div>
//         {/* Enhanced Event Header Component */}
//         <EnhancedEventHeader
//           eventInfo={eventInfo}
//           roleName="Social Media Manager"
//                       roleColor="green"
//           showStats={true}
//           stats={{
//             myTasks: myTasks.length,
//                           uploaded: uploadedByMeTasks.length,
//                           pendingReviews: pendingReviewTasks.length,
//                           rejected: Object.values(taskStatus).filter(t => t.status === 'rejected').length
//           }}
//         />
//         {/* Enhanced Navigation */}
//         <div className="mb-6">
//           <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
//             <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
//               <div className="w-2 h-2 bg-green-500 rounded-full"></div>
//               Navigation
//             </h3>
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//               <Button 
//                 variant={viewMode === 'mytasks' ? 'default' : 'outline'} 
//                 onClick={() => handleTabChange('mytasks')}
//                 className={`h-12 ${viewMode === 'mytasks' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
//               >
//                 <FileText className="h-4 w-4 mr-2" />
//                 My Tasks
//               </Button>
//               <Button 
//                 variant={viewMode === 'uploaded' ? 'default' : 'outline'} 
//                 onClick={() => handleTabChange('uploaded')}
//                 className={`h-12 ${viewMode === 'uploaded' ? 'bg-green-600 hover:bg-green-700' : ''}`}
//               >
//                 <CheckCircle className="h-4 w-4 mr-2" />
//                 Uploaded
//               </Button>
//               <Button 
//                 variant={viewMode === 'reviews' ? 'default' : 'outline'} 
//                 onClick={() => handleTabChange('reviews')}
//                 className={`h-12 ${viewMode === 'reviews' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
//               >
//                 <Clock className="h-4 w-4 mr-2" />
//                 Reviews
//               </Button>
//             </div>
//           </div>
//         </div>
//         {/* Tab content (for now, just show My Tasks) */}
//         {viewMode === 'mytasks' && (
//   <div>
//     <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">My Tasks</h2>
//     {myTasks.length > 0 ? (
//       // Sort: rejected tasks first
//       [...myTasks].sort((a, b) => {
//         const aStatus = taskStatus[a.task_id]?.status;
//         const bStatus = taskStatus[b.task_id]?.status;
//         if (aStatus === 'rejected' && bStatus !== 'rejected') return -1;
//         if (aStatus !== 'rejected' && bStatus === 'rejected') return 1;
//         return 0;
//       }).map((task, index) => {
//         const status = taskStatus[task.task_id];
//         // Always render RejectedTaskHandler for rejected tasks to get the correct buttons
//         if (status?.status === 'rejected') {
//           console.log('DEBUG: Rendering RejectedTaskHandler for task:', { task, status });
          
//           // Create a combined task object that includes both task definition and status information
//           const combinedTask = {
//             ...task, // Include task definition (task_id, task_name, desc, etc.)
//             ...status, // Include status information (event_id, event_name, file_link, etc.)
//             event_id: status?.event_id || eventInfo?.event_id,
//             event_name: status?.event_name || eventInfo?.event_name,
//             task_name: task.task_name // Ensure task_name comes from task definition
//           };
          
//           console.log('DEBUG: Combined task object:', combinedTask);
//           console.log('DEBUG: Status object:', status);
          
//           return (
//             <RejectedTaskHandler
//               key={task.task_id}
//               task={combinedTask}
//               status={status}
//               onDownloadClick={handleDownload}
//               onReuploadClick={(task, comment) => handleReuploadClick(task, comment)}
//               role="Social Media Manager"
//               taskName={task.task_name}
//             />
//           );
//         }
//         // Special handling for geo-tagged, standard event photo, and event banner tasks
//         if (task.task_name === 'Geo-tagged Event Photographs') {
//           return (
//             <div key={task.task_id} className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
//               <div className="flex items-center justify-between mb-1">
//                 <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{task.task_name}</div>
//                 <span className={`px-3 py-1 rounded-full text-xs font-medium ${status?.status === 'approved' ? 'bg-green-100 text-green-800' : status?.status === 'rejected' ? 'bg-red-100 text-red-800' : status?.uploaded ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{status?.status === 'approved' ? 'Approved' : status?.status === 'rejected' ? 'Rejected' : status?.uploaded ? 'Uploaded' : 'Pending'}</span>
//               </div>
//               <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.desc}</div>
//               <div className="flex gap-2 mt-2 items-center">
//                 <Button size="sm" onClick={() => handlePhotoUploadClick('geo')} disabled={eventInfo?.locked}>
//                   Upload Geo-tagged Photos
//                 </Button>
//               </div>
//             </div>
//           );
//         }
//         if (task.task_name.toLowerCase() === 'standard event photos') {
//           return (
//             <div key={task.task_id} className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
//               <div className="flex items-center justify-between mb-1">
//                 <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{task.task_name}</div>
//                 <span className={`px-3 py-1 rounded-full text-xs font-medium ${status?.status === 'approved' ? 'bg-green-100 text-green-800' : status?.status === 'rejected' ? 'bg-red-100 text-red-800' : status?.uploaded ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{status?.status === 'approved' ? 'Approved' : status?.status === 'rejected' ? 'Rejected' : status?.uploaded ? 'Uploaded' : 'Pending'}</span>
//               </div>
//               <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.desc}</div>
//               <div className="flex gap-2 mt-2 items-center">
//                 <Button size="sm" onClick={() => handlePhotoUploadClick('non_geo')} disabled={eventInfo?.locked}>
//                   Upload Standard Event Photos
//                 </Button>
//               </div>
//             </div>
//           );
//         }
//         // Robust check for event banner design (slash, space, etc)
//         const normalizedBannerName = task.task_name.toLowerCase().replace(/[\\/]/g, ' ').replace(/\s+/g, ' ').trim();
//         if (normalizedBannerName === 'event banner design') {
//           return (
//             <div key={task.task_id} className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
//               <div className="flex items-center justify-between mb-1">
//                 <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{task.task_name}</div>
//                 <span className={`px-3 py-1 rounded-full text-xs font-medium ${status?.status === 'approved' ? 'bg-green-100 text-green-800' : status?.status === 'rejected' ? 'bg-red-100 text-red-800' : status?.uploaded ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{status?.status === 'approved' ? 'Approved' : status?.status === 'rejected' ? 'Rejected' : status?.uploaded ? 'Uploaded' : 'Pending'}</span>
//               </div>
//               <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.desc}</div>
//               <div className="flex gap-2 mt-2 items-center">
//                 <Button size="sm" onClick={() => { console.log('Banner upload!'); handlePhotoUploadClick('banner'); }} disabled={eventInfo?.locked}>
//                   Upload Event Banner/Design
//                 </Button>
//               </div>
//             </div>
//           );
//         }
//         if (task.task_name === 'Social Media Promotion Links') {
//           return (
//             <div key={task.task_id} className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
//               <div className="flex items-center justify-between mb-1">
//                 <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{task.task_name}</div>
//                 <span className={`px-3 py-1 rounded-full text-xs font-medium ${status?.status === 'approved' ? 'bg-green-100 text-green-800' : status?.status === 'rejected' ? 'bg-red-100 text-red-800' : status?.uploaded ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{status?.status === 'approved' ? 'Approved' : status?.status === 'rejected' ? 'Rejected' : status?.uploaded ? 'Uploaded' : 'Pending'}</span>
//               </div>
//               <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.desc}</div>
//               <div className="flex gap-2 mt-2 items-center">
//                 <Button size="sm" onClick={() => handleLinksUploadClick(task.task_id)} disabled={eventInfo?.locked}>
//                   Upload Social Media Links
//                 </Button>
//               </div>
//             </div>
//           );
//         }
//         // Default: use TaskRow for other tasks
//         return (
//           <TaskRow
//             key={task.task_id}
//             task={task}
//             status={taskStatus[task.task_id]}
//             onUploadClick={handleUploadClick}
//             onReuploadClick={handleReuploadClick}
//             locked={eventInfo?.locked}
//           />
//         );
//       })
//                   ) : (
//                 <div className="min-h-[400px] flex items-center justify-center">
//                   <p className="text-gray-600 dark:text-gray-400">No tasks assigned to you.</p>
//                 </div>
//               )}
//   </div>
// )}
//         {viewMode === 'uploaded' && (
//   <div>
//     <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Uploaded by Me</h2>
//     {uploadedByMeTasks.length > 0 ? (
//       uploadedByMeTasks.map((task, idx) => {
//         // Fallbacks for eventId and eventName
//         const eventIdForRemove = task.event_id || eventId || params.eventId || (eventInfo && eventInfo.id);
//         const eventNameForRemove = task.event_name || (eventInfo && eventInfo.event_name) || '';
//         // Robust folderType mapping
//         let folderType;
//         if (task.task_name === 'Geo-tagged Event Photographs') folderType = 'geo_tag';
//         else if (task.task_name === 'Standard Event Photos') folderType = 'non_geo_tag';
//         else if (task.task_name === 'Event Banner Design') folderType = 'event_banner';
//         else if (task.task_name === 'Social Media Promotion Links') folderType = 'none';
//         else if (task.task_name === 'Event Highlight Video') folderType = 'event_highlights';
//         else folderType = undefined;
//         // Robust docType mapping
//         let docType;
//         if (task.task_name === 'Social Media Promotion Links') {
//           docType = 'link';
//         } else if (task.data_format && typeof task.data_format === 'object' && task.data_format.doc_type) {
//           docType = task.data_format.doc_type;
//         } else if (typeof task.data_format === 'string') {
//           try {
//             docType = JSON.parse(task.data_format).doc_type;
//           } catch {
//             docType = undefined;
//           }
//         }
        
//         return (
//           <UploadedTaskRow
//             key={task.id || idx}
//             task={task}
//             eventIdForRemove={eventIdForRemove}
//             eventNameForRemove={eventNameForRemove}
//             docType={docType}
//             onRemoved={refreshTaskStatus}
//           />
//         );
//       })
//     ) : (
//       <p className="text-gray-600 dark:text-gray-400">No uploaded tasks found.</p>
//     )}
//     {/* View modal for links */}
//     <Dialog open={showLinksViewModal} onOpenChange={setShowLinksViewModal}>
//       <DialogContent style={{ maxWidth: 500, minWidth: 350 }}>
//         <DialogHeader>
//           <DialogTitle>{viewLinksTitle}</DialogTitle>
//         </DialogHeader>
//         <div className="space-y-2" style={{ maxHeight: 350, overflowY: viewLinks.length > 5 ? 'auto' : 'visible' }}>
//           {viewLinks.map((link, idx) => (
//             <div key={idx} className="flex items-center gap-2 p-2 border rounded">
//               <span className="flex-1 break-all font-medium">{link.name}</span>
//               <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all flex-1">{link.url}</a>
//             </div>
//           ))}
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={() => setShowLinksViewModal(false)}>Close</Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//     {/* Files Modal for multiple uploads */}
//     <Dialog open={showFilesModal} onOpenChange={setShowFilesModal}>
//       <DialogContent style={{ maxWidth: 600, minWidth: 400 }}>
//         <DialogHeader>
//           <DialogTitle>Files for: {modalTitle}</DialogTitle>
//         </DialogHeader>
//         <div className="space-y-4">
//           {(!modalFiles || modalFiles.length === 0) ? (
//             <div className="text-gray-500">No files uploaded.</div>
//           ) : (
//             modalFiles.map((file, idx) => {
//               const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name || file.url);
//               const isPDF = /\.pdf$/i.test(file.name || file.url);
//               const isOffice = /\.(docx?|xlsx?|pptx?)$/i.test(file.name || file.url);
//               return (
//                 <div key={idx} className="flex items-center gap-2 p-2 border rounded">
//                   <span className="flex-1 break-all">{file.name || file.url}</span>
//                   <Button
//                     variant="link"
//                     onClick={() => {
//                       if (isOffice) {
//                         const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(file.url)}`;
//                         window.open(officeUrl, '_blank', 'noopener,noreferrer');
//                       } else if (isPDF || isImage) {
//                         window.open(file.url, '_blank', 'noopener,noreferrer');
//                       } else {
//                         window.open(file.url, '_blank', 'noopener,noreferrer');
//                       }
//                     }}
//                     className="text-blue-600"
//                   >
//                     View
//                   </Button>
//                   <Button
//                     variant="ghost"
//                     onClick={() => window.open(file.url, '_blank', 'noopener,noreferrer')}
//                     className="text-blue-600"
//                   >
//                     Download
//                   </Button>
//                 </div>
//               );
//             })
//           )}
//         </div>
//         <DialogFooter>
//           <Button variant="outline" onClick={() => setShowFilesModalWithDebug(false)}>Back</Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   </div>
// )}
//         {/* Other tabs and full upload/review/reject logic will be implemented in the next steps */}
//         <div className="text-gray-500 mt-8">Upload, review, and advanced task management coming next...</div>
//         <UploadDialog />
//         <ApproveDialog />
//         <RejectDialog />
//         {showPhotoUploadDialog && (
//   <Dialog 
//     open={showPhotoUploadDialog} 
//     onOpenChange={(open) => {
//       if (!open) {
//         setShowPhotoUploadDialog(false);
//         setPhotoUploadFiles([]);
//         setPhotoUploadTaskType(null);
//         if (fileInputRef.current) {
//           fileInputRef.current.value = '';
//         }
//       }
//     }}
//   >
//         <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-6">
//       <DialogHeader>
//         <DialogTitle className="text-lg font-semibold mb-2">
//           {(() => {
//             if (photoUploadTaskType === 'geo') return 'Upload Geo-tagged Photos';
//             if (photoUploadTaskType === 'non_geo') return 'Upload Standard Event Photos';
//             if (photoUploadTaskType === 'banner') return 'Upload Event Banner/Design';
//             if (photoUploadTaskType === 'event_highlights') return 'Upload Event Highlights Video';
//             if (photoUploadTaskType && photoUploadTaskType.startsWith('certi_')) return 'Upload Certificates';
//             return 'Upload Files';
//           })()}
//         </DialogTitle>
//       </DialogHeader>
//       <div
//         className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors mb-6"
//         onDrop={handlePhotoDrop}
//         onDragOver={e => e.preventDefault()}
//         onClick={() => fileInputRef.current && fileInputRef.current.click()}
//       >
//         <p className="text-gray-700">Drag and drop files here, or click to select</p>
//         <input
//           ref={fileInputRef}
//           type="file"
//           multiple
//           className="hidden"
//           onChange={handlePhotoSelect}
//         />
//       </div>
//       <div className={`space-y-3 ${photoUploadFiles.length > 5 ? 'max-h-48 overflow-y-auto' : ''} mb-6`}>
//         {photoUploadFiles.length === 0 ? (
//           <span className="text-gray-500">No files selected.</span>
//         ) : (
//           photoUploadFiles.map((file, idx) => (
//             <div key={idx} className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-2 gap-3">
//               <span className="truncate max-w-xs text-gray-900 min-w-0 flex-1" title={file.name}>{file.name}</span>
//               <button
//                 type="button"
//                 aria-label="Remove file"
//                 onClick={() => handleRemovePhotoFile(idx)}
//                 className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors ml-auto"
//               >
//                 <X size={18} />
//               </button>
//             </div>
//           ))
//         )}
//       </div>
//       <DialogFooter>
//         <Button onClick={handlePhotoUpload} disabled={photoUploadFiles.length === 0} className="w-full mt-2">
//           Upload
//         </Button>
//       </DialogFooter>
//     </DialogContent>
//   </Dialog>
// )}
//         {/* Social Media Links Modal */}
//         <Dialog open={showLinksModal} onOpenChange={(open) => {
//           setShowLinksModal(open);
//           if (open) {
//             // Clear activeTask when links modal opens to prevent file upload modal from interfering
//             setActiveTaskWithDebug(null);
//           } else {
//             // Clear activeTask when links modal closes to prevent file upload modal from opening
//             setActiveTaskWithDebug(null);
//             // Clear link reupload info when modal closes
//             setLinkReuploadInfo(null);
//           }
//         }}>
//           <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
//             <DialogHeader>
//               <DialogTitle>Upload Social Media Links</DialogTitle>
//             </DialogHeader>
//             <div className={`space-y-2 ${links.length > 5 ? 'max-h-64 overflow-y-auto' : ''}`}>
//               {links.map((link, idx) => (
//                 <div key={idx} className="flex gap-2 items-center">
//                   <Input
//                     placeholder="Name (e.g. Instagram Post)"
//                     value={link.name}
//                     onChange={e => handleLinkChange(idx, 'name', e.target.value)}
//                     className="flex-1"
//                   />
//                   <Input
//                     placeholder="URL"
//                     value={link.url}
//                     onChange={e => handleLinkChange(idx, 'url', e.target.value)}
//                     className="flex-1"
//                   />
//                   <Button variant="ghost" size="sm" onClick={() => handleRemoveLink(idx)} disabled={links.length === 1} className="flex-shrink-0">
//                     <X size={16} />
//                   </Button>
//                 </div>
//               ))}
//               <Button variant="outline" size="sm" onClick={handleAddLink} className="mt-2">Add Another Link</Button>
//               {linksError && <div className="text-red-500 text-sm mt-2">{linksError}</div>}
//             </div>
//             <DialogFooter>
//               <Button 
//                 onClick={() => !eventInfo?.locked && handleSubmitLinks()} 
//                 disabled={isLinksUploading || eventInfo?.locked} 
//                 className={`w-full ${eventInfo?.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
//               >
//                 {isLinksUploading ? 'Uploading...' : 'Submit Links'}
//               </Button>
//             </DialogFooter>
//           </DialogContent>
//         </Dialog>
//         {viewMode === 'reviews' && (
//           <PendingReviewsSection
//             sections={(() => {
//               // Group tasks by actual sender role using table information
//               const groupedTasks = {};
//               pendingReviewTasks.forEach(task => {
//                 const senderRole = task.tableName ? getSenderRoleFromTable(task.tableName) : 'Unknown Role';
//                 if (!groupedTasks[senderRole]) {
//                   groupedTasks[senderRole] = [];
//                 }
//                 groupedTasks[senderRole].push(task);
//               });

//               // Convert grouped tasks to sections format
//               const sections = Object.entries(groupedTasks).map(([role, tasks], index) => ({
//                 key: `section-${index}`,
//                 title: `From ${role}`,
//                 badgeColor: 'bg-purple-100 text-purple-800',
//                 tasks: tasks,
//                 taskProps: {}
//               }));

//               return sections;
//             })()}
//             onDownloadClick={handleDownload}
//             onRemoveClick={handleRemove}
//             onApproveClick={(task) => setReviewingTask(task)}
//             onRejectClick={(task) => setReviewingTask(task)}
//             isLocked={eventInfo?.locked}
//             UploadedTaskRowComponent={({ task, status, onDownloadClick, onRemoveClick, onApproveClick, onRejectClick, isReview }) => {
//               // Special handling for Promotion Team Details
//               if (task.task_name === 'Promotion Team Details') {
//                 return (
//                   <div className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
//                     <div className="flex items-center justify-between mb-1">
//                       <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{task.task_name}</div>
//                       <span className={`px-3 py-1 rounded-full text-xs font-medium ${task.status === 'approved' ? 'bg-green-100 text-green-800' : task.status === 'rejected' ? 'bg-red-100 text-red-800' : task.uploaded ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{task.status === 'approved' ? 'Approved' : task.status === 'rejected' ? 'Rejected' : task.uploaded ? 'Uploaded' : 'Pending'}</span>
//                     </div>
//                     <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.task_desc}</div>
//                     <div className="flex gap-2 mt-2">
//                       {task.data_format && task.data_format.doc_type === 'file' ? (
//                         Array.isArray(task.file_link) && task.file_link.length > 1 ? (
//                           <Button size="sm" variant="outline" onClick={() => {
//                             setModalFiles(task.file_link);
//                             setModalTitle(task.task_name);
//                             setShowFilesModalWithDebug(true);
//                           }}>View</Button>
//                         ) : Array.isArray(task.file_link) && task.file_link.length === 1 ? (
//                           <Button size="sm" variant="outline" onClick={() => {
//                             const fileUrl = task.file_link[0].url;
//                             if (/\.(xlsx?|docx?|pptx?)$/i.test(fileUrl)) {
//                               const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
//                               window.open(officeUrl, '_blank', 'noopener,noreferrer');
//                             } else {
//                               window.open(fileUrl, '_blank', 'noopener,noreferrer');
//                             }
//                           }}>View</Button>
//                         ) : null
//                       ) : task.data_format && task.data_format.doc_type === 'table' ? (
//                         Array.isArray(task.file_link) && task.file_link.length > 0 ? (
//                           <Button size="sm" variant="outline" onClick={() => {
//                             const fileUrl = task.file_link[0].url;
//                             const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
//                             window.open(officeUrl, '_blank', 'noopener,noreferrer');
//                           }}>View</Button>
//                         ) : null
//                       ) : null}
//                       <Button 
//                         size="sm" 
//                         variant="success" 
//                         onClick={() => !eventInfo?.locked && onApproveClick(task)} 
//                         className={`transition-transform hover:scale-105 flex items-center gap-1 ${eventInfo?.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
//                         disabled={eventInfo?.locked}
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
//                         Approve
//                       </Button>
//                       <Button 
//                         size="sm" 
//                         variant="destructive" 
//                         onClick={() => !eventInfo?.locked && onRejectClick(task)} 
//                         className={`transition-transform hover:scale-105 flex items-center gap-1 ${eventInfo?.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
//                         disabled={eventInfo?.locked}
//                       >
//                         <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
//                         Reject
//                       </Button>
//                     </div>
//                   </div>
//                 );
//               }
              
//               // Default for other tasks
//               return (
//                 <div className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
//                   <div className="flex items-center justify-between mb-1">
//                     <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{task.task_name}</div>
//                     <span className={`px-3 py-1 rounded-full text-xs font-medium ${task.status === 'approved' ? 'bg-green-100 text-green-800' : task.status === 'rejected' ? 'bg-red-100 text-red-800' : task.uploaded ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{task.status === 'approved' ? 'Approved' : task.status === 'rejected' ? 'Rejected' : task.uploaded ? 'Uploaded' : 'Pending'}</span>
//                   </div>
//                   <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{task.task_desc}</div>
//                   <div className="flex gap-2 mt-2">
//                     {task.data_format && task.data_format.doc_type === 'file' ? (
//                       Array.isArray(task.file_link) && task.file_link.length > 1 ? (
//                         <Button size="sm" variant="outline" onClick={() => {
//                           setModalFiles(task.file_link);
//                           setModalTitle(task.task_name);
//                           setShowFilesModalWithDebug(true);
//                         }}>View</Button>
//                       ) : Array.isArray(task.file_link) && task.file_link.length === 1 ? (
//                         <Button size="sm" variant="outline" onClick={() => {
//                           const fileUrl = task.file_link[0].url;
//                           if (/\.(xlsx?|docx?|pptx?)$/i.test(fileUrl)) {
//                             const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
//                             window.open(officeUrl, '_blank', 'noopener,noreferrer');
//                           } else {
//                             window.open(fileUrl, '_blank', 'noopener,noreferrer');
//                           }
//                         }}>View</Button>
//                       ) : null
//                     ) : task.data_format && task.data_format.doc_type === 'table' ? (
//                       Array.isArray(task.file_link) && task.file_link.length > 0 ? (
//                         <Button size="sm" variant="outline" onClick={() => {
//                           const fileUrl = task.file_link[0].url;
//                           const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
//                           window.open(officeUrl, '_blank', 'noopener,noreferrer');
//                         }}>View</Button>
//                       ) : null
//                     ) : null}
//                     <Button size="sm" variant="success" onClick={() => onApproveClick(task)} className="transition-transform hover:scale-105 flex items-center gap-1">
//                       <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
//                       Approve
//                     </Button>
//                     <Button size="sm" variant="destructive" onClick={() => onRejectClick(task)} className="transition-transform hover:scale-105 flex items-center gap-1">
//                       <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
//                       Reject
//                     </Button>
//                   </div>
//                 </div>
//               );
//             }}
//           />
//         )}
//       </div>
//       </>
//     );
//   }

//   // Placeholder for event-specific view (to be implemented in next steps)
//   return (
//     <div className="p-6 animate-fade-in">
//       <div className="mb-4">
//         <Button variant="outline" onClick={() => navigate('/events')}>
//           Back to Events
//         </Button>
//             </div>
//       <div className="mb-6">
//         <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{eventInfo?.event_name}</h1>
//         <p className="text-gray-600 dark:text-gray-300">{eventInfo?.event_desc}</p>
//         <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-400 mt-2">Social Media Promotion Manager Dashboard</h2>
//             </div>
//       {/* Tabs, task rows, upload/review/reject logic will be implemented in the next steps */}
//       <div className="text-gray-500">Task management and review features coming next...</div>
      
//         </div>
//   );
// };

// // Wrap the export in TasksProvider
// const SocialMediaManagerWithTasks = (props) => (
//   <TasksProvider>
//     <SocialMediaManager {...props} />
//   </TasksProvider>
// );

// export default SocialMediaManagerWithTasks;

