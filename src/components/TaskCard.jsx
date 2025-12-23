// src/TaskCard.jsx
// TaskCard ONLY: opens modals, handles accept/reject, view submissions
// TaskCard NEVER: uploads files, talks to storage, inserts into task_submissions
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getTaskComments } from '@/lib/taskQueries';
import { removeUpload, hardDeleteTask } from '@/lib/taskActions';
import { downloadSubmission } from '@/lib/downloadSubmission';
import { generateTaskSlug, hasTemplates } from '@/lib/templateStorage';
import { sendTaskRejectedEmail, sendTaskAcceptedEmail, extractRejectionReason } from '@/lib/emailNotify';

import UploadTaskModal from './uploads/UploadTaskModal';
import TableUploadChoiceModal from './tasks/TableUploadChoiceModal';
import CustomTableBuilder from './tasks/CustomTableBuilder';
import FileUploadModal from './tasks/FileUploadModal';
import TaskSubmissionsModal from './tasks/TaskSubmissionsModal';
import TemplateViewModal from './templates/TemplateViewModal';

// Role options for "Send To" menu
const SEND_TO_ROLES = [
  { value: 'chair', label: 'Chair Person' },
  { value: 'vice_chair', label: 'Vice Chairperson' },
  { value: 'secretary', label: 'Secretary' },
  { value: 'treasurer', label: 'Treasurer' },
  { value: 'technical', label: 'Technical Coordinator' },
  { value: 'coordinator', label: 'Event Coordinator' },
  { value: 'social_media', label: 'Social Media Promotion Manager' },
];

// Helper to render URLs in text as clickable links
const renderWithLinks = (text) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const TaskCard = ({ task, userRole, onRefresh, tab }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComment, setLoadingComment] = useState(false);
  const [removingUpload, setRemovingUpload] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [showReviewFlow, setShowReviewFlow] = useState(false);

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTableChoiceModal, setShowTableChoiceModal] = useState(false);
  const [showCustomTableBuilder, setShowCustomTableBuilder] = useState(false);
  const [showTableFileModal, setShowTableFileModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // For upload_type='none': Send To dropdown
  const [showSendToMenu, setShowSendToMenu] = useState(false);
  const [sendingTo, setSendingTo] = useState(null);
  const sendToMenuRef = useRef(null);

  // Template state (storage-driven)
  const [templateExists, setTemplateExists] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const taskSlug = generateTaskSlug(task.task_name, task.assigned_to);

  const isAssignedToMe = task.assigned_to === userRole;
  const isReviewer = task.current_reviewer_role === userRole;
  const isChair = userRole === 'chair';
  const isInUploadedTab = tab === 'uploaded';
  const isInMyTasksTab = tab === 'mytasks';
  const isInReviewsTab = tab === 'reviews';
  const isManualTask = task.upload_type === 'none';

  // Comment visibility: assigned_to sees in /mytasks and /uploaded, reviewers always see, chair always sees
  const canSeeComments = isAssignedToMe || isReviewer || isChair;
  // Comment input: only reviewer during in_review, or chair anytime
  const canAddComment = (isReviewer && task.status === 'in_review') || isChair;

  // Split comments: user comments vs system flow logs
  const userComments = comments.filter(c => !c.comment.startsWith('[__FLOW__]'));
  const flowLogs = comments.filter(c => c.comment.startsWith('[__FLOW__]'));

  // Show review flow only for rejected tasks to assigned_to in /mytasks
  const shouldShowReviewFlow = task.status === 'rejected' && isAssignedToMe && isInMyTasksTab && flowLogs.length > 0;

  /* ---------------- COMMENTS ---------------- */
  const fetchComments = async () => {
    console.log('[TaskCard] Fetching comments for task:', task.id);
    const data = await getTaskComments(task.id);
    console.log('[TaskCard] Comments fetched:', data);
    setComments(data || []);
  };

  useEffect(() => {
    fetchComments();
  }, [task.id]);

  // Check if templates exist for this task (storage-based)
  useEffect(() => {
    const checkTemplates = async () => {
      const exists = await hasTemplates(taskSlug);
      setTemplateExists(exists);
    };
    checkTemplates();
  }, [taskSlug]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setLoadingComment(true);
    
    console.log('[TaskCard] Adding comment:', { task_id: task.id, author_role: userRole, comment: newComment });
    
    const { data, error } = await supabase.from('task_comments').insert({
      task_id: task.id,
      comment: newComment,
      author_role: userRole,
    }).select();
    
    if (error) {
      console.error('[TaskCard] Comment insert error:', error);
      alert('Failed to add comment: ' + error.message);
    } else {
      console.log('[TaskCard] Comment inserted:', data);
    }
    
    setNewComment('');
    setLoadingComment(false);
    fetchComments();
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    console.log('[TaskCard] Deleting comment:', commentId);
    
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId)
      .eq('author_role', userRole); // Only delete if author matches
    
    if (error) {
      console.error('[TaskCard] Comment delete error:', error);
      alert('Failed to delete comment: ' + error.message);
    } else {
      console.log('[TaskCard] Comment deleted');
      fetchComments();
    }
  };

  /* ---------------- MANUAL TASK (upload_type='none') HANDLERS ---------------- */
  
  // Close send-to menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sendToMenuRef.current && !sendToMenuRef.current.contains(event.target)) {
        setShowSendToMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Send To: update assigned_to and status
  const handleSendTo = async (targetRole) => {
    setSendingTo(targetRole);
    try {
      const { error } = await supabase
        .from('tasks_temp')
        .update({
          assigned_to: targetRole,
          status: 'in_progress',
        })
        .eq('id', task.id);

      if (error) throw error;
      
      console.log('[TaskCard] Task sent to:', targetRole);
      setShowSendToMenu(false);
      onRefresh?.();
    } catch (err) {
      console.error('[TaskCard] Send to error:', err);
      alert('Failed to send task: ' + err.message);
    } finally {
      setSendingTo(null);
    }
  };

  // Send Back to Chair
  const handleSendBackToChair = async () => {
    setSendingTo('chair');
    try {
      const { error } = await supabase
        .from('tasks_temp')
        .update({
          assigned_to: 'chair',
          status: 'pending',
        })
        .eq('id', task.id);

      if (error) throw error;
      
      console.log('[TaskCard] Task sent back to chair');
      onRefresh?.();
    } catch (err) {
      console.error('[TaskCard] Send back error:', err);
      alert('Failed to send back: ' + err.message);
    } finally {
      setSendingTo(null);
    }
  };

  // Finalize (Chair only, for manual tasks)
  const handleFinalize = async () => {
    try {
      const { error } = await supabase
        .from('tasks_temp')
        .update({
          status: 'completed',
        })
        .eq('id', task.id);

      if (error) throw error;
      
      console.log('[TaskCard] Task finalized');
      onRefresh?.();
    } catch (err) {
      console.error('[TaskCard] Finalize error:', err);
      alert('Failed to finalize: ' + err.message);
    }
  };

  /* ---------------- UPLOAD MODALS ---------------- */
  const openUploadModal = () => {
    if (task.upload_type === 'table') {
      setShowTableChoiceModal(true);
    } else {
      setShowUploadModal(true);
    }
  };

  const handleTableChoice = (choice) => {
    setShowTableChoiceModal(false);
    if (choice === 'custom') setShowCustomTableBuilder(true);
    else if (choice === 'file') setShowTableFileModal(true);
  };

  // Called after successful upload from any modal
  const onUploadSuccess = async () => {
    // Get first reviewer from flow
    const { data: steps } = await supabase
      .from('review_flow_template_steps')
      .select('*')
      .eq('template_id', task.flow_template_id)
      .order('step_order', { ascending: true });

    const firstReviewer = steps?.[0]?.reviewer_role || null;

    // Update task status to in_review
    await supabase
      .from('tasks_temp')
      .update({
        status: 'in_review',
        current_step: 0,
        current_reviewer_role: firstReviewer,
      })
      .eq('id', task.id);

    // Close modals
    setShowUploadModal(false);
    setShowCustomTableBuilder(false);
    setShowTableFileModal(false);

    onRefresh?.();
  };

  const handleModalCancel = () => {
    setShowCustomTableBuilder(false);
    setShowTableFileModal(false);
  };

  /* ---------------- REMOVE UPLOAD (Soft Reset) ---------------- */
  const handleRemoveUpload = async () => {
    setRemovingUpload(true);
    try {
      const success = await removeUpload({ task, role: userRole });
      if (success) {
        console.log('[TaskCard] Upload removed successfully');
        onRefresh?.();
      } else {
        alert('Failed to remove upload. Check console for details.');
      }
    } catch (err) {
      console.error('[TaskCard] Remove upload error:', err);
      alert('Error removing upload');
    } finally {
      setRemovingUpload(false);
    }
  };

  /* ---------------- DELETE TASK (Hard Delete - Chair Only) ---------------- */
  const handleDeleteTask = async () => {
    setDeletingTask(true);
    try {
      const success = await hardDeleteTask({ task });
      if (success) {
        console.log('[TaskCard] Task deleted successfully');
        setShowDeleteConfirm(false);
        onRefresh?.();
      } else {
        alert('Failed to delete task. Check console for details.');
      }
    } catch (err) {
      console.error('[TaskCard] Delete task error:', err);
      alert('Error deleting task');
    } finally {
      setDeletingTask(false);
    }
  };

  /* ---------------- ACCEPT / REJECT ---------------- */
  const handleAcceptReject = async (action, comment = '') => {
    const { data: steps } = await supabase
      .from('review_flow_template_steps')
      .select('*')
      .eq('template_id', task.flow_template_id)
      .order('step_order', { ascending: true });

    let update = {};
    const nextStep = (task.current_step ?? 0) + 1;
    let isFinalAccept = false;

    if (action === 'accept') {
      if (nextStep >= steps.length) {
        // All reviewers done → uploaded (final accept)
        update = {
          status: 'uploaded',
          current_reviewer_role: null,
          current_step: nextStep,
        };
        isFinalAccept = true;
      } else {
        // Move to next reviewer
        update = {
          status: 'in_review',
          current_step: nextStep,
          current_reviewer_role: steps[nextStep].reviewer_role,
        };
      }
    }

    if (action === 'reject') {
      // Back to assignee
      update = {
        status: 'rejected',
        current_reviewer_role: null,
        current_step: 0,
      };
    }

    await supabase.from('tasks_temp').update(update).eq('id', task.id);

    // Always insert flow log for accept/reject
    await supabase.from('task_comments').insert({
      task_id: task.id,
      comment: `[__FLOW__][${action.toUpperCase()}] ${userRole}`,
      author_role: userRole,
    });

    // If user provided a comment, insert it separately as a real comment
    if (comment) {
      await supabase.from('task_comments').insert({
        task_id: task.id,
        comment: comment,
        author_role: userRole,
      });
    }

    // ========== EMAIL NOTIFICATIONS (after status update) ==========
    // Fetch event name for email
    let eventName = 'Unknown Event';
    if (task.event_id) {
      const { data: eventData } = await supabase
        .from('events')
        .select('event_name')
        .eq('id', task.event_id)
        .single();
      if (eventData?.event_name) {
        eventName = eventData.event_name;
      }
    }

    // Send rejection email when any reviewer rejects
    if (action === 'reject') {
      const rejectionReason = extractRejectionReason(comment);
      sendTaskRejectedEmail({
        taskName: task.task_name,
        eventName,
        assignedToLabel: task.assigned_to_label || task.assigned_to,
        reviewerRole: userRole,
        rejectionReason
      }).catch(err => console.error('Failed to send rejection email:', err));
    }

    // Send acceptance email only when final reviewer accepts
    if (action === 'accept' && isFinalAccept) {
      console.log('[TaskCard] Sending acceptance email for task:', {
        task_name: task.task_name,
        assigned_to: task.assigned_to,
        assigned_to_label: task.assigned_to_label,
        userRole
      });
      
      sendTaskAcceptedEmail({
        taskName: task.task_name,
        eventName,
        assignedToLabel: task.assigned_to_label || task.assigned_to,
        reviewerRole: userRole
      }).catch(err => console.error('Failed to send acceptance email:', err));
    }
    // ========== END EMAIL NOTIFICATIONS ==========

    setShowRejectModal(false);
    setRejectComment('');
    onRefresh?.();
  };

  /* ---------------- UI ---------------- */
  
  // Status badge styling
  const getStatusBadge = () => {
    const statusConfig = {
      'pending': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Pending' },
      'assigned': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Assigned' },
      'in_progress': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', label: 'In Progress' },
      'in_review': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'In Review' },
      'rejected': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Rejected' },
      'uploaded': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Uploaded' },
      'completed': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Completed' },
    };
    const config = statusConfig[task.status] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: task.status };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header Section */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-900 truncate">{task.task_name}</h3>
          {task.task_desc && (
            <p className="text-gray-600 mt-1 text-sm line-clamp-2 whitespace-pre-wrap">
              {renderWithLinks(task.task_desc)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {getStatusBadge()}
          {isManualTask && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
              Manual
            </span>
          )}
        </div>
      </div>

      {/* Meta Information */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Assigned: <span className="font-medium text-gray-700">{task.assigned_to_label || task.assigned_to}</span>
        </span>
        {task.current_reviewer_role && (
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Reviewer: <span className="font-medium text-gray-700">{task.current_reviewer_role}</span>
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">

      {/* Upload button - for assignee, NOT for manual tasks */}
      {!isManualTask && isAssignedToMe && ['assigned', 'pending', 'rejected'].includes(task.status) && (
        <button
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
          onClick={openUploadModal}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {task.status === 'rejected' ? 'Re-upload' : 'Upload'}
        </button>
      )}

      {/* View Submissions button - NOT for manual tasks */}
      {!isManualTask && (
        <button
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-sm"
          onClick={() => setShowSubmissionsModal(true)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Submissions
        </button>
      )}

      {/* Download button - show if task has been uploaded/reviewed, NOT for manual tasks */}
      {!isManualTask && ['in_review', 'uploaded', 'rejected'].includes(task.status) && (
        <button
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
          onClick={() => downloadSubmission(task)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
      )}

      {/* Template button - show if templates exist (storage-driven) */}
      {templateExists && (
        <button
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm"
          onClick={() => setShowTemplateModal(true)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Template
        </button>
      )}

      {/* ===== MANUAL TASK (upload_type='none') CONTROLS ===== */}
      
      {/* Chair: Send To dropdown menu */}
      {isManualTask && isChair && isAssignedToMe && !['completed'].includes(task.status) && (
        <div className="relative inline-block" ref={sendToMenuRef}>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
            onClick={() => setShowSendToMenu(!showSendToMenu)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send To
            <svg className={`w-3 h-3 transition-transform ${showSendToMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showSendToMenu && (
            <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 overflow-hidden">
              {SEND_TO_ROLES.filter(r => r.value !== 'chair').map(role => (
                <button
                  key={role.value}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  onClick={() => handleSendTo(role.value)}
                  disabled={sendingTo === role.value}
                >
                  {sendingTo === role.value ? 'Sending...' : role.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chair: Finalize button (when task is back with chair) */}
      {isManualTask && isChair && isAssignedToMe && ['pending', 'in_progress'].includes(task.status) && (
        <button
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
          onClick={handleFinalize}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Finalize
        </button>
      )}

      {/* Non-Chair: Send Back to Chair button */}
      {isManualTask && !isChair && isAssignedToMe && ['in_progress', 'assigned'].includes(task.status) && (
        <button
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-50"
          onClick={handleSendBackToChair}
          disabled={sendingTo === 'chair'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          {sendingTo === 'chair' ? 'Sending...' : 'Send Back'}
        </button>
      )}

      {/* Remove Upload button - ONLY in /uploaded tab, ONLY for assigned_to role, NOT for manual tasks */}
      {!isManualTask && isInUploadedTab && isAssignedToMe && (
        <button
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm disabled:opacity-50"
          onClick={handleRemoveUpload}
          disabled={removingUpload}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          {removingUpload ? 'Removing...' : 'Remove'}
        </button>
      )}

      {/* Delete Task button - ONLY for Chair, requires confirmation */}
      {isChair && (
        <button
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      )}
      </div>

      {/* Accept / Reject buttons - for reviewer, NEVER in /uploaded tab, NOT for manual tasks */}
      {!isManualTask && !isInUploadedTab && isReviewer && task.status === 'in_review' && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
            onClick={() => handleAcceptReject('accept')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Accept
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm"
            onClick={() => setShowRejectModal(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        </div>
      )}

      {/* Comment input for reviewer or chair */}
      {canAddComment && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleAddComment}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 text-white hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
              disabled={loadingComment}
            >
              {loadingComment ? 'Adding...' : 'Comment'}
            </button>
          </div>
        </div>
      )}

      {/* Review Flow - ONLY for rejected tasks, assigned_to, in /mytasks */}
      {shouldShowReviewFlow && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => setShowReviewFlow(!showReviewFlow)}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2 font-medium"
          >
            <svg className={`w-4 h-4 transition-transform ${showReviewFlow ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Review Flow ({flowLogs.length} steps)
          </button>
          
          {showReviewFlow && (
            <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-2">
              {flowLogs.map(log => {
                // Parse: [__FLOW__][ACCEPT] role or [__FLOW__][REJECT] role
                const isAccept = log.comment.includes('[ACCEPT]');
                const role = log.comment.replace('[__FLOW__][ACCEPT] ', '').replace('[__FLOW__][REJECT] ', '');
                return (
                  <div key={log.id} className="text-sm flex items-center gap-2">
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full ${isAccept ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {isAccept ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </span>
                    <span className="text-gray-700">
                      {isAccept ? 'Accepted' : 'Rejected'} by <span className="font-medium">{role}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Comments - visible to assigned_to, reviewers, and chair (user comments only) */}
      {canSeeComments && userComments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="font-medium text-sm text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Comments ({userComments.length})
          </h4>

          {/* Stacking logic for assigned_to: show 3 by default, expand to show all */}
          {(() => {
            const shouldStack = isAssignedToMe && userComments.length >= 3 && !showAllComments;
            const displayComments = shouldStack 
              ? userComments.slice(-3)  // Show last 3 (most recent)
              : userComments;           // Show all

            return (
              <>
                {/* Show "View all" button if stacked */}
                {isAssignedToMe && userComments.length >= 3 && (
                  <button
                    onClick={() => setShowAllComments(!showAllComments)}
                    className="text-blue-600 text-xs mb-3 hover:underline font-medium"
                  >
                    {showAllComments 
                      ? 'Hide comments' 
                      : `View all comments (${userComments.length})`}
                  </button>
                )}

                {/* Comment list */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {displayComments.map(c => (
                    <div key={c.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-800 text-xs px-2 py-0.5 bg-gray-200 rounded-full">
                          {c.author_role}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                          {/* Delete button - only visible to comment author, not for flow logs */}
                          {c.author_role === userRole && !c.comment.startsWith('[__FLOW__]') && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                              title="Delete comment"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 mt-1">{c.comment}</p>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <h3 className="font-semibold text-lg text-red-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Reject Task
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-3">Please provide a reason for rejection:</p>
              <textarea
                value={rejectComment}
                onChange={e => setRejectComment(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Enter rejection reason..."
              />
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                onClick={() => { setShowRejectModal(false); setRejectComment(''); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                onClick={() => {
                  if (rejectComment.trim()) {
                    handleAcceptReject('reject', rejectComment);
                  } else {
                    alert('Please provide a reason');
                  }
                }}
              >
                Reject Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal - Chair Only */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <h3 className="font-semibold text-lg text-red-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Delete Task
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-3">
                This will <strong className="text-red-600">permanently delete</strong> this task and ALL associated:
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-4">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Files in storage
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submissions
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Comments
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  The task itself
                </li>
              </ul>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  This action cannot be undone!
                </p>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingTask}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                onClick={handleDeleteTask}
                disabled={deletingTask}
              >
                {deletingTask ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------- MODALS (not for manual tasks) -------- */}
      {!isManualTask && showUploadModal && (
        <UploadTaskModal
          task={task}
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={onUploadSuccess}
        />
      )}

      {!isManualTask && showTableChoiceModal && (
        <TableUploadChoiceModal
          onSelect={handleTableChoice}
          onClose={() => setShowTableChoiceModal(false)}
        />
      )}

      {!isManualTask && showCustomTableBuilder && (
        <CustomTableBuilder
          task={task}
          role={userRole}
          onCancel={handleModalCancel}
          onSubmit={onUploadSuccess}
        />
      )}

      {!isManualTask && showTableFileModal && (
        <FileUploadModal
          task={task}
          role={userRole}
          onCancel={handleModalCancel}
          onSubmit={onUploadSuccess}
        />
      )}

      {!isManualTask && (
        <TaskSubmissionsModal
          task={task}
          open={showSubmissionsModal}
          onClose={() => setShowSubmissionsModal(false)}
        />
      )}

      {/* Template View Modal - for all roles */}
      <TemplateViewModal
        taskSlug={taskSlug}
        taskName={task.task_name}
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
      />
    </div>
  );
};

export default TaskCard;
