import { supabase } from './supabase.js';

// Helper function to determine the task owner role and name
async function getTaskOwnerInfo(task_uuid, task_id, event_id, task_name = null) {
  console.log('[DEBUG][getTaskOwnerInfo] called with:', { task_uuid, task_id, event_id, task_name });
  try {
    // Strategy 1: Try to get task info from the tasks table by task_id or task_name
    let taskInfo = null;
    let taskError = null;
    
    if (task_id && task_id !== 'undefined') {
      const { data, error } = await supabase
        .from('tasks')
        .select('roles, task_name')
        .eq('task_id', task_id)
        .limit(1)
        .single();
      taskInfo = data;
      taskError = error;
    }
    
    // Strategy 2: If no task found by task_id, try by task_name
    if (!taskInfo && task_name) {
      const { data, error } = await supabase
        .from('tasks')
        .select('roles, task_name')
        .eq('task_name', task_name)
        .limit(1)
        .single();
      taskInfo = data;
      taskError = error;
    }
    
    if (!taskError && taskInfo && taskInfo.roles) {
      // Parse roles to get the primary role (task owner)
      let roles = taskInfo.roles;
      if (typeof roles === 'string') {
        try {
          roles = JSON.parse(roles);
        } catch {
          roles = roles.replace(/[{}]/g, '').split(',').map(r => r.trim());
        }
      }
      
      if (Array.isArray(roles) && roles.length > 0) {
        const primaryRole = roles[0]; // First role is typically the task owner
          console.log('[DEBUG][getTaskOwnerInfo] primaryRole:', primaryRole);
        
        // Try to find the user with this role in multiple tables
        const tablesToCheck = ['social_main', 'event_coord_main', 'tech_coord_main', 'secretary_main', 'vice_chair_main', 'chair_main'];
        let userData = null;
        let userError = null;
        
        console.log('[DEBUG][getTaskOwnerInfo] searching for role:', primaryRole, 'in tables:', tablesToCheck);
        
        for (const table of tablesToCheck) {
          try {
            console.log('[DEBUG][getTaskOwnerInfo] querying table:', table, 'for role:', primaryRole);
            const { data, error } = await supabase
              .from(table)
              .select('disp_name, email, user_name, name')
          .eq('role', primaryRole)
          .limit(1)
          .single();
        
            console.log('[DEBUG][getTaskOwnerInfo] table:', table, 'result:', data, 'error:', error);
            
            if (!error && data) {
              userData = data;
              break;
            }
          } catch (err) {
            console.log('[DEBUG][getTaskOwnerInfo] error querying table:', table, 'error:', err);
          }
        }
        
        if (userData) {
          const result = {
            receiver_role: primaryRole,
            receiver_name: userData.disp_name || userData.email || userData.user_name || userData.name || primaryRole
          };
          console.log('[DEBUG][getTaskOwnerInfo] found user data:', result);
          return result;
        }
        
        // Fallback: return the role name if no user found
        const fallbackResult = {
          receiver_role: primaryRole,
          receiver_name: primaryRole
        };
        console.log('[DEBUG][getTaskOwnerInfo] no user found, using fallback:', fallbackResult);
        return fallbackResult;
      }
    }
    
    // Strategy 3: Try to determine from event_id and task_name combination
    if (event_id && task_name) {
      // Check if this is a role-specific task by looking at the task definition
      const { data: taskDef, error: taskDefError } = await supabase
        .from('tasks')
        .select('roles')
        .eq('task_name', task_name)
        .limit(1)
        .single();
      
      if (!taskDefError && taskDef && taskDef.roles) {
        let roles = taskDef.roles;
        if (typeof roles === 'string') {
          try {
            roles = JSON.parse(roles);
          } catch {
            roles = roles.replace(/[{}]/g, '').split(',').map(r => r.trim());
          }
        }
        
        if (Array.isArray(roles) && roles.length > 0) {
          return {
            receiver_role: roles[0],
            receiver_name: roles[0] // Fallback to role name
          };
        }
      }
    }
    
    // Default fallback
    const defaultResult = {
      receiver_role: 'Unknown',
      receiver_name: 'Unknown'
    };
    console.log('[DEBUG][getTaskOwnerInfo] using default fallback:', defaultResult);
    return defaultResult;
  } catch (error) {
    console.error('Error getting task owner info:', error);
    return {
      receiver_role: 'Unknown',
      receiver_name: 'Unknown'
    };
  }
}

export async function insertTaskComment({
  supabase,
  comment_text,
  task_name,
  event_name,
  commenter_role,
  commenter_name,
  sender_table,
  task_uuid,
  event_id,
  comment_type,
  step, // optional, for review step
  receiver_role, // optional, the role of the person whose task it is
  receiver_name // optional, the name of the person whose task it is
}) {
  // Ensure comment_type is an object and add step if provided
  let commentTypeObj = { ...(comment_type || {}) };
  // If step is provided separately, add it to comment_type
  if (step !== undefined && !commentTypeObj.step) {
    commentTypeObj.step = step;
  }

  // If receiver_role and receiver_name are not provided, try to determine them
  if (!receiver_role || !receiver_name) {
    const ownerInfo = await getTaskOwnerInfo(task_uuid, null, event_id, task_name);
    receiver_role = receiver_role || ownerInfo.receiver_role;
    receiver_name = receiver_name || ownerInfo.receiver_name;
  }
  
  // Ensure sender_table is not null - use a fallback if needed
  if (!sender_table) {
    console.log('[DEBUG][insertTaskComment] sender_table is null, using fallback');
    sender_table = 'secretary_main'; // Default fallback
  }

  console.log('[DEBUG][insertTaskComment] Inserting comment with data:', {
    comment_text,
    task_name,
    event_name,
    commenter_role,
    commenter_name,
    sender_table,
    task_uuid,
    event_id,
    comment_type: commentTypeObj,
    created_at: new Date().toISOString(),
    receiver_role,
    receiver_name
  });

  const { error, data } = await supabase.from('comments').insert({
    comment_text,
    task_name,
    event_name,
    commenter_role,
    commenter_name,
    sender_table,
    task_uuid,
    event_id,
    comment_type: commentTypeObj,
    created_at: new Date().toISOString(),
    receiver_role,
    receiver_name
  });

  if (error) {
    console.error('Error inserting comment:', error);
    throw error;
  }

  console.log('[DEBUG][insertTaskComment] Comment inserted successfully:', data);

  return data;
} 