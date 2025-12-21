import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// Use the correct supabase client depending on environment
let supabase;
if (typeof window === 'undefined') {
  // Node.js environment
  ({ supabase } = await import('./supabase.node.js'));
} else {
  // Browser/Vite environment
  ({ supabase } = await import('./supabase.js'));
}


export function cn(...inputs) {
  return twMerge(clsx(...inputs));
}

/**
 * Fetches review info for a task from the tasks table.
 * @param {string} taskIdOrName - The task_id or task_name to look up.
 * @returns {Promise<{ task_name: string, task_id: string, roles: any, review_role: string[]|null }>} Review info for the task.
 */
export async function fetchTaskReviewInfo(taskIdOrName) {
  // Try to fetch by task_id first, then by task_name if not found
  let { data, error } = await supabase
    .from('tasks')
    .select('task_name, task_id, roles, review_role')
    .or(`task_id.eq.${taskIdOrName},task_name.eq.${taskIdOrName}`)
    .limit(1)
    .single();
  if (error || !data) {
    // Not found or error
    return { task_name: null, task_id: null, roles: null, review_role: null };
  }
  // Ensure review_role is an array
  const review_role = Array.isArray(data.review_role)
    ? data.review_role
    : (typeof data.review_role === 'string' && data.review_role.length > 0
        ? JSON.parse(data.review_role)
        : []);
  return {
    task_name: data.task_name,
    task_id: data.task_id,
    roles: data.roles,
    review_role,
  };
}

/**
 * Filters tasks for a given role's pending review section.
 * @param {Array} tasks - List of task objects (e.g., from secretary_main).
 * @param {string} role - The role to filter for (e.g., 'Vice Chairperson', 'Secretary', 'Chair Person').
 * @param {Object} [options] - Options for which review step to check.
 *   options = {
 *     reviewStep: 'first' | 'second' | 'final',
 *     reviewOneField: 'review_one',
 *     reviewTwoField: 'review_two',
 *     finalReviewField: 'final_review',
 *   }
 * @returns {Promise<Array>} Filtered tasks for the role's pending review section.
 */
export async function filterPendingReviewTasksForRole(tasks, role, options = {}) {
  const {
    reviewStep = 'first',
    reviewOneField = 'review_one',
    reviewTwoField = 'review_two',
    finalReviewField = 'final_review',
  } = options;
  const filtered = [];
  for (const task of tasks) {
    const { review_role } = await fetchTaskReviewInfo(task.task_id || task.task_name);
    // Determine review order from array
    const firstReviewer = review_role?.[0] || null;
    const secondReviewer = review_role?.[1] || null;
    const finalReviewer = review_role?.[review_role.length - 1] || null;
    if (reviewStep === 'first') {
      if (firstReviewer === role && (task[reviewOneField] === false || task[reviewOneField] === null || typeof task[reviewOneField] === 'undefined')) {
        filtered.push(task);
      }
    } else if (reviewStep === 'second') {
      if (
        secondReviewer === role &&
        task[reviewOneField] === true &&
        (task[reviewTwoField] === false || task[reviewTwoField] === null || typeof task[reviewTwoField] === 'undefined')
      ) {
        filtered.push(task);
      }
    } else if (reviewStep === 'final') {
      // For Chair Person, only check final_review boolean
      const reviewOneDone = !firstReviewer || task[reviewOneField] === true;
      const reviewTwoDone = !secondReviewer || task[reviewTwoField] === true;
      if (role === finalReviewer && reviewOneDone && reviewTwoDone && (task[finalReviewField] === false || task[finalReviewField] === null || typeof task[finalReviewField] === 'undefined')) {
        filtered.push(task);
      }
    }
  }
  return filtered;
}

/**
 * Given a task review info object, returns the review route as an array of steps and roles.
 * @param {object} reviewInfo - The object returned by fetchTaskReviewInfo.
 * @returns {Array<{ step: string, role: string }>} The review route.
 */
export function getTaskReviewRoute(reviewInfo) {
  const route = [];
  if (Array.isArray(reviewInfo.review_role)) {
    reviewInfo.review_role.forEach((role, idx, arr) => {
      if (idx === arr.length - 1) {
        route.push({ step: 'final_review', role });
      } else if (idx === 0) {
        route.push({ step: 'review_one', role });
      } else if (idx === 1) {
        route.push({ step: 'review_two', role });
      } else {
        route.push({ step: `review_${idx + 1}`, role });
      }
    });
  }
  return route;
}

/**
 * Maps table names to role names for determining the actual sender of a task
 * @param {string} tableName - The table name from the database
 * @returns {string} The role name that corresponds to the table
 */
export function getSenderRoleFromTable(tableName) {
  const tableToRoleMap = {
    'social_main': 'Social Media Manager',
    'secretary_main': 'Secretary',
    'treasurer_main': 'Treasurer',
    'event_coord_main': 'Event Coordinator',
    'tech_coord_main': 'Technical Coordinator',
    'technical_main': 'Technical Coordinator',
    'vice_chair_main': 'Vice Chairperson',
    'chair_main': 'Chair Person',
    'event_coordinator_main': 'Event Coordinator',
    'technical_coordinator_main': 'Technical Coordinator'
  };
  
  return tableToRoleMap[tableName] || 'Unknown Role';
}
