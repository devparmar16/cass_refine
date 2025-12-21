/**
 * Frontend role normalization utility
 * Matches the backend normalization logic in backend/utils/roleNormalizer.js
 * 
 * Converts human-readable role labels to normalized values for database logic
 * Example: "Vice Chair Person" → "vice_chair_person"
 */

/**
 * Normalize a role string for database storage and logic
 * Rules:
 * 1. Convert to lowercase
 * 2. Trim whitespace
 * 3. Replace spaces with underscores
 * 4. Remove all special characters except underscores
 * 
 * @param {string} role - The role string to normalize
 * @returns {string} Normalized role string
 */
export function normalizeRole(role) {
  if (!role || typeof role !== 'string') {
    return '';
  }

  return role
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, '');    // Remove special characters
}

/**
 * Check if a role string is already normalized
 * @param {string} role - The role string to check
 * @returns {boolean}
 */
export function isNormalized(role) {
  if (!role || typeof role !== 'string') {
    return false;
  }
  // Normalized roles contain only lowercase letters, numbers, and underscores
  return /^[a-z0-9_]+$/.test(role);
}

/**
 * Validate if a normalized role meets the expected format
 * @param {string} role - The role string to validate
 * @returns {boolean}
 */
export function isValidNormalizedRole(role) {
  if (!role || typeof role !== 'string') {
    return false;
  }
  // Valid normalized roles: lowercase alphanumeric with underscores, not starting/ending with underscore
  return /^[a-z][a-z0-9_]*[a-z0-9]$/.test(role) || /^[a-z]$/.test(role);
}
