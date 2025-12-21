import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle, Clock, Users, FileText, AlertCircle, TrendingUp, X } from 'lucide-react';
import { fetchTaskReviewInfo, getSenderRoleFromTable } from '@/lib/utils';
import { useTaskComments } from '@/hooks/useTaskComments';
import CommentDisplay from '@/components/CommentDisplay';
import { insertTaskComment } from '@/lib/insertTaskComment';
import FileViewer from './components/FileViewer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TasksProvider, useTasks } from '@/contexts/TasksContext';
import EnhancedEventHeader from '@/components/EnhancedEventHeader';
import { useTableChangeTrigger } from '@/hooks/useTableChangeTrigger';
import { sendTaskRejectedEmail, sendTaskAcceptedEmail, extractRejectionReason } from '@/lib/emailNotify';

// Component to display a single task row for Technical Coordinator
const TaskRow = ({ task, status, onUploadClick, onApproveClick, onRejectClick, isReview, locked, user, currentReviewer }) => {
  const { title, desc } = task;
  const isUploaded = status && status.uploaded;
  const canUpload = !isUploaded;
  // Determine status
  let statusLabel = 'Pending';
  let statusColor = 'bg-yellow-100 text-yellow-800';
  if (isUploaded) {
    statusLabel = 'Uploaded';
    statusColor = 'bg-blue-100 text-blue-800';
  }
  // Show review status and current reviewer
  return (
    <div className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 sm:px-6 py-4 sm:py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1">
        <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{task.task_name}</div>
        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${statusColor} self-start sm:self-auto`}>{statusLabel}</span>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{desc}</div>
      
      {/* Review Progress Badges */}
      <ReviewProgressBadges status={status} roleType="tech_coord" />
      
      <div className="flex flex-wrap gap-2 mt-2 items-center">
        {canUpload && (
          <Button size="sm" onClick={() => !locked && onUploadClick(task.task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
            <span className="hidden sm:inline">Upload</span>
            <span className="sm:hidden">Upload</span>
          </Button>
        )}
        {/* Show Approve/Reject if isReview and user is current_reviewer */}
        {isReview && user?.role && status?.current_reviewer && user.role === status.current_reviewer && (
          <>
            <Button size="sm" variant="success" onClick={() => !locked && onApproveClick(task.task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span className="hidden sm:inline">Approve</span>
              <span className="sm:hidden">Approve</span>
            </Button>
            <Button size="sm" variant="destructive" onClick={() => !locked && onRejectClick(task.task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              <span className="hidden sm:inline">Reject</span>
              <span className="sm:hidden">Reject</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

// Component to display an uploaded task row for Technical Coordinator
const UploadedTaskRow = ({ task, status, onDownloadClick, onRemoveClick, onUploadClick, locked }) => {
  const { title, desc, id: task_uuid, table_data } = task;
  console.log('[DEBUG][TechCoord UploadedTaskRow] task:', task, 'status:', status);
  // Get table data from either task or status object (same as Event Coordinator)
  const actualTableData = status?.table_data || task?.table_data || table_data || null;
  // Status badge - match Event Coordinator logic
  let statusLabel = 'Pending';
  let statusColor = 'bg-yellow-100 text-yellow-800';
  if (status?.status === 'approved') {
    statusLabel = 'Approved';
    statusColor = 'bg-green-100 text-green-800';
  } else if (status?.status === 'rejected') {
    statusLabel = 'Rejected';
    statusColor = 'bg-red-100 text-red-800';
  } else if (status?.status === 'pending') {
    statusLabel = 'Pending';
    statusColor = 'bg-yellow-100 text-yellow-800';
  }
  // Comments logic - use comprehensive parameters
  let reviewStat = null;
  if (status?.status === 'approved') reviewStat = 'A';
  else if (status?.status === 'rejected') reviewStat = 'R';
  
  const { comments } = useTaskComments(
    status?.id || status?.task_uuid,
    reviewStat,
    task.task_id || status?.task_id,
    task.event_id || status?.event_id
  );
  const [commentPopoverOpen, setCommentPopoverOpen] = useState(false);
  return (
    <div className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 sm:px-6 py-4 sm:py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-1">
        <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 break-words">{task.task_name}</div>
        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${statusColor} self-start sm:self-auto`}>{statusLabel}</span>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{desc}</div>
      
      {/* Review Progress Badges */}
      <ReviewProgressBadges status={status} roleType="tech_coord" />
      
      <div className="flex flex-wrap gap-2 mt-2 items-center">
        {status?.status === 'rejected' && onUploadClick && (
          <Button size="sm" variant="outline" onClick={() => !locked && onUploadClick(task.task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
            <span className="hidden sm:inline">Reupload</span>
            <span className="sm:hidden">Reupload</span>
          </Button>
        )}
        {/* Handle file_link array format */}
        {(status?.file_link && Array.isArray(status.file_link) && status.file_link.length > 0) || status?.downloadUrl ? (
          <>
            <FileViewer 
              files={status?.file_link || status?.downloadUrl} 
              tableData={actualTableData}
              taskName={task.task_name}
              buttonLabel="View"
              variant="outline"
              buttonClass=""
            />
            <Button size="sm" variant="outline" onClick={() => !locked && onDownloadClick(task.task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
              <span className="hidden sm:inline">Download</span>
              <span className="sm:hidden">Download</span>
            </Button>
          </>
        ) : null}
        <Button size="sm" variant="destructive" onClick={() => !locked && onRemoveClick(task.task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 text-xs sm:text-sm ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          <span className="hidden sm:inline">Remove</span>
          <span className="sm:hidden">Remove</span>
        </Button>
        {comments.length > 0 && (
          <Popover open={commentPopoverOpen} onOpenChange={setCommentPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="flex items-center gap-1 text-xs sm:text-sm">
                <svg className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${commentPopoverOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                <span className="hidden sm:inline">Comments ({comments.length})</span>
                <span className="sm:hidden">Comments</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96 max-h-96 overflow-y-auto">
              <CommentDisplay comments={comments} />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};

// Main TechnicalCoordinator component
const TechnicalCoordinator = ({ eventId, section: initialSection = 'mytasks' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [taskStatus, setTaskStatus] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});
  const [eventInfo, setEventInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [section, setSection] = useState(initialSection);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dashboardStats, setDashboardStats] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const params = useParams();
  
  // Add state for modals and dialogs
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approvingTask, setApprovingTask] = useState(null);
  const [rejectingTask, setRejectingTask] = useState(null);
  const [approveComment, setApproveComment] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Add state for rejected tasks and pending reviews
  const [rejectedTasks, setRejectedTasks] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);

  // Use tasks from context
  const { tasks, loading: tasksLoading } = useTasks();

  // Table change trigger for monitoring tech_coord_main table
  const { isLoading: tableChangeLoading, lastCheck } = useTableChangeTrigger(
    'tech_coord_main',
    eventId,
    'Technical Coordinator',
    async () => {
      console.log('[TechnicalCoordinator] Tech coordinator table changed, refreshing data...');
      // Refresh data immediately without page reload
      await fetchEventDetailsAndTaskStatus();
    },
    3000,
    // Exclude upload, reupload, and remove operations from triggering the loading
    (currentData, previousData) => {
      // Don't trigger for row removal (remove button operations)
      if (currentData && previousData && currentData.length < previousData.length) {
        console.log('[TechnicalCoordinator] Detected row removal operation, skipping loading trigger');
        return false;
      }
      
      // Don't trigger for status changes from 'rejected' to 'pending' (reupload)
      // Don't trigger for status changes from null/undefined to 'pending' (normal upload)
      if (currentData && previousData) {
        for (let i = 0; i < currentData.length; i++) {
          const current = currentData[i];
          const previous = previousData.find(p => p.id === current.id);
          
          // Skip reupload operations
          if (previous && previous.status === 'rejected' && current.status === 'pending') {
            console.log('[TechnicalCoordinator] Detected reupload operation, skipping loading trigger');
            return false;
          }
          
          // Skip normal upload operations
          if (previous && (!previous.status || previous.status === 'null' || previous.status === null) && current.status === 'pending') {
            console.log('[TechnicalCoordinator] Detected normal upload operation, skipping loading trigger');
            return false;
          }
        }
      }
      return true; // Allow other changes to trigger loading
    }
  );

  // Update section state when prop changes
  useEffect(() => {
    if (initialSection && initialSection !== section) {
      setSection(initialSection);
    }
  }, [initialSection, section]);

  // Fetch rejected tasks from tech_coord_main for this event and user
  useEffect(() => {
    if (!eventId || !user?.id) return;
    const fetchRejectedTasks = async () => {
      const { data, error } = await supabase
        .from('tech_coord_main')
        .select('*, table_data, file_link')
        .eq('event_id', eventId)
        .eq('status', 'rejected')
        .eq('user_id', user.id);
      if (!error && data) setRejectedTasks(data);
      else setRejectedTasks([]);
    };
    fetchRejectedTasks();
  }, [eventId, user?.id]);

  // Compute myTasks to include rejected and not uploaded tasks (like Event Coordinator)
  const myTasks = tasks.filter((task) => {
    const status = taskStatus[task.task_name] || {};
    return (
      task.roles?.includes('Tech Coordinator') &&
      (!status.uploaded || status.status === 'rejected')
    );
  });

  // Compute uploadedByYou to only include uploaded tasks that are not rejected
  const uploadedByYou = tasks.filter((task) => {
    const status = taskStatus[task.task_name] || {};
    return (
      task.roles?.includes('Tech Coordinator') &&
      status.uploaded &&
      status.status !== 'rejected'
    );
  });

  // Fetch event details and task status on mount
  const fetchEventDetailsAndTaskStatus = async () => {
    if (!eventId) {
      setEventInfo({ event_name: 'Error', event_desc: 'Event ID not provided.' });
      setIsLoading(false);
      return;
    }

    // Use tasks from context
    if (!tasks || !Array.isArray(tasks)) {
      console.error('No tasks available from context');
      setIsLoading(false);
      return;
    }

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('event_name, event_desc, locked')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      console.error('Error fetching event details:', eventError);
      setEventInfo({ event_name: 'Event not found', event_desc: 'Could not retrieve event details.' });
      setIsLoading(false);
      return;
    }

    setEventInfo({ event_name: eventData.event_name, event_desc: eventData.event_desc, locked: !!eventData.locked });

    // Initialize all tasks with default status
    const initialStatus = {};
    tasks.forEach(({ task_name }) => {
      initialStatus[task_name] = {
        uploaded: false,
        firstApproved: false,
        secondApproved: false,
        finalApproved: false,
        filePath: null,
        downloadUrl: null,
      };
    });

      // Fetch uploaded tasks from tech_coord_main for this event
      const { data: uploadedRows, error: uploadedError } = await supabase
        .from('tech_coord_main')
        .select('*')
        .eq('event_id', eventId);
      if (!uploadedError && Array.isArray(uploadedRows)) {
        uploadedRows.forEach(row => {
          if (row.task_name && row.file_link) {
            // Handle file_link array format
            let downloadUrl = null;
            if (Array.isArray(row.file_link) && row.file_link.length > 0) {
              downloadUrl = row.file_link[0].url; // Use first file for download
            } else if (typeof row.file_link === 'string') {
              downloadUrl = row.file_link; // Fallback for old format
            }
            
            initialStatus[row.task_name] = {
              ...initialStatus[row.task_name],
              uploaded: true,
              filePath: row.file_link,
              downloadUrl: downloadUrl,
              file_link: row.file_link, // Store the full array
              table_data: row.table_data, // Include table data
              status: row.status,
              current_reviewer: row.current_reviewer,
              review_status: row.review_status,
              id: row.id,
              task_uuid: row.id,
              task_id: row.task_id,
              event_id: row.event_id,
            };
          }
        });
      }
      setTaskStatus(initialStatus);
      setIsLoading(false);
  };

  useEffect(() => {
    if (tasks && tasks.length > 0) {
      fetchEventDetailsAndTaskStatus();
    }
  }, [eventId, tasks]);

  // Add real-time subscription for auto-refresh
  useEffect(() => {
    if (!eventId) return;
    // Subscribe to tech_coord_main
    const techCoordChannel = supabase
      .channel('realtime:tech_coord_main')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tech_coord_main',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          console.log('[Realtime] tech_coord_main change:', payload);
          // Re-fetch and update state
          fetchEventDetailsAndTaskStatus();
        }
      )
      .subscribe();
    // Cleanup on unmount
    return () => {
      supabase.removeChannel(techCoordChannel);
    };
  }, [eventId]);

  // Handle upload click for Tech Coordinator
  const handleUploadClick = (taskTitle) => {
    // Handle Technical Support Team Details task (table format)
    if (taskTitle === 'Technical Support Team Details') {
      // Create a temporary row for table entry (will be properly created on submit)
      const tempRowId = `temp_${Date.now()}`;
      // Redirect to the shared table page with temp ID and task info
      navigate(`/promotion-team/${tempRowId}/table`, { 
        state: { 
          isTempRow: true,
          taskId: 't_ts', // Technical Support Team Details task ID
          taskName: taskTitle,
          eventName: eventInfo?.event_name,
          eventId // <-- pass eventId here
        } 
      });
      return;
    }

    // Default: single file upload
    setActiveTask(taskTitle);
  };

  // Handle file upload to Supabase for Tech Coordinator
  const handleUpload = async () => {
    if (!selectedFiles[activeTask]) {
      setUploadError('Please select a file to upload.');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    
    try {
      // Fetch task details from tasks table
      const taskDef = tasks.find(t => t.task_name === activeTask || t.task_id === activeTask);
      if (!taskDef) throw new Error('Task definition not found.');
      const taskName = taskDef.task_name;
      const taskId = taskDef.task_id;
      
      // Determine folder
      let folder = '';
      if (taskName.toLowerCase().includes('team details')) folder = 't_team';
      else if (taskName.toLowerCase().includes('inv')) folder = 't_inv';
      else folder = 'misc';
      const bucket = 'tech';
      console.log('DEBUG: taskName:', taskName);
      console.log('DEBUG: folder:', folder);
      console.log('DEBUG: bucket:', bucket);
      
      // Handle multiple files
      const files = Array.isArray(selectedFiles[activeTask]) ? selectedFiles[activeTask] : [selectedFiles[activeTask]];
      const fileLinkArr = [];
      let finalFileName = null;
      let finalFilePath = null;
      
      // Create event folder name (same as Event Coordinator)
      console.log('DEBUG: eventInfo:', eventInfo);
      console.log('DEBUG: eventId:', eventId);
      if (!eventInfo?.event_name) {
        throw new Error('Event information not loaded. Please refresh the page and try again.');
      }
      const eventFolder = `${eventInfo.event_name.replace(/\s+/g, '_')}_${eventId}`;
      console.log('DEBUG: eventFolder:', eventFolder);
      
      // Upload multiple files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop();
        const base = `${eventId}_${taskId}`;
        let currentFileName = `${base}_${i + 1}.${ext}`;
        let currentFilePath = `${folder}/${eventFolder}/${currentFileName}`;
        
        // Check if this is a reupload
        const isReupload = taskStatus[activeTask]?.uploaded && taskStatus[activeTask]?.status === 'rejected';
        if (isReupload) {
          currentFileName = `reuploaded_${currentFileName}`;
          currentFilePath = `${folder}/${eventFolder}/${currentFileName}`;
        }
        
        // Ensure no overwrite
        let counter = 1;
        while (true) {
          const { data: existingFiles, error: listError } = await supabase.storage.from(bucket).list(`${folder}/${eventFolder}`, { search: currentFileName });
          if (listError) throw new Error('Failed to check for existing files.');
          if (!existingFiles || !existingFiles.find(f => f.name === currentFileName)) break;
          currentFileName = `${base}_${i + 1}_${counter++}.${ext}`;
          if (isReupload) {
            currentFileName = `reuploaded_${currentFileName}`;
          }
          currentFilePath = `${folder}/${eventFolder}/${currentFileName}`;
        }
        
        console.log('DEBUG: Uploading to path:', currentFilePath);
        const { error: uploadError } = await supabase.storage.from(bucket).upload(currentFilePath, file);
        if (uploadError) throw new Error(`File upload failed for ${file.name}: ${uploadError.message}`);
        
        const publicUrl = `https://pfitttbkoyglznojhozc.supabase.co/storage/v1/object/public/${bucket}/${folder}/${eventFolder}/${currentFileName}`;
        fileLinkArr.push({ name: currentFileName, url: publicUrl });
        
        finalFileName = currentFileName;
        finalFilePath = currentFilePath;
      }
      
      // Fetch review roles from tasks table
      const { review_role } = await fetchTaskReviewInfo(taskId || taskName);
      const firstReviewer = review_role?.[0] || null;
      
      // Check if this is a reupload for a rejected task
      const { data: existingRows, error: existingError } = await supabase
        .from('tech_coord_main')
        .select('*')
        .eq('event_id', eventId)
        .eq('task_name', taskName)
        .eq('status', 'rejected')
        .limit(1);
        
      if (!existingError && Array.isArray(existingRows) && existingRows.length > 0) {
        // Reupload: update the existing row
        const row = existingRows[0];
        const prevReviewStatus = Array.isArray(row.review_status) ? row.review_status : [];
        const updates = {
          file_link: fileLinkArr,
          uploaded_at: new Date().toISOString(),
          status: 'pending',
          current_reviewer: firstReviewer,
          review_status: prevReviewStatus,
        };
        await supabase
          .from('tech_coord_main')
          .update(updates)
          .eq('id', row.id);
      } else {
        // Normal upload: insert new row
        const { error: insertError } = await supabase
          .from('tech_coord_main')
          .insert({
            event_name: eventInfo?.event_name,
            event_id: eventId,
            task_name: taskName,
            task_id: taskId,
            file_link: fileLinkArr,
            uploaded_at: new Date().toISOString(),
            status: 'pending',
            current_reviewer: firstReviewer,
            review_status: [],
          });
        if (insertError) {
          console.error('Supabase insert error:', insertError);
          throw new Error('Failed to insert into tech_coord_main table.');
        }
      }
      
      setTaskStatus((prev) => ({
        ...prev,
        [activeTask]: {
          ...prev[activeTask],
          uploaded: true,
          filePath: finalFilePath,
          downloadUrl: fileLinkArr.length === 1 ? fileLinkArr[0].url : null,
        },
      }));
      setSelectedFiles((prev) => ({ ...prev, [activeTask]: null }));
      setActiveTask(null);
    } catch (err) {
      console.error(err);
      setUploadError(err.message || 'Something went wrong.');
    } finally {
      setIsUploading(false);
    }
  };

  // --- Review logic for Tech Coordinator ---
  const handleApprove = async (taskTitle) => {
    setApprovingTask(taskTitle);
    setShowApproveModal(true);
  };

  const handleApproveWithComment = async () => {
    if (!approvingTask) return;
    
    setIsApproving(true);
    try {
      // Fetch tech_coord_main row
      const { data: rows, error } = await supabase
        .from('tech_coord_main')
        .select('*')
        .eq('event_name', eventInfo.event_name)
        .eq('task_name', approvingTask)
        .eq('status', 'pending');
      if (error || !rows || rows.length === 0) throw new Error('Task not found.');
      const row = rows[0];
      
      // Fetch review_role from tasks table
      let review_role = [];
      if (row.task_id) {
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('review_role')
          .or(`task_id.eq.${row.task_id},task_name.eq.${row.task_name}`)
          .limit(1)
          .single();
        if (!taskError && taskData && Array.isArray(taskData.review_role)) {
          review_role = taskData.review_role;
        }
      }
      
      const review_status = Array.isArray(row.review_status) ? row.review_status : [];
      const reviewerIdx = review_role ?
        review_role.findIndex(
          r => r && r.trim().toLowerCase() === String(row.current_reviewer).trim().toLowerCase()
        ) :
        0;
      
      // Check if this is a review after reupload (previously rejected)
      const wasRejected = review_status.some(s => s.status === 'R');
      const newReviewEntry = {
        step: reviewerIdx + 1,
        role: row.current_reviewer,
        status: 'A',
        timestamp: new Date().toISOString(),
        ...(wasRejected ? { reuploaded: true } : {})
      };
      
      const newReviewStatus = [...review_status, newReviewEntry];
      
      // Advance to next reviewer or finish
      let nextReviewer = null;
      if (review_role && reviewerIdx < review_role.length - 1) {
        nextReviewer = review_role[reviewerIdx + 1];
      }
      
      const isFinalApproval = !nextReviewer; // No next reviewer means final approval
      
      const updates = {
        current_reviewer: nextReviewer,
        review_status: newReviewStatus,
        status: nextReviewer ? 'pending' : 'approved',
      };
      
      await supabase
        .from('tech_coord_main')
        .update(updates)
        .eq('id', row.id);
      
      // Insert comment if provided
      if (approveComment && approveComment.trim().length > 0) {
        // Determine review_step
        let reviewStep = reviewerIdx + 1;
        console.log('[DEBUG][handleApprove] inserting approval comment:', {
          event_name: row.event_name,
          event_id: row.event_id,
          task_name: row.task_name,
          commenter_role: row.current_reviewer,
          commenter_name: (user && user.disp_name) ? user.disp_name : (user && user.email) ? user.email : 'Tech Coordinator',
          comment_text: approveComment,
          created_at: new Date().toISOString(),
          sender_table: 'tech_coord_main',
          task_uuid: row.id,
          comment_type: { type: 'review', action: 'approved', step: reviewStep }
        });
        
        const commenterName = (user && user.disp_name) ? user.disp_name : (user && user.email) ? user.email : 'Tech Coordinator';
        try {
          await insertTaskComment({
            supabase,
            comment_text: approveComment,
            task_name: row.task_name,
            event_name: row.event_name,
            commenter_role: row.current_reviewer,
            commenter_name: commenterName,
            sender_table: 'tech_coord_main',
            task_uuid: row.id,
            event_id: row.event_id,
            comment_type: { type: 'review', action: 'approved', step: reviewStep }
          });
        } catch (commentError) {
          console.log('[DEBUG][handleApprove] approval comment insert error:', commentError);
        }
      }
      
      // ========== SEND ACCEPTANCE EMAIL (only on final approval) ==========
      if (isFinalApproval) {
        sendTaskAcceptedEmail({
          taskName: row.task_name,
          eventName: row.event_name || eventInfo?.event_name || 'Unknown Event',
          assignedToLabel: row.assigned_to_label || row.assigned_to || 'technical',
          reviewerRole: row.current_reviewer || 'Final Reviewer'
        }).catch(err => console.error('Failed to send acceptance email:', err));
      }
      // ========== END EMAIL ==========
      
      setTaskStatus((prev) => ({
        ...prev,
        [approvingTask]: {
          ...prev[approvingTask],
          uploaded: true,
          status: nextReviewer ? 'pending' : 'approved',
          current_reviewer: nextReviewer,
          review_status: newReviewStatus,
        },
      }));
      
      setShowApproveModal(false);
      setApprovingTask(null);
      setApproveComment('');
      
      // Show processing state and auto-refresh after 1 second
      setIsProcessingAction(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Approve error:', err);
      alert('Failed to approve task: ' + err.message);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (taskTitle) => {
    setRejectingTask(taskTitle);
    setShowRejectModal(true);
  };

  const handleRejectWithComment = async () => {
    if (!rejectingTask) return;
    
    setIsRejecting(true);
    try {
      // Fetch tech_coord_main row
      const { data: rows, error } = await supabase
        .from('tech_coord_main')
        .select('*')
        .eq('event_name', eventInfo.event_name)
        .eq('task_name', rejectingTask)
        .eq('status', 'pending');
      if (error || !rows || rows.length === 0) throw new Error('Task not found.');
      const row = rows[0];
      
      // Fetch review_role from tasks table
      let review_role = [];
      if (row.task_id) {
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('review_role')
          .or(`task_id.eq.${row.task_id},task_name.eq.${row.task_name}`)
          .limit(1)
          .single();
        if (!taskError && taskData && Array.isArray(taskData.review_role)) {
          review_role = taskData.review_role;
        }
      }
      
      const review_status = Array.isArray(row.review_status) ? row.review_status : [];
      const reviewerIdx = review_role ?
        review_role.findIndex(
          r => r && r.trim().toLowerCase() === String(row.current_reviewer).trim().toLowerCase()
        ) :
        0;
      
      // Check if this is a review after reupload (previously rejected)
      const wasRejected = review_status.some(s => s.status === 'R');
      const newRejectEntry = {
        step: reviewerIdx + 1,
        role: row.current_reviewer,
        status: 'R',
        timestamp: new Date().toISOString(),
        ...(wasRejected ? { reuploaded: true } : {})
      };
      
      const newReviewStatus = [...review_status, newRejectEntry];
      const updatesReject = {
        current_reviewer: null,
        review_status: newReviewStatus,
        status: 'rejected',
      };
      
      await supabase
        .from('tech_coord_main')
        .update(updatesReject)
        .eq('id', row.id);
      
      // Insert rejection comment if provided
      if (rejectComment && rejectComment.trim().length > 0) {
        // Determine review_step
        let reviewStep = reviewerIdx + 1;
        console.log('[DEBUG][handleReject] inserting rejection comment:', {
          event_name: row.event_name,
          event_id: row.event_id,
          task_name: row.task_name,
          commenter_role: row.current_reviewer,
          commenter_name: (user && user.disp_name) ? user.disp_name : (user && user.email) ? user.email : 'Tech Coordinator',
          comment_text: rejectComment,
          created_at: new Date().toISOString(),
          sender_table: 'tech_coord_main',
          task_uuid: row.id,
          comment_type: { type: 'review', action: 'rejected', step: reviewStep }
        });
        
        const commenterName = (user && user.disp_name) ? user.disp_name : (user && user.email) ? user.email : 'Tech Coordinator';
        try {
          await insertTaskComment({
            supabase,
            comment_text: rejectComment,
            task_name: row.task_name,
            event_name: row.event_name,
            commenter_role: row.current_reviewer,
            commenter_name: commenterName,
            sender_table: 'tech_coord_main',
            task_uuid: row.id,
            event_id: row.event_id,
            comment_type: { type: 'review', action: 'rejected', step: reviewStep }
          });
        } catch (commentError) {
          console.log('[DEBUG][handleReject] rejection comment insert error:', commentError);
        }
      }
      
      // ========== SEND REJECTION EMAIL ==========
      sendTaskRejectedEmail({
        taskName: row.task_name,
        eventName: row.event_name || eventInfo?.event_name || 'Unknown Event',
        assignedToLabel: row.assigned_to_label || row.assigned_to || 'technical',
        reviewerRole: row.current_reviewer || 'Reviewer',
        rejectionReason: extractRejectionReason(rejectComment)
      }).catch(err => console.error('Failed to send rejection email:', err));
      // ========== END EMAIL ==========
      
      setTaskStatus((prev) => ({
        ...prev,
        [rejectingTask]: {
          ...prev[rejectingTask],
          current_reviewer: null,
          review_status: newReviewStatus,
          status: 'rejected',
        },
      }));
      
      setShowRejectModal(false);
      setRejectingTask(null);
      setRejectComment('');
      
      // Show processing state and auto-refresh after 1 second
      setIsProcessingAction(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Reject error:', err);
      alert('Failed to reject task: ' + err.message);
    } finally {
      setIsRejecting(false);
    }
  };

  // Handle file selection for upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFiles((prev) => ({ ...prev, [activeTask]: file }));
    setUploadError(null);
  };

  // Handle file download
  const handleDownload = async (taskTitle) => {
    try {
      const status = taskStatus[taskTitle];
      
      // Handle file_link array format
      let downloadUrl = null;
      let fileName = taskTitle;
      
      if (status?.file_link && Array.isArray(status.file_link) && status.file_link.length > 0) {
        downloadUrl = status.file_link[0].url;
        fileName = status.file_link[0].name;
      } else if (status?.downloadUrl) {
        downloadUrl = status.downloadUrl;
        fileName = `${taskTitle}-${status.filePath?.split('/').pop() || 'file'}`;
      } else {
        throw new Error('No file URL found for this task.');
      }

      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  };



  // Handle file removal
  const handleRemove = async (taskTitle) => {
    try {
      const status = taskStatus[taskTitle];
      
      // Handle file_link array format
      let filesToRemove = [];
      if (status?.file_link && Array.isArray(status.file_link)) {
        // Extract file paths from file_link array
        filesToRemove = status.file_link.map(file => {
          if (file.url && file.url.startsWith('http')) {
            const urlParts = file.url.split('/');
            const bucketIdx = urlParts.findIndex(p => p === 'tech');
            if (bucketIdx !== -1) {
              return urlParts.slice(bucketIdx + 1).join('/');
            }
          }
          return null;
        }).filter(Boolean);
      } else if (status?.filePath) {
        // Fallback for old format
        let filePath = status.filePath;
        if (filePath.startsWith('http')) {
          const urlParts = filePath.split('/');
          const bucketIdx = urlParts.findIndex(p => p === 'tech');
          if (bucketIdx !== -1) {
            filePath = urlParts.slice(bucketIdx + 1).join('/');
          }
        }
        filesToRemove = [filePath];
      }
      
      if (filesToRemove.length === 0) throw new Error('No files to remove.');

      // 1. Remove files from Supabase storage (bucket 'tech')
      const { error: storageError } = await supabase.storage.from('tech').remove(filesToRemove);
      if (storageError) throw new Error('Failed to remove files from storage.');

      // 2. Remove row from tech_coord_main for this event/task
      const { error: dbError } = await supabase
        .from('tech_coord_main')
        .delete()
        .eq('event_id', eventId)
        .eq('task_name', taskTitle);
      if (dbError) throw new Error('Failed to remove row from tech_coord_main.');

      // 3. Update taskStatus so task returns to My Tasks
      setTaskStatus((prev) => ({
        ...prev,
        [taskTitle]: {
          ...prev[taskTitle],
          uploaded: false,
          filePath: null,
          downloadUrl: null,
          file_link: null,
        },
      }));
      alert('Files and task removed successfully.');
    } catch (err) {
      console.error('Remove error:', err);
      alert(`Failed to remove files: ${err.message}`);
    }
  };

  // Update pendingReviews to only include tasks where current_reviewer matches user.role
  useEffect(() => {
    const fetchPendingReviews = async () => {
      if (!eventId || !user?.role) return;
      
      // Fetch pending reviews from all relevant tables
      const tables = ['secretary_main', 'treasurer_main', 'event_coord_main', 'social_main', 'vice_chair_main', 'chair_main'];
      let allPendingReviews = [];
      
      for (const tableName of tables) {
        const { data: rows, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('event_id', eventId)
          .eq('status', 'pending')
          .eq('current_reviewer', user.role);
        
        if (!error && rows) {
          allPendingReviews = allPendingReviews.concat(
            rows.map(row => ({ ...row, tableName }))
          );
        }
      }
      
      setPendingReviews(allPendingReviews);
    };
    
    fetchPendingReviews();
  }, [eventId, user?.role]);

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
    </div>
  );

  // If no eventId, render dashboard view
  if (!params.eventId && !eventId) {
    // --- Vice Chair-style dashboard logic ---

    useEffect(() => {
      if (!user) return;
      setLoadingDashboard(true);
      const fetchStats = async () => {
        // Fetch all events (future or today)
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('id, event_name, event_date');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = (events || []).filter((e) => {
          if (!e.event_date) return false;
          const eventDate = new Date(e.event_date);
          return eventDate >= today;
        });
        setUpcomingEvents(
          upcoming
            .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
            .map((e) => {
              const eventDate = new Date(e.event_date);
              const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
              let soonLabel = '';
              if (diffDays === 0) soonLabel = 'Today';
              else if (diffDays === 1) soonLabel = 'Tomorrow';
              else soonLabel = `In ${diffDays} days`;
              return {
                id: e.id,
                event_name: e.event_name,
                start_date: eventDate.toLocaleDateString(),
                soonLabel,
              };
            })
        );
        // Fetch all assigned tasks for technical coordinator
        const { data: assignedTasks, error: assignedError } = await supabase
          .from('technical_coordinator_main')
          .select('id, status');
        setDashboardStats([
          {
            title: 'Events',
            value: upcoming.length,
            icon: Calendar,
            color: 'text-blue-600',
            clickHandler: () => navigate('/events'),
          },
          {
            title: 'Assigned Tasks',
            value: assignedTasks?.length || 0,
            icon: FileText,
            color: 'text-green-600',
            clickHandler: () => navigate('/events'),
          },
          {
            title: 'Pending Tasks',
            value: assignedTasks?.filter((t) => t.status === 'pending').length || 0,
            icon: Clock,
            color: 'text-orange-600',
            clickHandler: () => navigate('/events'),
          },
          {
            title: 'Completed',
            value: assignedTasks?.filter((t) => t.status === 'approved').length || 0,
            icon: CheckCircle,
            color: 'text-purple-600',
            clickHandler: () => navigate('/events'),
          },
        ]);
        setRecentActivities([]); // You can add logic to fetch recent activities if needed
        setLoadingDashboard(false);
      };
      fetchStats();
    }, [user, navigate]);

    return (
      <div className="px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold">Welcome back, {user?.disp_name}!</h1>
          <p className="text-blue-100 mt-2">
            Here's what's happening with your club activities today.
          </p>
        </div>
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dashboardStats?.map((stat, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={stat.clickHandler}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-gray-100 ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length === 0 && (
                  <div className="text-gray-500">No recent activities.</div>
                )}
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {activity.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-blue-600" />
                      )}
                      <span className="text-sm font-medium">{activity.action}</span>
                    </div>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Upcoming Events - match Vice Chair design */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingEvents.length === 0 && (
                <div className="text-gray-500">No upcoming events.</div>
              )}
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex flex-col">
                    <span className="font-medium">{event.event_name}</span>
                    <span className="text-xs text-gray-500">Starts: {event.start_date}</span>
                  </div>
                  <Badge variant={event.soonLabel === 'Today' ? 'destructive' : 'outline'}>{event.soonLabel}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/events')}
              >
                <FileText className="h-6 w-6" />
                View Events
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/events')}
              >
                <Users className="h-6 w-6" />
                Event Tasks
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col gap-2"
                onClick={() => navigate('/events')}
              >
                <TrendingUp className="h-6 w-6" />
                Event Overview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main render
  return (
    <>
      {/* Processing Overlay */}
      {isProcessingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">Processing...</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Please wait while we update the system</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="p-6 animate-fade-in">
          <div className="mb-4">
            <Button variant="outline" onClick={() => navigate('/events')}>
              Back to Events
            </Button>
          </div>

          {/* Enhanced Event Header Component */}
          <EnhancedEventHeader
            eventInfo={eventInfo}
            roleName="Technical Coordinator"
            roleColor="green"
            showStats={true}
            stats={{
              myTasks: myTasks.length,
              uploaded: uploadedByYou.length,
              pendingReviews: pendingReviews.length,
              rejected: rejectedTasks.length
            }}
          />

          {/* Enhanced Navigation */}
          <div className="mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Navigation
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  variant={section === 'mytasks' ? 'default' : 'outline'} 
                  onClick={() => {
                    setSection('mytasks');
                    navigate(`/event-tasks/${eventId}/techcoordinator/mytasks`);
                  }}
                  className={`h-12 ${section === 'mytasks' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  My Tasks
                </Button>
                <Button 
                  variant={section === 'uploaded' ? 'default' : 'outline'} 
                  onClick={() => {
                    setSection('uploaded');
                    navigate(`/event-tasks/${eventId}/techcoordinator/uploaded`);
                  }}
                  className={`h-12 ${section === 'uploaded' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Uploaded
                </Button>
                <Button 
                  variant={section === 'reviews' ? 'default' : 'outline'} 
                  onClick={() => {
                    setSection('reviews');
                    navigate(`/event-tasks/${eventId}/techcoordinator/reviews`);
                  }}
                  className={`h-12 ${section === 'reviews' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Reviews
                </Button>
              </div>
            </div>
          </div>

                      {section === 'mytasks' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">My Tasks</h2>
              {myTasks.length > 0 ? (
                myTasks.map((task, index) => {
                  const status = taskStatus[task.task_name] || {};
                  const isRejected = status.status === 'rejected';
                  
                  if (isRejected) {
                    // Show rejected tasks with reupload option
                    return (
                      <UploadedTaskRow
                        key={index}
                        task={{ ...task, event_id: eventId, event_name: eventInfo?.event_name }}
                        status={{ ...status, event_name: eventInfo?.event_name, event_id: eventId }}
                        onDownloadClick={handleDownload}
                        onRemoveClick={handleRemove}
                        onUploadClick={handleUploadClick}
                        locked={eventInfo?.locked}
                      />
                    );
                  } else {
                    // Show non-uploaded tasks
                    return (
                      <TaskRow
                        key={index}
                        task={task}
                        status={status}
                        onUploadClick={handleUploadClick}
                        onApproveClick={handleApprove}
                        onRejectClick={handleReject}
                        isReview={false}
                        locked={eventInfo?.locked}
                        user={user}
                        currentReviewer={status?.current_reviewer}
                      />
                    );
                  }
                })
              ) : (
                <div className="min-h-[400px] flex items-center justify-center">
                  <p className="text-gray-600 dark:text-gray-400">No tasks assigned to you.</p>
                </div>
              )}
            </div>
          )}

                      {section === 'uploaded' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Uploaded by Me</h2>
              {uploadedByYou.length > 0 ? (
                uploadedByYou.map((task, index) => {
                  const status = taskStatus[task.task_name] || {};
                  return (
                    <UploadedTaskRow
                      key={index}
                      task={{ ...task, event_id: eventId, event_name: eventInfo?.event_name }}
                      status={{ ...status, event_name: eventInfo?.event_name, event_id: eventId }}
                      onDownloadClick={handleDownload}
                      onRemoveClick={handleRemove}
                      locked={eventInfo?.locked}
                    />
                  );
                })
              ) : (
                <div className="min-h-[400px] flex items-center justify-center">
                  <p className="text-gray-600 dark:text-gray-400">No tasks uploaded by you.</p>
                </div>
              )}
            </div>
          )}

                      {section === 'reviews' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Pending Reviews</h2>
              {pendingReviews.length > 0 ? (
                                  (() => {
                    // Group tasks by original sender's role using table information
                    const groupedTasks = {};
                    pendingReviews.forEach(task => {
                      // Use tableName to determine the actual sender role
                      const senderRole = task.tableName ? getSenderRoleFromTable(task.tableName) : 'Unknown Role';
                      if (!groupedTasks[senderRole]) {
                        groupedTasks[senderRole] = [];
                      }
                      groupedTasks[senderRole].push(task);
                    });

                    return Object.entries(groupedTasks).map(([role, tasks]) => (
                      <div key={role} className="mb-6">
                        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                          From {role}
                        </h3>
                        {tasks.map((task, index) => (
                          <TaskRow
                            key={`${role}-${index}`}
                            task={task}
                            status={taskStatus[task.task_name]}
                            onUploadClick={handleUploadClick}
                            onApproveClick={handleApprove}
                            onRejectClick={handleReject}
                            isReview={true}
                            user={user}
                            currentReviewer={taskStatus[task.task_name]?.current_reviewer}
                            locked={eventInfo?.locked}
                          />
                        ))}
                      </div>
                    ));
                  })()
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No pending reviews.</p>
              )}
            </div>
          )}

                      {section === 'approved' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-green-700 dark:text-green-400">Approved Tasks</h2>
              {approvedTasks.length > 0 ? (
                approvedTasks.map((task, index) => (
                  <TaskRow
                    key={index}
                    task={task}
                    status={taskStatus[task.task_name]}
                    onUploadClick={handleUploadClick}
                    onApproveClick={handleApprove}
                    isReview={false}
                    locked={eventInfo?.locked}
                  />
                ))
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No approved tasks.</p>
              )}
            </div>
          )}

          {/* Upload Dialog */}
          <Dialog open={!!activeTask} onOpenChange={() => setActiveTask(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload for: {activeTask}</DialogTitle>
              </DialogHeader>
              <Input type="file" onChange={handleFileChange} className="my-4" />
              {uploadError && <p className="text-red-500 text-sm my-2">{uploadError}</p>}
              <DialogFooter className="flex gap-3">
                <Button variant="outline" onClick={() => setActiveTask(null)} disabled={isUploading}>
                  Back
                </Button>
                <Button onClick={handleUpload} disabled={!selectedFiles[activeTask] || isUploading}>
                  {isUploading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    'Submit'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Approve Dialog */}
          <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve Task: {approvingTask}</DialogTitle>
              </DialogHeader>
              <Textarea
                placeholder="Add a comment (optional)"
                value={approveComment}
                onChange={e => setApproveComment(e.target.value)}
                className="my-4"
                rows={4}
                disabled={isApproving}
              />
              <DialogFooter className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowApproveModal(false); setApprovingTask(null); setApproveComment(''); }} disabled={isApproving}>
                  Cancel
                </Button>
                <Button onClick={handleApproveWithComment} disabled={isApproving}>
                  {isApproving ? 'Approving...' : 'Approve'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reject Dialog */}
          <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Task: {rejectingTask}</DialogTitle>
              </DialogHeader>
              <Textarea
                placeholder="Add a comment (optional)"
                value={rejectComment}
                onChange={e => setRejectComment(e.target.value)}
                className="my-4"
                rows={4}
                disabled={isRejecting}
              />
              <DialogFooter className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowRejectModal(false); setRejectingTask(null); setRejectComment(''); }} disabled={isRejecting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleRejectWithComment} disabled={isRejecting}>
                  {isRejecting ? 'Rejecting...' : 'Reject'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


        </div>
      )}
    </>
  );
};

// Wrap the export in TasksProvider
const TechnicalCoordinatorWithTasks = (props) => (
  <TasksProvider>
    <TechnicalCoordinator {...props} />
  </TasksProvider>
);

export default TechnicalCoordinatorWithTasks; 