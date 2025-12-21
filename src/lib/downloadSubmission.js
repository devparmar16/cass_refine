// src/lib/downloadSubmission.js
// Helper functions for downloading task submissions

import { supabase } from './supabase';

/**
 * Get the latest submission for a task
 */
export async function getLatestSubmission(taskId) {
  const { data, error } = await supabase
    .from('task_submissions')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('[downloadSubmission] Error fetching submission:', error);
    return null;
  }
  return data;
}

/**
 * Download a file from URL
 */
export function downloadFromUrl(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'download';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Download data as JSON file
 */
export function downloadAsJson(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCsv(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV rows
  const rows = data.map(row => 
    headers.map(header => {
      let cell = row[header] ?? '';
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      cell = String(cell);
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        cell = '"' + cell.replace(/"/g, '""') + '"';
      }
      return cell;
    }).join(',')
  );

  // Combine header and rows
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Download data as CSV file
 */
export function downloadAsCsv(data, filename) {
  const csvStr = arrayToCsv(data);
  const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Download submission based on upload type
 */
export async function downloadSubmission(task) {
  const submission = await getLatestSubmission(task.id);
  
  if (!submission) {
    alert('No submission found for this task.');
    return;
  }

  const uploadType = task.upload_type || 'file';

  switch (uploadType) {
    case 'file':
      if (submission.file_url) {
        downloadFromUrl(submission.file_url, `task_${task.id}_file`);
      } else {
        alert('No file URL found in submission.');
      }
      break;

    case 'form':
    case 'form_file':
      if (submission.data) {
        downloadAsJson(submission.data, `task_${task.id}_form.json`);
      } else if (submission.file_url) {
        // Fallback to file if no data
        downloadFromUrl(submission.file_url, `task_${task.id}_form`);
      } else {
        alert('No form data found in submission.');
      }
      break;

    case 'table':
      if (submission.data && Array.isArray(submission.data)) {
        downloadAsCsv(submission.data, `task_${task.id}_table.csv`);
      } else if (submission.file_url) {
        // Fallback to file URL (could be a CSV file)
        downloadFromUrl(submission.file_url, `task_${task.id}_table.csv`);
      } else {
        alert('No table data found in submission.');
      }
      break;

    default:
      // Default: try file_url first, then data as JSON
      if (submission.file_url) {
        downloadFromUrl(submission.file_url, `task_${task.id}`);
      } else if (submission.data) {
        downloadAsJson(submission.data, `task_${task.id}.json`);
      } else {
        alert('No downloadable content found.');
      }
  }
}
