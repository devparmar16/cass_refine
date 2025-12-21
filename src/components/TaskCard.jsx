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
  return (
    <div className="border rounded p-4 mb-4 shadow">
      <h3 className="font-bold text-lg">{task.task_name}</h3>
      {task.task_desc && (
        <p className="text-gray-700 mb-2 whitespace-pre-wrap">
          {renderWithLinks(task.task_desc)}
        </p>
      )}
      <p className="text-sm text-gray-500 mb-2">
        Status: {task.status}
        {isManualTask && <span className="ml-2 text-purple-600">(Manual Task)</span>}
      </p>
      <p className="text-sm text-gray-500 mb-2">
        Assigned To: {task.assigned_to} | Current Reviewer: {task.current_reviewer_role || '-'}
      </p>

      {/* Upload button - for assignee, NOT for manual tasks */}
      {!isManualTask && isAssignedToMe && ['assigned', 'pending', 'rejected'].includes(task.status) && (
        <button
          className="bg-green-600 text-white px-3 py-1 rounded mr-2"
          onClick={openUploadModal}
        >
          {task.status === 'rejected' ? 'Re-upload' : 'Upload'}
        </button>
      )}

      {/* View Submissions button - NOT for manual tasks */}
      {!isManualTask && (
        <button
          className="bg-gray-600 text-white px-3 py-1 rounded mr-2"
          onClick={() => setShowSubmissionsModal(true)}
        >
          View Submissions
        </button>
      )}

      {/* Download button - show if task has been uploaded/reviewed, NOT for manual tasks */}
      {!isManualTask && ['in_review', 'uploaded', 'rejected'].includes(task.status) && (
        <button
          className="bg-indigo-600 text-white px-3 py-1 rounded mr-2"
          onClick={() => downloadSubmission(task)}
        >
          Download
        </button>
      )}

      {/* Template button - show if templates exist (storage-driven) */}
      {templateExists && (
        <button
          className="bg-purple-600 text-white px-3 py-1 rounded mr-2"
          onClick={() => setShowTemplateModal(true)}
        >
          📄 Template
        </button>
      )}

      {/* ===== MANUAL TASK (upload_type='none') CONTROLS ===== */}
      
      {/* Chair: Send To dropdown menu */}
      {isManualTask && isChair && isAssignedToMe && !['completed'].includes(task.status) && (
        <div className="relative inline-block" ref={sendToMenuRef}>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded mr-2"
            onClick={() => setShowSendToMenu(!showSendToMenu)}
          >
            Send To ▾
          </button>
          {showSendToMenu && (
            <div className="absolute left-0 mt-1 w-56 bg-white border rounded shadow-lg z-10">
              {SEND_TO_ROLES.filter(r => r.value !== 'chair').map(role => (
                <button
                  key={role.value}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
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
          className="bg-green-700 text-white px-3 py-1 rounded mr-2"
          onClick={handleFinalize}
        >
          ✓ Finalize
        </button>
      )}

      {/* Non-Chair: Send Back to Chair button */}
      {isManualTask && !isChair && isAssignedToMe && ['in_progress', 'assigned'].includes(task.status) && (
        <button
          className="bg-yellow-600 text-white px-3 py-1 rounded mr-2"
          onClick={handleSendBackToChair}
          disabled={sendingTo === 'chair'}
        >
          {sendingTo === 'chair' ? 'Sending...' : '← Send Back to Chair'}
        </button>
      )}

      {/* Remove Upload button - ONLY in /uploaded tab, ONLY for assigned_to role, NOT for manual tasks */}
      {!isManualTask && isInUploadedTab && isAssignedToMe && (
        <button
          className="bg-orange-500 text-white px-3 py-1 rounded mr-2 disabled:opacity-50"
          onClick={handleRemoveUpload}
          disabled={removingUpload}
        >
          {removingUpload ? 'Removing...' : 'Remove Upload'}
        </button>
      )}

      {/* Delete Task button - ONLY for Chair, requires confirmation */}
      {isChair && (
        <button
          className="bg-red-700 text-white px-3 py-1 rounded mr-2"
          onClick={() => setShowDeleteConfirm(true)}
        >
          Delete Task
        </button>
      )}

      {/* Accept / Reject buttons - for reviewer, NEVER in /uploaded tab, NOT for manual tasks */}
      {!isManualTask && !isInUploadedTab && isReviewer && task.status === 'in_review' && (
        <div className="flex gap-2 mt-3">
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded"
            onClick={() => handleAcceptReject('accept')}
          >
            Accept
          </button>
          <button
            className="bg-red-600 text-white px-3 py-1 rounded"
            onClick={() => setShowRejectModal(true)}
          >
            Reject
          </button>
        </div>
      )}

      {/* Comment input for reviewer or chair */}
      {canAddComment && (
        <div className="mt-2">
          <input
            type="text"
            placeholder="Add comment..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className="border rounded px-2 py-1 mr-2 w-3/4"
          />
          <button
            onClick={handleAddComment}
            className="bg-gray-700 text-white px-3 py-1 rounded"
            disabled={loadingComment}
          >
            {loadingComment ? 'Adding...' : 'Comment'}
          </button>
        </div>
      )}

      {/* Review Flow - ONLY for rejected tasks, assigned_to, in /mytasks */}
      {shouldShowReviewFlow && (
        <div className="mt-3 border-t pt-2">
          <button
            onClick={() => setShowReviewFlow(!showReviewFlow)}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
          >
            <span>{showReviewFlow ? '▼' : '▶'}</span>
            <span>Review Flow ({flowLogs.length} steps)</span>
          </button>
          
          {showReviewFlow && (
            <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-1">
              {flowLogs.map(log => {
                // Parse: [__FLOW__][ACCEPT] role or [__FLOW__][REJECT] role
                const isAccept = log.comment.includes('[ACCEPT]');
                const role = log.comment.replace('[__FLOW__][ACCEPT] ', '').replace('[__FLOW__][REJECT] ', '');
                return (
                  <div key={log.id} className="text-sm flex items-center gap-2">
                    <span className={isAccept ? 'text-green-600' : 'text-red-600'}>
                      {isAccept ? '✔' : '✖'}
                    </span>
                    <span className="text-gray-700">
                      {isAccept ? 'Accepted' : 'Rejected'} by {role}
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
        <div className="mt-3 border-t pt-2">
          <h4 className="font-semibold text-sm mb-2">
            Comments ({userComments.length}):
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
                    className="text-blue-600 text-xs mb-2 hover:underline"
                  >
                    {showAllComments 
                      ? 'Hide comments' 
                      : `View all comments (${userComments.length})`}
                  </button>
                )}

                {/* Comment list */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {displayComments.map(c => (
                    <div key={c.id} className="bg-gray-50 rounded p-2 text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-800">
                          [{c.author_role}]
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                          {/* Delete button - only visible to comment author, not for flow logs */}
                          {c.author_role === userRole && !c.comment.startsWith('[__FLOW__]') && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                              title="Delete comment"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700">{c.comment}</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="font-bold text-lg mb-4">Reject Task</h3>
            <p className="text-sm text-gray-600 mb-2">Please provide a reason:</p>
            <textarea
              value={rejectComment}
              onChange={e => setRejectComment(e.target.value)}
              className="w-full border rounded p-2 mb-4"
              rows={3}
              placeholder="Rejection reason..."
            />
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => { setShowRejectModal(false); setRejectComment(''); }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded"
                onClick={() => {
                  if (rejectComment.trim()) {
                    handleAcceptReject('reject', rejectComment);
                  } else {
                    alert('Please provide a reason');
                  }
                }}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal - Chair Only */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="font-bold text-lg mb-4 text-red-700">⚠️ Delete Task</h3>
            <p className="text-sm text-gray-600 mb-2">
              This will <strong>permanently delete</strong> this task and ALL associated:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-4">
              <li>Files in storage</li>
              <li>Submissions</li>
              <li>Comments</li>
              <li>The task itself</li>
            </ul>
            <p className="text-sm font-bold text-red-600 mb-4">
              This action cannot be undone!
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingTask}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-700 text-white rounded disabled:opacity-50"
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
