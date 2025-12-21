/**
 * Role Email Resolver Service
 * 
 * Dynamically resolves role → email without hardcoded mappings.
 * Database is the single source of truth.
 * 
 * CRITICAL RULES:
 * - Always pass the ORIGINAL role string from tasks_temp.assigned_to_label
 * - Never pass normalized values like "vice_chair_person"
 * - Query uses exact match against login.role
 * 
 * Usage:
 *   const { getEmailByRole } = require('./roleEmailResolver');
 *   // Pass original role label from DB:
 *   const email = await getEmailByRole('Vice Chair Person', supabaseAdmin);
 */

// In-memory cache: Map<normalizedRole, email>
const roleEmailCache = new Map();

/**
 * Normalize role string for cache keys ONLY
 * This is used internally for caching, NOT for DB queries
 * 
 * @param {string} role - Role name with any casing/spacing
 * @returns {string} Normalized role for cache key (lowercase, trimmed, underscored)
 */
function normalizeRoleForCache(role) {
  if (!role) return '';
  return role.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * Get email address for a given role
 * 
 * @param {string} role - Role name (can contain spaces, mixed case)
 * @param {Object} supabaseAdmin - Supabase service client (bypasses RLS)
 * @returns {Promise<string>} Email address
 * @throws {Error} If role not found in any table
 */
/**
 * Get email address for a given role label
 * 
 * ⚠️ IMPORTANT: Pass the ORIGINAL role string from tasks_temp.assigned_to_label
 * Example: "Vice Chair Person" NOT "vice_chair_person"
 * 
 * @param {string} roleLabel - Original role string from login.role (with spaces, proper casing)
 * @param {Object} supabaseAdmin - Supabase service client (bypasses RLS)
 * @returns {Promise<string>} Email address
 * @throws {Error} If role not found in login table
 */
async function getEmailByRole(roleLabel, supabaseAdmin) {
  if (!roleLabel) {
    throw new Error('Role label parameter is required');
  }

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is required');
  }

  // Normalize for cache key only (NOT for DB query)
  const cacheKey = normalizeRoleForCache(roleLabel);
  
  console.log(`[RoleEmailResolver] Resolving email for role label: "${roleLabel}"`);
  console.log(`[RoleEmailResolver] Cache key: "${cacheKey}"`);

  // Check cache first
  if (roleEmailCache.has(cacheKey)) {
    const cachedEmail = roleEmailCache.get(cacheKey);
    console.log(`[RoleEmailResolver] ✅ Cache hit: "${roleLabel}" → ${cachedEmail}`);
    return cachedEmail;
  }

  console.log(`[RoleEmailResolver] Cache miss, querying login table...`);

  // Query login table using ORIGINAL role label (exact match)
  try {
    const { data, error } = await supabaseAdmin
      .from('login')
      .select('email')
      .eq('role', roleLabel) // Use exact role label as stored in DB
      .single();

    if (error) {
      console.log(`[RoleEmailResolver] ❌ Not found in login table for role: "${roleLabel}"`);
      console.log(`[RoleEmailResolver] Error details:`, error.message);
      
      // Cache null to avoid repeated failed queries
      roleEmailCache.set(cacheKey, null);
      
      throw new Error(
        `No user found with role "${roleLabel}" in login table. ` +
        `Ensure: 1) Role exists in login.role, 2) Role has email address, 3) You passed assigned_to_label (not assigned_to)`
      );
    }

    if (!data || !data.email) {
      console.log(`[RoleEmailResolver] ❌ No email found for role: "${roleLabel}"`);
      roleEmailCache.set(cacheKey, null);
      throw new Error(`User with role "${roleLabel}" exists but has no email address`);
    }

    const email = data.email;
    
    // Cache the successful result
    roleEmailCache.set(cacheKey, email);
    console.log(`[RoleEmailResolver] ✅ Found and cached: "${roleLabel}" → ${email}`);
    
    return email;

  } catch (err) {
    if (err.message.includes('No user found') || err.message.includes('has no email')) {
      throw err; // Re-throw our custom errors
    }
    
    console.error(`[RoleEmailResolver] Unexpected error:`, err);
    throw new Error(`Failed to resolve email for role "${roleLabel}": ${err.message}`);
  }
}

/**
 * Clear the entire cache
 * Useful for testing or when role assignments change
 */
function clearCache() {
  const cacheSize = roleEmailCache.size;
  roleEmailCache.clear();
  console.log(`[RoleEmailResolver] Cache cleared (${cacheSize} entries removed)`);
}

/**
 * Remove a specific role from cache
 * @param {string} role - Role to remove from cache
 */
function invalidateRole(role) {
  const normalizedRole = normalizeRole(role);
  const wasPresent = roleEmailCache.delete(normalizedRole);
  if (wasPresent) {
    console.log(`[RoleEmailResolver] Invalidated cache for role: "${role}"`);
  }
}

/**
 * Get current cache statistics
 * @returns {Object} Cache stats
 */
function getCacheStats() {
  const entries = Array.from(roleEmailCache.entries());
  return {
    size: roleEmailCache.size,
    entries: entries.map(([role, email]) => ({ role, email }))
  };
}

export {
  getEmailByRole,
  clearCache,
  invalidateRole,
  getCacheStats
};
