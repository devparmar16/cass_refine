/**
 * Email Notification Helper
 * 
 * Frontend utility to trigger backend email notifications
 * after task status updates.
 * 
 * CRITICAL: Always pass assigned_to_label (original role string),
 * NOT assigned_to (normalized value)
 */

// Backend server URL - adjust if using different port
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5001';

/**
 * Send task rejection email notification
 * Call this AFTER the task status has been updated to 'rejected'
 * 
 * @param {Object} params
 * @param {string} params.taskName - Name of the task
 * @param {string} params.eventName - Name of the event
 * @param {string} params.assignedToLabel - ORIGINAL role label (e.g., "Vice Chair Person")
 * @param {string} params.reviewerRole - Role of the reviewer who rejected
 * @param {string} params.rejectionReason - Comment/reason for rejection
 * @param {string} [params.recipientEmail] - Optional direct email
 */
export async function sendTaskRejectedEmail({
  taskName,
  eventName,
  assignedToLabel,
  reviewerRole,
  rejectionReason,
  recipientEmail
}) {
  try {
    const response = await fetch(`${SERVER_URL}/api/email/task-rejected`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskName,
        eventName,
        assignedToLabel,
        reviewerRole,
        rejectionReason,
        recipientEmail
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Failed to send rejection email:', data.error);
      return { success: false, error: data.error };
    }

    console.log('Rejection email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending rejection email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send task accepted/completed email notification
 * Call this AFTER the task status has been updated to 'completed' by final reviewer
 * 
 * @param {Object} params
 * @param {string} params.taskName - Name of the task
 * @param {string} params.eventName - Name of the event
 * @param {string} params.assignedToLabel - ORIGINAL role label (e.g., "Vice Chair Person")
 * @param {string} params.reviewerRole - Role of the final reviewer who accepted
 * @param {string} [params.recipientEmail] - Optional direct email
 */
export async function sendTaskAcceptedEmail({
  taskName,
  eventName,
  assignedToLabel,
  reviewerRole,
  recipientEmail
}) {
  console.log('[sendTaskAcceptedEmail] Called with params:', {
    taskName,
    eventName,
    assignedToLabel,
    reviewerRole,
    recipientEmail
  });

  try {
    const response = await fetch(`${SERVER_URL}/api/email/task-accepted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskName,
        eventName,
        assignedToLabel,
        reviewerRole,
        recipientEmail
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Failed to send acceptance email:', data.error);
      return { success: false, error: data.error };
    }

    console.log('Acceptance email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending acceptance email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract rejection reason from REJECT comment
 * Comments are formatted as: "[REJECT] - reason here"
 * 
 * @param {string} comment - The full comment text
 * @returns {string} The extracted reason or the full comment
 */
export function extractRejectionReason(comment) {
  if (!comment) return 'No reason provided';
  
  // Check for [REJECT] prefix
  const rejectMatch = comment.match(/^\[REJECT\]\s*-?\s*(.*)$/i);
  if (rejectMatch) {
    return rejectMatch[1].trim() || 'No specific reason provided';
  }
  
  // Check for REJECT: prefix
  const rejectColonMatch = comment.match(/^REJECT:\s*(.*)$/i);
  if (rejectColonMatch) {
    return rejectColonMatch[1].trim() || 'No specific reason provided';
  }
  
  return comment;
}
