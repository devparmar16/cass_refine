import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Calendar, CheckCircle, Clock, Users, FileText, AlertCircle, TrendingUp, X } from 'lucide-react';
import FileViewer from "./components/FileViewer";
import { TasksProvider, useTasks } from '../contexts/TasksContext';
import { useTaskComments } from '@/hooks/useTaskComments';
import CommentDisplay from '@/components/CommentDisplay';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getSenderRoleFromTable } from '@/lib/utils';
// Import the unwrapped AllEventsList component to avoid nested TasksProviders
import AllEventsList from '@/components/AllEventsList';
import EnhancedEventHeader from '@/components/EnhancedEventHeader';
import { useTableChangeTrigger } from '@/hooks/useTableChangeTrigger';

// Component to display a single task row for Event Coordinator
const TaskRow = ({ task, status, onUploadClick, onApproveClick, isReview, locked }) => {
  const title = task.task_name || task.title || 'Untitled Task';
  const desc = task.desc || task.description || '';
  const isUploaded = status && status.uploaded;
  // Determine status
  let statusLabel = 'Pending';
  let statusColor = 'bg-yellow-100 text-yellow-800';
  if (isUploaded) {
    statusLabel = 'Uploaded';
    statusColor = 'bg-blue-100 text-blue-800';
  }
  return (
    <div className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>{statusLabel}</span>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{desc}</div>
      <div className="flex gap-2 mt-2 items-center">
        {!isUploaded && (
          <Button size="sm" onClick={() => !locked && onUploadClick(title)} className={`transition-transform hover:scale-105 flex items-center gap-1 ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" /></svg>
            Upload
          </Button>
        )}
      </div>
    </div>
  );
};

// Component to display an uploaded task row for Event Coordinator
const UploadedTaskRow = ({ task, status, onDownloadClick, onRemoveClick, onApproveClick, onRejectClick, onUploadClick, isReview, folder, locked }) => {
  const { task_name, desc, form_data, table_data, id: task_uuid } = task;
  // Get table data from either task or status object
  const actualTableData = status?.table_data || task?.table_data || table_data || null;
  // Status badge
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
  // Comments logic
  let reviewStat = null;
  if (status?.status === 'approved') reviewStat = 'A';
  else if (status?.status === 'rejected') reviewStat = 'R';
  // Use id/task_uuid from DB row if available, else fallback to task.id/title
  const commentTaskUuid = status?.id || status?.task_uuid;
  const isValidUuid = commentTaskUuid && /^[0-9a-fA-F-]{36}$/.test(commentTaskUuid);
  const { comments } = useTaskComments(
    commentTaskUuid,
    reviewStat,
    task?.task_id || status?.task_id,
    task?.event_id || status?.event_id,
    task?.task_name,
    'Event Coordinator'
  );
  const [commentPopoverOpen, setCommentPopoverOpen] = useState(false);
  return (
    <div className="transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-6 py-5 mb-5 shadow-sm hover:shadow-lg flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{task_name}</div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>{statusLabel}</span>
      </div>
      {/* Show table_data if present, else form_data, else file actions */}
      <div className="flex gap-2 mt-2 items-center">
        {/* Always use FileViewer for file viewing */}
        <FileViewer 
          files={status?.file_link || task?.file_link || status?.downloadUrl || status?.fileUrl || task?.downloadUrl} 
          tableData={actualTableData} 
          taskName={task_name}
          buttonLabel="View"
          variant="outline"
          buttonClass="transition-transform hover:scale-105 flex items-center gap-1"
        />


        {status?.file_link && (
          <Button size="sm" onClick={() => !locked && onDownloadClick(task_name)} className={`transition-transform hover:scale-105 flex items-center gap-1 ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16h16V4H4zm4 8h8" /></svg>
            Download
          </Button>
        )}
        {isReview && (
          <>
          <Button size="sm" variant="success" onClick={() => !locked && onApproveClick()} className={`transition-transform hover:scale-105 flex items-center gap-1 ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            Approve
          </Button>
                      <Button size="sm" variant="destructive" onClick={() => !locked && onRejectClick()} className={`transition-transform hover:scale-105 flex items-center gap-1 ${locked ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={locked}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              Reject
            </Button>
          </>
        )}
        {!isReview && (
          <Button size="sm" variant="outline" onClick={onRemoveClick} className="transition-transform hover:scale-105 flex items-center gap-1">
            <X className="w-4 h-4" />
            Remove
          </Button>
        )}

        {comments.length > 0 && (
          <Popover open={commentPopoverOpen} onOpenChange={setCommentPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="flex items-center gap-1">
                <svg className={`w-4 h-4 transition-transform ${commentPopoverOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                Comments ({comments.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 max-h-96 overflow-y-auto">
              <CommentDisplay comments={comments} />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};

// Main EventCoordinator component
const EventCoordinator = ({ eventId: propEventId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  
  // Get eventId from props or URL params
  const eventId = propEventId || params.eventId;
  
  // Debug logging for eventId
  console.log('EventCoordinator - propEventId:', propEventId);
  console.log('EventCoordinator - params.eventId:', params.eventId);
  console.log('EventCoordinator - final eventId:', eventId);
  console.log('EventCoordinator - typeof eventId:', typeof eventId);
  console.log('EventCoordinator - all params:', params);
  const [taskStatus, setTaskStatus] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});
  const [eventInfo, setEventInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState('my');
  const [dashboardStats, setDashboardStats] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [stats, setStats] = useState([]);
  const normalizedRole = user?.role?.toLowerCase().replace(/\s+/g, '_');
  // Add state for rejected tasks
  const [rejectedTasks, setRejectedTasks] = useState([]);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Table change trigger for monitoring event_coord_main table
  const { isLoading: tableChangeLoading, lastCheck } = useTableChangeTrigger(
    'event_coord_main',
    eventId,
    'Event Coordinator',
    async () => {
      console.log('[EventCoordinator] Event coordinator table changed, refreshing data...');
      // Refresh data immediately without page reload
      await fetchEventDetailsAndTaskStatus();
    },
    3000,
    // Exclude upload, reupload, and remove operations from triggering the loading
    (currentData, previousData) => {
      // Don't trigger for row removal (remove button operations)
      if (currentData && previousData && currentData.length < previousData.length) {
        console.log('[EventCoordinator] Detected row removal operation, skipping loading trigger');
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
            console.log('[EventCoordinator] Detected reupload operation, skipping loading trigger');
            return false;
          }
          
          // Skip normal upload operations
          if (previous && (!previous.status || previous.status === 'null' || previous.status === null) && current.status === 'pending') {
            console.log('[EventCoordinator] Detected normal upload operation, skipping loading trigger');
            return false;
          }
        }
      }
      return true; // Allow other changes to trigger loading
    }
  );

  // Use tasks from context
  const { tasks, loading: tasksLoading } = useTasks();

  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles((prev) => ({
      ...prev,
      [activeTask]: [...(prev[activeTask] || []), ...files],
    }));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => ({
      ...prev,
      [activeTask]: [...(prev[activeTask] || []), ...files],
    }));
  };

  const handleRemoveFile = (taskKey, fileIndex) => {
    setSelectedFiles((prev) => {
      const currentFiles = prev[taskKey];
      if (!currentFiles) return prev;
      const newFiles = currentFiles.filter((_, index) => index !== fileIndex);
      return { ...prev, [taskKey]: newFiles };
    });
  };

  // Fetch event details and task status on mount
  useEffect(() => {
    const fetchEventDetailsAndTaskStatus = async () => {
      if (!eventId) {
        setEventInfo({ event_name: 'Error', event_desc: 'Event ID not provided.' });
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

      const initialStatus = {};

      // Initialize all tasks with default status
      tasks.forEach(({ title }) => {
        initialStatus[title] = {
          uploaded: false,
          firstApproved: false,
          secondApproved: false,
          finalApproved: false,
          filePath: null,
          downloadUrl: null,
        };
      });

      // Replace all dynamic linkCol/upCol logic and event_coord_ind references with event_coord_main and new schema fields
      const { data: taskRows, error: taskRowsError } = await supabase
        .from('event_coord_main')
        .select('*, table_data, file_link')
        .eq('event_id', eventId);

      if (taskRowsError) {
        console.error('Error fetching event coordinator tasks:', taskRowsError);
        setTaskStatus(initialStatus);
        setIsLoading(false);
        return;
      }

      // Map DB rows to taskStatus
      const dbStatus = { ...initialStatus };
      taskRows?.forEach(row => {
        // Handle both old string format and new array format
        let filePath = null;
        let downloadUrl = null;
        
        if (row.file_link) {
          if (Array.isArray(row.file_link)) {
            // New format: array of objects
            if (row.file_link.length > 0) {
              const firstFile = row.file_link[0];
              filePath = firstFile.name;
              downloadUrl = firstFile.url;
            }
          } else {
            // Old format: string URL
            filePath = row.file_link.split('/').slice(-2).join('/');
            downloadUrl = row.file_link;
          }
        }
        
        dbStatus[row.task_name] = {
          uploaded: !!row.file_link,
          filePath: filePath,
          downloadUrl: downloadUrl,
          firstApproved: !!row.review_one,
          secondApproved: false, // Not in schema, keep for UI compatibility
          finalApproved: !!row.final_review,
          status: row.status, // Add status field
          table_data: row.table_data, // Include table data
          file_link: row.file_link, // Include file link
          task_id: row.task_id, // Add task_id for ReviewProgressBadges
          task_name: row.task_name, // Add task_name for ReviewProgressBadges
          review_status: row.review_status, // Add review_status for ReviewProgressBadges
          current_reviewer: row.current_reviewer, // Add current_reviewer for ReviewProgressBadges
        };
      });
      setTaskStatus(dbStatus);
      setIsLoading(false);
    };

    fetchEventDetailsAndTaskStatus();
  }, [eventId, tasks]);

  // Fetch rejected tasks from event_coord_main for this event and user
  useEffect(() => {
    if (!eventId || !user?.id) return;
    const fetchRejectedTasks = async () => {
      const { data, error } = await supabase
        .from('event_coord_main')
        .select('*, table_data, file_link')
        .eq('event_id', eventId)
        .eq('status', 'rejected')
        .eq('user_id', user.id);
      if (!error && data) setRejectedTasks(data);
      else setRejectedTasks([]);
    };
    fetchRejectedTasks();
  }, [eventId, user?.id]);

  // Mapping from task title to folder and columns (updated to match TaskData.js titles)
  const taskToStorageMap = {
    'Attendance Sheet': 'attend_sheet',
    'Anchoring Script': 'anchor_team',
    'Decoration Team Details': 'decoration_team',
    'Event Flow Schedule': 'event_flow',
    'Chairperson Script': 'script',
    'Volunteer Team Assignments': 'volunteer_team',
  };

  // Custom upload handler for table-based tasks
  const handleUploadClick = (taskTitle) => {
    // Handle Decoration Team Details task (table format)
    if (taskTitle === 'Decoration Team Details') {
      // Create a temporary row for table entry (will be properly created on submit)
      const tempRowId = `temp_${Date.now()}`;
      // Redirect to the shared table page with temp ID and task info
      navigate(`/promotion-team/${tempRowId}/table`, { 
        state: { 
          isTempRow: true,
          taskId: 't_dt', // Decoration Team Details task ID
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

  // Handle file upload to Supabase
  const handleUpload = async () => {
    if (!selectedFiles[activeTask]) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const filesToUpload = selectedFiles[activeTask];
    const fileName = filesToUpload[0].name.replace(/\s+/g, '_').toLowerCase(); // Assuming only one file for now

    // Use mapping for folder and columns
    const folder = taskToStorageMap[activeTask];
    if (!folder) {
      setUploadError('Invalid task for upload.');
      setIsUploading(false);
      return;
    }
    const bucket = 'event';
    // Build event folder as in SocialMediaManager
    const eventFolder = `${eventInfo.event_name.replace(/\s+/g, '_')}_${eventId}`;

    // Get task definition from context (using tasks from top-level hook)
    const taskDef = tasks.find(task => task.task_name === activeTask);

    if (!taskDef) {
      setUploadError('Failed to fetch task definition for this task.');
      setIsUploading(false);
      return;
    }
    const review_role = taskDef.review_role || [];
    const firstReviewer = review_role[0] || null;
    const realTaskId = taskDef.task_id;

    // Check if this is a reupload
    const isReupload = false; // For now, we'll handle reupload logic separately

    try {
      const fileLinkArr = [];
      let finalFileName = null;
      let finalFilePath = null;
      
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const ext = file.name.split('.').pop();
        const base = `${eventId}_${realTaskId}`;
        let currentFileName = `${base}_${i + 1}.${ext}`;
        let currentFilePath = `${folder}/${eventFolder}/${currentFileName}`;
        
        // Add "reuploaded" prefix for reuploads
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
        
        // Upload file
        const { error: uploadError } = await supabase.storage.from(bucket).upload(currentFilePath, file);
        if (uploadError) throw new Error(`File upload failed for ${file.name}: ${uploadError.message}`);
        
        // Store as array of file objects for consistency
        const publicUrl = `https://pfitttbkoyglznojhozc.supabase.co/storage/v1/object/public/${bucket}/${folder}/${eventFolder}/${currentFileName}`;
        fileLinkArr.push({ name: currentFileName, url: publicUrl });
        
        // Keep track of the last file for UI state
        finalFileName = currentFileName;
        finalFilePath = currentFilePath;
      }

      // Check if a row exists for this event_id and task_name
      const { data: existingRows, error: selectError } = await supabase
        .from('event_coord_main')
        .select('id, review_status')
        .eq('event_id', eventId)
        .eq('task_name', activeTask);

      if (selectError) {
        setUploadError(selectError.message || 'Failed to check for existing row.');
        setIsUploading(false);
        return;
      }

      // Clear review_status on reupload (fresh start)
      const isReuploadCase = existingRows && existingRows.length > 0;

      if (existingRows && existingRows.length > 0) {
        // Row exists, update it and CLEAR old review history
        const { error: updateError } = await supabase
          .from('event_coord_main')
          .update({
            event_name: eventInfo.event_name,
            file_link: fileLinkArr, // Use fileLinkArr
            status: 'pending',
            uploaded_at: new Date().toISOString(),
            current_reviewer: firstReviewer,
            review_status: [], // Clear review history on reupload
            task_id: realTaskId,
          })
          .eq('id', existingRows[0].id);

        if (updateError) {
          setUploadError(updateError.message || 'Failed to update event_coord_main row.');
          setIsUploading(false);
          return;
        }
      } else {
        // Row does not exist, insert new
        const { error: insertError } = await supabase
          .from('event_coord_main')
          .insert({
            event_id: eventId,
            event_name: eventInfo.event_name,
            task_name: activeTask,
            file_link: fileLinkArr, // Use fileLinkArr
            status: 'pending',
            uploaded_at: new Date().toISOString(),
            current_reviewer: firstReviewer,
            review_status: [],
            task_id: realTaskId,
          });

        if (insertError) {
          setUploadError(insertError.message || 'Failed to insert into event_coord_main table.');
          setIsUploading(false);
          return;
        }
      }

      setTaskStatus((prev) => ({
        ...prev,
        [activeTask]: {
          ...prev[activeTask],
          uploaded: true,
          filePath: finalFilePath,
          downloadUrl: `https://pfitttbkoyglznojhozc.supabase.co/storage/v1/object/public/event/${folder}/${eventFolder}/${finalFileName}`,
          file_link: fileLinkArr, // Store the array of file objects
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

  // Handle task approval
  const handleApprove = (taskTitle, approvalType) => {
    const updates = {};
    if (approvalType === 'first') updates.firstApproved = true;
    else if (approvalType === 'second') updates.secondApproved = true;

    setTaskStatus((prev) => ({
      ...prev,
      [taskTitle]: { ...prev[taskTitle], ...updates },
    }));
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
      if (!status?.file_link) throw new Error('No files found for this task.');

      // Handle array of file objects (new structure)
      if (Array.isArray(status.file_link)) {
        for (const fileObj of status.file_link) {
          const response = await fetch(fileObj.url);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileObj.name || `${taskTitle}-file`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }
      } else {
        // Handle old structure (single file)
      const response = await fetch(status.downloadUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${taskTitle}-${status.filePath?.split('/').pop() || 'file'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      }
    } catch (err) {
      alert(`Download failed: ${err.message}`);
    }
  };

  // Handle viewing a file
  const handleViewFile = (url) => {
    if (!url) {
      alert('No file URL found.');
      return;
    }
    window.open(url, '_blank');
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
            const bucketIdx = urlParts.findIndex(p => p === 'event_coord');
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
          const bucketIdx = urlParts.findIndex(p => p === 'event_coord');
          if (bucketIdx !== -1) {
            filePath = urlParts.slice(bucketIdx + 1).join('/');
          }
        }
        filesToRemove = [filePath];
      }
      
      if (filesToRemove.length === 0) {
        console.warn('No files to remove from storage');
      } else {
        // 1. Remove files from Supabase storage (bucket 'event_coord')
        const { error: storageError } = await supabase.storage.from('event_coord').remove(filesToRemove);
        if (storageError) {
          console.error('Storage removal error:', storageError);
          throw new Error('Failed to remove files from storage.');
        }
        console.log('Files removed from storage successfully');
      }

      // 2. Remove row from event_coord_main for this event/task
      const { error: dbError } = await supabase
        .from('event_coord_main')
        .delete()
        .eq('event_id', eventId)
        .eq('task_name', taskTitle);
      if (dbError) throw new Error('Failed to remove row from event_coord_main.');

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

  const handleReuploadClick = async (task, comment = '') => {
    try {
      // Check if task is actually rejected
      const { data: existingRow, error: existingError } = await supabase
        .from('event_coord_main')
        .select('*')
        .eq('event_id', eventId)
        .eq('task_name', task.task_name)
        .eq('status', 'rejected')
        .single();
      
      if (existingError && existingError.code !== 'PGRST116') {
        console.error('Error checking existing rejected row:', existingError);
        alert('Failed to check existing task status');
        return;
      }
      
      if (!existingRow) {
        alert('No rejected row found to reupload.');
        return;
      }

      // Insert reupload comment if provided
      if (comment && comment.trim() && task.task_id && /^[0-9a-fA-F-]{36}$/.test(task.task_id)) {
        const { error: commentError } = await supabase
          .from('comments')
          .insert({
            comment_text: comment,
            task_name: task.task_name,
            event_name: eventInfo?.event_name,
            commenter_role: 'Event Coordinator',
            sender_table: 'event_coord_main',
            task_uuid: task.task_id,
            event_id: eventId,
            comment_type: {
              type: 'reupload',
              role: 'Event Coordinator'
            },
            created_at: new Date().toISOString()
          });
        if (commentError) {
          console.error('Error inserting reupload comment:', commentError);
        }
      }

      // Handle table-based tasks
      if (task.task_name === 'Decoration Team Details') {
        const tempRowId = `temp_${Date.now()}`;
        navigate(`/promotion-team/${tempRowId}/table`, { 
          state: { 
            isReupload: true,
            existingRowId: existingRow.id,
            taskId: 't_dt',
            taskName: task.task_name,
            eventName: eventInfo?.event_name,
            eventId
          } 
        });
        return;
      }

      // Default: file upload
      setActiveTask(task.task_name);
    } catch (error) {
      console.error('Reupload error:', error);
      alert('Failed to reupload task: ' + error.message);
    }
  };

  // Compute myTasks to include rejected and not uploaded tasks
  const myTasks = tasks.filter((task) => {
    const status = taskStatus[task.task_name] || {};
    return (
      task.roles?.includes('Event Coordinator') &&
      (!status.uploaded || status.status === 'rejected')
    );
  });

  // Fetch pending reviews with table information
  const [pendingReviews, setPendingReviews] = useState([]);
  
  useEffect(() => {
    const fetchPendingReviews = async () => {
      if (!eventId || !user?.role) return;
      
      // Fetch pending reviews from all relevant tables
      const tables = ['secretary_main', 'treasurer_main', 'social_main', 'vice_chair_main', 'chair_main'];
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

  const uploadedByYou = tasks.filter((task) => {
    const status = taskStatus[task.task_name] || {};
    return (
      task.roles?.includes('Event Coordinator') &&
      status.uploaded &&
      status.status !== 'rejected'
    );
  });

  // Add Approved and Rejected sections in the UI
  const approvedTasks = tasks.filter((task) => taskStatus[task.title]?.finalApproved === true);

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
    </div>
  );

  // If no eventId, render dashboard view (full Chair/Vice Chair dashboard logic)
  useEffect(() => {
    if (!user) return;
    setLoadingDashboard(true);
    const fetchStats = async () => {
      if (normalizedRole === 'event_coordinator') {
        // Fetch all events (same as Chair/Vice Chair logic)
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('id, event_name, event_date');
        const todayStr = new Date().toISOString().slice(0, 10);
        setUpcomingEvents(
          (events || [])
            .filter((e) => e.event_date && e.event_date >= todayStr)
            .sort((a, b) => a.event_date.localeCompare(b.event_date))
            .map((e) => {
              const diffDays = Math.ceil((new Date(e.event_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
              let soonLabel = '';
              if (diffDays === 0) soonLabel = 'Today';
              else if (diffDays === 1) soonLabel = 'Tomorrow';
              else soonLabel = `In ${diffDays} days`;
              return {
                id: e.id,
                event_name: e.event_name,
                start_date: new Date(e.event_date).toLocaleDateString(),
                soonLabel,
              };
            })
        );
        setStats([
          {
            title: 'Assigned Tasks',
            value: events?.length || 0,
            icon: FileText,
            color: 'text-blue-600',
            clickHandler: () => navigate('/events'),
          },
          {
            title: 'Pending Reviews',
            value: events?.filter((t) => t.status === 'pending').length || 0,
            icon: Clock,
            color: 'text-orange-600',
            clickHandler: () => navigate('/events'),
          },
          {
            title: 'Completed',
            value: events?.filter((t) => t.status === 'approved').length || 0,
            icon: CheckCircle,
            color: 'text-green-600',
            clickHandler: () => navigate('/events'),
          },
          {
            title: 'This Month',
            value: events?.filter((t) => {
              const d = new Date(t.uploaded_at);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length || 0,
            icon: Calendar,
            color: 'text-purple-600',
            clickHandler: () => navigate('/events'),
          },
        ]);
        // Recent activities: last 5 uploads
        setRecentActivities(
          (events || [])
            .filter((t) => t.uploaded_at) // Only include items with an upload timestamp
            .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
            .slice(0, 5)
            .map((t) => ({
              id: t.id,
              action: t.event_name,
              time: new Date(t.uploaded_at).toLocaleString(),
              type: t.status === 'approved' ? 'success' : 'info',
              start_date: t.start_date,
            }))
        );
      }
      setLoadingDashboard(false);
    };
    if (!params.eventId && !eventId) fetchStats();
  }, [user, navigate, params.eventId, eventId, normalizedRole]);

  // Function to navigate to event tasks
  const navigateToEventTasks = (eventId, section = 'mytasks') => {
    navigate(`/events/${eventId}/event-coordinator`);
  };

  if (!params.eventId && !eventId) {
    return (
      <div className="px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-4 sm:p-6 text-white">
          <h1 className="text-xl sm:text-2xl font-bold">Welcome back, {user?.disp_name}!</h1>
          <p className="text-blue-100 mt-2 text-sm sm:text-base">
            Here's what's happening with your club activities today.
          </p>
        </div>
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={stat.clickHandler}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-full bg-gray-100 ${stat.color}`}>
                    <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {/* All Events List */}
        <AllEventsList 
          roleType="event_coord"
          roleTable="event_coord_main"
          userRole="Event Coordinator"
          onNavigateToEventTasks={navigateToEventTasks}
        />
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
                <div key={event.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm sm:text-base">{event.event_name}</span>
                    <span className="text-xs text-gray-500">Starts: {event.start_date}</span>
                  </div>
                  <Badge variant={event.soonLabel === 'Today' ? 'destructive' : 'outline'} className="text-xs">{event.soonLabel}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Button 
                variant="outline" 
                className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm"
                onClick={() => navigate('/events')}
              >
                <FileText className="h-4 w-4 sm:h-6 sm:w-6" />
                <span className="hidden sm:inline">View Events</span>
                <span className="sm:hidden">Events</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm"
                onClick={() => navigate('/events')}
              >
                <Users className="h-4 w-4 sm:h-6 sm:w-6" />
                <span className="hidden sm:inline">Event Tasks</span>
                <span className="sm:hidden">Tasks</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-16 sm:h-20 flex flex-col gap-1 sm:gap-2 text-xs sm:text-sm"
                onClick={() => navigate('/events')}
              >
                <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6" />
                <span className="hidden sm:inline">Event Overview</span>
                <span className="sm:hidden">Overview</span>
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
            roleName="Event Coordinator"
            roleColor="green"
            showStats={true}
            stats={{
              myTasks: myTasks.length,
              uploaded: uploadedByYou.length,
              pendingReviews: pendingReviews.length
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
                  variant={viewMode === 'my' ? 'default' : 'outline'} 
                  onClick={() => setViewMode('my')}
                  className={`h-12 ${viewMode === 'my' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  My Tasks
                </Button>
                <Button 
                  variant={viewMode === 'uploaded' ? 'default' : 'outline'} 
                  onClick={() => setViewMode('uploaded')}
                  className={`h-12 ${viewMode === 'uploaded' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Uploaded
                </Button>
                <Button 
                  variant={viewMode === 'reviews' ? 'default' : 'outline'} 
                  onClick={() => setViewMode('reviews')}
                  className={`h-12 ${viewMode === 'reviews' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Reviews
                </Button>
              </div>
            </div>
          </div>

          {viewMode === 'my' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">My Tasks</h2>
              {!eventId ? (
                <p className="text-gray-600 dark:text-gray-400">Loading event information...</p>
              ) : myTasks.length > 0 ? (
                myTasks.map((task, index) => {
                  const status = taskStatus[task.task_name] || {};
                  const isRejected = status.status === 'rejected';
                  if (isRejected) {
                    console.log('Rendering rejected task:', task.task_name, 'eventId:', eventId);
                    return (
                      <TaskRow
                        key={index}
                        task={{ ...task, event_id: eventId, event_name: eventInfo?.event_name }}
                        status={{ ...status, event_name: eventInfo?.event_name, event_id: eventId }}
                        onUploadClick={() => handleReuploadClick(task, '')}
                        isReview={false}
                        locked={false}
                      />
                    );
                  } else if (status?.uploaded) {
                    console.log('Rendering uploaded task:', task.task_name, 'eventId:', eventId);
                    console.log('Task object being passed:', { ...task, event_id: eventId, event_name: eventInfo?.event_name });
                    console.log('Status object being passed:', { ...status, event_name: eventInfo?.event_name, event_id: eventId });
                    return (
                      <UploadedTaskRow
                        key={index}
                        task={{ ...task, event_id: eventId, event_name: eventInfo?.event_name }}
                        status={{ ...status, event_name: eventInfo?.event_name, event_id: eventId }}
                        onDownloadClick={handleDownload}
                        onRemoveClick={handleRemove}
                        onUploadClick={handleUploadClick} // Pass for reupload
                        folder={taskToStorageMap[task.task_name]}
                      />
                    );
                  } else {
                    return (
                      <TaskRow
                        key={index}
                        task={task}
                        status={status}
                        onUploadClick={handleUploadClick}
                        onApproveClick={handleApprove}
                        isReview={false}
                        locked={eventInfo?.locked}
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

          {viewMode === 'uploaded' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Uploaded by Me</h2>
              {!eventId ? (
                <p className="text-gray-600 dark:text-gray-400">Loading event information...</p>
              ) : uploadedByYou.length > 0 ? (
                uploadedByYou.map((task, index) => {
                  const status = taskStatus[task.task_name] || {};
                  console.log('Rendering uploaded by me task:', task.task_name, 'eventId:', eventId);
                  console.log('Uploaded by me task object:', { ...task, event_id: eventId, event_name: eventInfo?.event_name });
                  console.log('Uploaded by me status object:', { ...status, event_name: eventInfo?.event_name, event_id: eventId });
                  return (
                    <UploadedTaskRow
                      key={index}
                      task={{ ...task, event_id: eventId, event_name: eventInfo?.event_name }}
                      status={{ ...status, event_name: eventInfo?.event_name, event_id: eventId }}
                      onDownloadClick={handleDownload}
                      onRemoveClick={handleRemove}
                      tableData={task.table_data || (status && status.table_data)}
                      folder={taskToStorageMap[task.task_name]}
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

          {viewMode === 'reviews' && (
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
                        {tasks.map((task, index) => {
                          const status = taskStatus[task.task_name] || {};
                          return (
                            <UploadedTaskRow
                              key={`${role}-${task.task_id || task.task_name}`}
                              task={{ ...task, ...status, event_name: eventInfo?.event_name, event_id: eventId }}
                              status={{ ...status, event_name: eventInfo?.event_name, event_id: eventId }}
                              onDownloadClick={handleDownload}
                              onApproveClick={() => handleApprove(task.task_name, 'approve')}
                              onRejectClick={() => handleApprove(task.task_name, 'reject')}
                              isReview={true}
                              folder={taskToStorageMap[task.task_name]}
                              locked={eventInfo?.locked}
                            />
                          );
                        })}
                      </div>
                    ));
                  })()
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No pending reviews.</p>
              )}
            </div>
          )}

          {viewMode === 'approved' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-green-700 dark:text-green-400">Approved Tasks</h2>
              {approvedTasks.length > 0 ? (
                approvedTasks.map((task, index) => (
                  <TaskRow
                    key={index}
                    task={task}
                    status={taskStatus[task.title]}
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


          <Dialog open={!!activeTask} onOpenChange={() => setActiveTask(null)}>
            <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold mb-2">Upload Files for Task: {activeTask}</DialogTitle>
              </DialogHeader>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors mb-6"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <p className="text-gray-700">Drag and drop files here, or click to select</p>
                <input
                  ref={fileInputRef}
                  key={activeTask || 'default'}
                  type="file"
                  multiple
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileSelect}
                />
              </div>
              {/* Show selected files */}
              {activeTask && selectedFiles[activeTask] && selectedFiles[activeTask].length > 0 && (
                <div className="space-y-3 mb-6">
                  <h4 className="font-medium">Selected Files:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-3 pr-2">
                    {selectedFiles[activeTask].map((file, index) => (
                      <div key={index} className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-2 gap-3">
                        <span className="truncate max-w-xs text-gray-900 min-w-0 flex-1" title={file.name}>{file.name}</span>
                        <button
                          type="button"
                          aria-label="Remove file"
                          onClick={() => handleRemoveFile(activeTask, index)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 transition-colors ml-auto"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {uploadError && <p className="text-red-500 text-sm my-2">{uploadError}</p>}
              <DialogFooter className="flex gap-3">
                <Button variant="outline" onClick={() => setActiveTask(null)} disabled={isUploading}>
                  Back
                </Button>
                <Button onClick={handleUpload} disabled={!selectedFiles[activeTask] || selectedFiles[activeTask].length === 0 || isUploading} className="w-full mt-2">
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
                    `Upload ${selectedFiles[activeTask]?.length || 0} File${selectedFiles[activeTask]?.length !== 1 ? 's' : ''}`
                  )}
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
const EventCoordinatorWithTasks = (props) => (
  <TasksProvider>
    <EventCoordinator {...props} />
  </TasksProvider>
);

export default EventCoordinatorWithTasks;