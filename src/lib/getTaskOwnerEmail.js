import { supabase } from './supabase.js';

/**
 * Get the email of the task owner (original sender) based on their role
 * @param {string} taskRoles - The roles assigned to the task (can be string or array)
 * @returns {Promise<{email: string, name: string, role: string} | null>}
 */
export async function getTaskOwnerEmail(taskRoles) {
  console.log('[DEBUG][getTaskOwnerEmail] called with taskRoles:', taskRoles);
  
  try {
    // Parse roles to get the primary role (task owner)
    let roles = taskRoles;
    if (typeof roles === 'string') {
      try {
        roles = JSON.parse(roles);
      } catch {
        roles = roles.replace(/[{}]/g, '').split(',').map(r => r.trim());
      }
    }
    
    if (!Array.isArray(roles) || roles.length === 0) {
      console.log('[DEBUG][getTaskOwnerEmail] No valid roles found');
      return null;
    }
    
    const primaryRole = roles[0]; // First role is typically the task owner
    console.log('[DEBUG][getTaskOwnerEmail] primaryRole:', primaryRole);
    
    // Role mapping to handle variations between task roles and login table roles
    const roleMapping = {
      'Social Media Promotions Manager': 'Social Media Promotion Manager',
      'Technical Coordinator': 'Tech Coordinator',
      'Tech Coordinator': 'Tech Coordinator',
      'Vice Chairperson': 'Vice Chairperson',
      'Vice Chair': 'Vice Chairperson',
      'Chair Person': 'Chair Person',
      'Treasurer': 'Treasurer',
      'Secretary': 'Secretary',
      'Event Coordinator': 'Event Coordinator'
    };
    
    // Map the role to the correct login table role
    const mappedRole = roleMapping[primaryRole] || primaryRole;
    console.log('[DEBUG][getTaskOwnerEmail] mapped role:', mappedRole);
    
    // Get the user's email from the login table based on their role
    const { data: userData, error } = await supabase
      .from('login')
      .select('email, disp_name, username, role')
      .eq('role', mappedRole)
      .limit(1)
      .single();
    
    console.log('[DEBUG][getTaskOwnerEmail] login table query result:', { userData, error });
    
    if (error || !userData) {
      console.log('[DEBUG][getTaskOwnerEmail] No user found in login table for role:', mappedRole);
      return null;
    }
    
    const result = {
      email: userData.email,
      name: userData.disp_name || userData.username || primaryRole,
      role: userData.role
    };
    
    console.log('[DEBUG][getTaskOwnerEmail] found user data:', result);
    return result;
    
  } catch (error) {
    console.error('[DEBUG][getTaskOwnerEmail] Error:', error);
    return null;
  }
}

/**
 * Send task review notification email via backend API
 * @param {Object} params
 * @param {string} params.recipientEmail - Email of the task owner
 * @param {string} params.recipientRole - Role of the task owner
 * @param {string} params.taskName - Name of the task
 * @param {string} params.eventName - Name of the event
 * @param {string} params.action - 'approved' or 'rejected'
 * @param {string} params.reviewerRole - Role of the reviewer (e.g., 'Chair Person')
 * @param {string} params.reviewerName - Name of the reviewer
 * @param {string} params.reviewComment - Optional review comment
 * @param {Array} params.reviewStatus - Array of previous review statuses
 * @returns {Promise<Object>}
 */
export async function sendTaskReviewEmail(params) {
  try {
    const response = await fetch('/api/send-task-review-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email');
    }
    
    console.log('[DEBUG][sendTaskReviewEmail] Email sent successfully:', result);
    return result;
    
  } catch (error) {
    console.error('[DEBUG][sendTaskReviewEmail] Error sending email:', error);
    throw error;
  }
} 