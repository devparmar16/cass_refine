/**
 * Role Normalization Utility
 * 
 * Provides consistent role normalization across the application.
 * 
 * USAGE RULES:
 * - Use normalizeRole() when storing to tasks_temp.assigned_to
 * - NEVER use normalized values for display
 * - NEVER use normalized values for email queries
 * - Always keep original label in tasks_temp.assigned_to_label
 * 
 * Example:
 *   Input: "Vice Chair Person"
 *   Output: "vice_chair_person"
 */

/**
 * Normalize a role string for storage and logic
 * 
 * Rules:
 * - Convert to lowercase
 * - Trim whitespace
 * - Replace spaces with underscores
 * - Remove special characters (keep only letters, numbers, underscores)
 * 
 * @param {string} role - Original role string from login.role
 * @returns {string} Normalized role for storage/logic
 * 
 * @example
 * normalizeRole("Vice Chair Person") → "vice_chair_person"
 * normalizeRole("  Chair  ") → "chair"
 * normalizeRole("Social Media Manager") → "social_media_manager"
 */
function normalizeRole(role) {
  if (!role || typeof role !== 'string') {
    return '';
  }
  
  return role
    .trim()                           // Remove leading/trailing spaces
    .toLowerCase()                    // Convert to lowercase
    .replace(/\s+/g, '_')             // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, '');      // Remove special characters
}

/**
 * Validate if a normalized role matches expected format
 * 
 * @param {string} normalizedRole - Role to validate
 * @returns {boolean} True if valid normalized format
 */
function isValidNormalizedRole(normalizedRole) {
  if (!normalizedRole || typeof normalizedRole !== 'string') {
    return false;
  }
  
  // Must be lowercase, alphanumeric + underscores only
  return /^[a-z0-9_]+$/.test(normalizedRole);
}

/**
 * Check if a role appears to be normalized (not a display label)
 * 
 * @param {string} role - Role to check
 * @returns {boolean} True if role appears normalized
 */
function isNormalized(role) {
  if (!role) return false;
  
  // If it has uppercase letters or spaces, it's not normalized
  if (/[A-Z\s]/.test(role)) {
    return false;
  }
  
  return isValidNormalizedRole(role);
}

module.exports = {
  normalizeRole,
  isValidNormalizedRole,
  isNormalized
};
