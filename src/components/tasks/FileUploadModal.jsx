import React, { useState } from 'react';
import BaseModal from '../modals/BaseModal';
import { uploadTaskFile } from '@/lib/uploadTaskFile';
import { createTaskSubmission } from '@/lib/taskSubmissions';

export default function FileUploadModal({ task, role, onCancel, onSubmit }) {
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (files.length === 0) return;
    setSaving(true);

    try {
      console.log('[FileUploadModal] Starting upload of', files.length, 'files');

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1} of ${files.length}: ${file.name}`);

        console.log('[FileUploadModal] Uploading:', { file: file.name, role, taskId: task.id, eventId: task.event_id });

        // Upload file to storage
        const fileUrl = await uploadTaskFile({
          file,
          role,
          eventId: task.event_id,
          taskId: task.id,
        });

        console.log('[FileUploadModal] File uploaded, URL:', fileUrl);

        // Insert into task_submissions
        await createTaskSubmission({
          taskId: task.id,
          role,
          data: null,
          fileUrl,
        });

        console.log('[FileUploadModal] Submission created for file:', file.name);
      }

      console.log('[FileUploadModal] All files uploaded, calling onSubmit');
      if (onSubmit) onSubmit();
    } catch (err) {
      console.error('File upload error:', err);
      alert(err.message);
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  };

  return (
    <BaseModal open={true} onClose={onCancel} title="Upload Files">
      <div className="space-y-4">
        <input
          type="file"
          multiple
          className="w-full border rounded p-2"
          onChange={handleFileChange}
        />

        {/* Selected files preview */}
        {files.length > 0 && (
          <div className="border rounded p-3 bg-gray-50 max-h-48 overflow-y-auto">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Selected Files ({files.length}):
            </p>
            <ul className="space-y-1">
              {files.map((file, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 mr-2">
                    📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    ✕ Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upload progress */}
        {uploadProgress && (
          <p className="text-sm text-blue-600">{uploadProgress}</p>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onCancel} className="px-4 py-2 rounded border" disabled={saving}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={files.length === 0 || saving}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? 'Uploading...' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
