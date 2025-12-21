import { useState } from 'react';
import { uploadTaskFile } from '@/lib/uploadTaskFile';
import { createTaskSubmission } from '@/lib/taskSubmissions';

export default function FormUploadModal({
  task,
  role,
  onClose,
  onSuccess
}) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);

      // Convert form data to JSON file
      const blob = new Blob(
        [JSON.stringify(formData, null, 2)],
        { type: 'application/json' }
      );
      const file = new File([blob], 'form_data.json');

      // Upload JSON file to storage
      const fileUrl = await uploadTaskFile({
        file,
        role,
        eventId: task.event_id,
        taskId: task.id,
      });

      // Insert into task_submissions
      await createTaskSubmission({
        taskId: task.id,
        role,
        data: formData,  // raw JSON for UI
        fileUrl,         // stored file URL
      });

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Form upload failed:', err);
      alert('Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[500px]">
        <h2 className="text-lg font-semibold mb-4">
          Submit Form — {task.task_name}
        </h2>

        {/* Dynamic form fields based on schema */}
        <div className="space-y-3">
          {(task.form_schema || []).length > 0 ? (
            task.form_schema.map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium mb-1">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    name={field.id}
                    placeholder={field.label}
                    className="border p-2 w-full rounded"
                    onChange={handleChange}
                    required={field.required}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    name={field.id}
                    placeholder={field.label}
                    className="border p-2 w-full rounded"
                    onChange={handleChange}
                    required={field.required}
                  />
                )}
              </div>
            ))
          ) : (
            // Fallback if no schema defined
            <>
              <input
                name="field_1"
                placeholder="Field 1"
                className="border p-2 w-full rounded"
                onChange={handleChange}
              />
              <input
                name="field_2"
                placeholder="Field 2"
                className="border p-2 w-full rounded"
                onChange={handleChange}
              />
              <textarea
                name="remarks"
                placeholder="Remarks"
                className="border p-2 w-full rounded"
                onChange={handleChange}
              />
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            className="px-4 py-2 border rounded"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
