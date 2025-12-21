// Template Storage Helpers
// Storage is the single source of truth - NO database storage
// Uses in-memory + sessionStorage cache for performance
import { supabase } from '@/lib/supabase';

const BUCKET = 'templates';
const CACHE_PREFIX = 'tpl_cache_';

// In-memory cache
const memoryCache = new Map();

/**
 * Get cached data for a task slug
 */
function getFromCache(taskSlug) {
  // Check memory first
  if (memoryCache.has(taskSlug)) {
    return memoryCache.get(taskSlug);
  }
  
  // Check sessionStorage
  try {
    const cached = sessionStorage.getItem(CACHE_PREFIX + taskSlug);
    if (cached) {
      const data = JSON.parse(cached);
      memoryCache.set(taskSlug, data); // Populate memory cache
      return data;
    }
  } catch (e) {
    console.warn('[templateStorage] sessionStorage error:', e);
  }
  
  return null;
}

/**
 * Set cache for a task slug
 */
function setCache(taskSlug, files) {
  memoryCache.set(taskSlug, files);
  try {
    sessionStorage.setItem(CACHE_PREFIX + taskSlug, JSON.stringify(files));
  } catch (e) {
    console.warn('[templateStorage] sessionStorage write error:', e);
  }
}

/**
 * Invalidate cache for a task slug
 */
function invalidateCache(taskSlug) {
  memoryCache.delete(taskSlug);
  try {
    sessionStorage.removeItem(CACHE_PREFIX + taskSlug);
  } catch (e) {
    console.warn('[templateStorage] sessionStorage remove error:', e);
  }
}

/**
 * Generate a URL-safe slug from task_name + assigned_to
 */
export function generateTaskSlug(taskName, assignedTo) {
  const combined = `${taskName}_${assignedTo}`;
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100); // Limit length
}

/**
 * List all template files for a task (with caching)
 * Returns array of file objects or empty array
 */
export async function listTemplates(taskSlug, forceRefresh = false) {
  // Check cache first (unless forcing refresh)
  if (!forceRefresh) {
    const cached = getFromCache(taskSlug);
    if (cached !== null) {
      console.log('[listTemplates] Cache hit for:', taskSlug);
      return cached;
    }
  }

  console.log('[listTemplates] Cache miss, fetching from storage:', taskSlug);
  
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(taskSlug, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('[listTemplates] Error:', error);
      return [];
    }

    // Filter out .emptyFolderPlaceholder if exists
    const files = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder');
    
    // Update cache
    setCache(taskSlug, files);
    
    return files;
  } catch (err) {
    console.error('[listTemplates] Exception:', err);
    return [];
  }
}

/**
 * Check if templates exist for a task (uses cache)
 */
export async function hasTemplates(taskSlug) {
  const files = await listTemplates(taskSlug);
  return files.length > 0;
}

/**
 * Upload a template file (invalidates cache)
 */
export async function uploadTemplate(taskSlug, file) {
  const timestamp = Date.now();
  const fileName = `${timestamp}_${file.name}`;
  const path = `${taskSlug}/${fileName}`;

  console.log('[uploadTemplate] Uploading to:', path);

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false // Don't overwrite
    });

  if (error) {
    console.error('[uploadTemplate] Error:', error);
    throw error;
  }

  // Invalidate cache after upload
  invalidateCache(taskSlug);
  console.log('[uploadTemplate] Success, cache invalidated:', taskSlug);
  
  return data;
}

/**
 * Get signed URL for a template file (for view/download)
 */
export async function getTemplateUrl(taskSlug, fileName) {
  const path = `${taskSlug}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error) {
    console.error('[getTemplateUrl] Error:', error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Remove ALL templates for a task (delete entire folder, invalidates cache)
 */
export async function removeAllTemplates(taskSlug) {
  console.log('[removeAllTemplates] Removing folder:', taskSlug);

  // First list all files (force refresh to get latest)
  const files = await listTemplates(taskSlug, true);
  
  if (files.length === 0) {
    console.log('[removeAllTemplates] No files to remove');
    invalidateCache(taskSlug); // Still invalidate cache
    return true;
  }

  // Build paths array
  const paths = files.map(f => `${taskSlug}/${f.name}`);
  console.log('[removeAllTemplates] Deleting paths:', paths);

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove(paths);

  if (error) {
    console.error('[removeAllTemplates] Error:', error);
    return false;
  }

  // Invalidate cache after delete
  invalidateCache(taskSlug);
  console.log('[removeAllTemplates] Success, cache invalidated:', taskSlug);
  
  return true;
}

/**
 * Remove a single template file (invalidates cache)
 */
export async function removeTemplate(taskSlug, fileName) {
  const path = `${taskSlug}/${fileName}`;
  console.log('[removeTemplate] Removing:', path);

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([path]);

  if (error) {
    console.error('[removeTemplate] Error:', error);
    return false;
  }

  // Invalidate cache after delete
  invalidateCache(taskSlug);
  console.log('[removeTemplate] Success, cache invalidated:', taskSlug);
  
  return true;
}
