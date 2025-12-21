// src/components/uploads/FormWithFileModal.jsx
import React, { useState } from 'react';
import BaseModal from '../modals/BaseModal';
import { uploadTaskFile } from '@/lib/uploadTaskFile';
import { createTaskSubmission } from '@/lib/taskSubmissions';

export default function FormWithFileModal({ task, schema, onCancel, onSubmit }) {
  const [formData, setFormData] = useState({});
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    setSubmitting(true);
    try {
      // Upload the file
      const fileUrl = await uploadTaskFile({
        file,
        role: task.assigned_to,
        eventId: task.event_id,
        taskId: task.id,
      });

      // Insert into task_submissions with form data + file URL
      await createTaskSubmission({
        taskId: task.id,
        role: task.assigned_to,
        data: formData,
        fileUrl,
      });

      if (onSubmit) onSubmit();
    } catch (err) {
      console.error('Form+File upload failed:', err);
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseModal open={true} onClose={onCancel} title="Form + File Upload">
      <div className="space-y-4">
        {(schema || []).map(field => (
          <div key={field.id}>
            <label className="block text-sm font-medium mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                className="w-full border rounded p-2"
                placeholder={field.label}
                onChange={e =>
                  setFormData(prev => ({ ...prev, [field.label]: e.target.value }))
                }
              />
            ) : (
              <input
                type={field.type || 'text'}
                className="w-full border rounded p-2"
                placeholder={field.label}
                onChange={e =>
                  setFormData(prev => ({ ...prev, [field.label]: e.target.value }))
                }
              />
            )}
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium mb-1">File Upload</label>
          <input
            type="file"
            className="w-full border rounded p-2"
            onChange={e => setFile(e.target.files[0])}
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onCancel} className="px-4 py-2 rounded border">Cancel</button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
