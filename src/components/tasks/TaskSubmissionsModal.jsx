import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import BaseModal from '../modals/BaseModal';
import FormDataView from './view/FormDataView';
import TableDataView from './view/TableDataView';

export default function TaskSubmissionsModal({ task, open, onClose }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && task?.id) {
      fetchSubmissions();
    }
  }, [open, task?.id]);

  const fetchSubmissions = async () => {
    setLoading(true);
    console.log('[TaskSubmissionsModal] Fetching for task_id:', task.id);
    
    const { data, error } = await supabase
      .from('task_submissions')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: false });

    console.log('[TaskSubmissionsModal] Result:', { data, error });

    if (!error) setSubmissions(data || []);
    setLoading(false);
  };

  // Determine how to render data based on task upload_type
  const renderSubmissionData = (sub) => {
    if (!sub.data) return null;

    const uploadType = task.upload_type || 'file';

    switch (uploadType) {
      case 'form':
      case 'form_file':
        return (
          <div className="mt-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Form Data:</p>
            <div className="bg-white border rounded p-3">
              <FormDataView data={sub.data} />
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="mt-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Table Data:</p>
            <div className="bg-white border rounded p-3">
              <TableDataView data={sub.data} />
            </div>
          </div>
        );

      default:
        // For file type or unknown, show expandable JSON if data exists
        return (
          <details className="text-sm mt-2">
            <summary className="cursor-pointer text-gray-700 font-medium">View Raw Data</summary>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-x-auto">
              {JSON.stringify(sub.data, null, 2)}
            </pre>
          </details>
        );
    }
  };

  if (!open) return null;

  return (
    <BaseModal open={open} onClose={onClose} title={`Submissions — ${task.task_name}`}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : submissions.length === 0 ? (
          <p className="text-gray-500">No submissions yet.</p>
        ) : (
          submissions.map(sub => (
            <div key={sub.id} className="border rounded p-3 bg-gray-50">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span><strong>By:</strong> {sub.submitted_by_role}</span>
                <span>{new Date(sub.created_at).toLocaleString()}</span>
              </div>

              {sub.file_url && (
                <div className="mb-2">
                  <a
                    href={sub.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm"
                  >
                    📎 View/Download File
                  </a>
                </div>
              )}

              {renderSubmissionData(sub)}
            </div>
          ))
        )}
      </div>
    </BaseModal>
  );
}
