import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useRoles } from '../../contexts/RolesContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTaskTemplates } from '../../contexts/TaskTemplatesContext';

// Remove hardcoded ROLE_OPTIONS - now using context
// const ROLE_OPTIONS = [...]; ← DELETED

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'date', label: 'Date' },
];

// reviewerRoleOptions will now come from context
// const reviewerRoleOptions = ROLE_OPTIONS.map(...); ← DELETED

function hashReviewerChain(chain) {
  return chain.join('>');
}

const AssignTaskModal = ({ open, onClose, onTaskAssigned }) => {
  const { eventId } = useParams();
  const { roles, loading: rolesLoading } = useRoles(); // Get roles from context
  const { addTaskToCache } = useTaskTemplates(); // Get addTaskToCache from context

  const [state, setState] = useState({
    taskName: '',
    taskDesc: '',
    assignedTo: null, // Now stores full { label, value } object
    reviewers: [],    // Now stores array of { label, value } objects
    uploadType: 'file',
    formSchema: [],
    loading: false,
    error: '',
  });

  const handleReviewerChange = (idx, roleValue) => {
    // Find the full role object from roles array
    const roleObj = roles.find(r => r.value === roleValue);
    if (!roleObj) return;
    
    setState(prev => ({
      ...prev,
      reviewers: prev.reviewers.map((r, i) => (i === idx ? roleObj : r)),
    }));
  };

  const addReviewer = () => {
    // Add first role as default
    if (roles.length > 0) {
      setState(prev => ({
        ...prev,
        reviewers: [...prev.reviewers, roles[0]],
      }));
    }
  };

  const removeReviewer = idx =>
    setState(prev => ({
      ...prev,
      reviewers: prev.reviewers.filter((_, i) => i !== idx),
    }));

  const handleSubmit = async e => {
    e.preventDefault();
    setState(prev => ({ ...prev, error: '' }));

    if (!state.taskName.trim()) {
      setState(prev => ({ ...prev, error: 'Task name is required' }));
      return;
    }

    // Skip reviewer validation for manual tasks (upload_type='none')
    if (state.uploadType !== 'none' && !state.reviewers.length) {
      setState(prev => ({ ...prev, error: 'At least one reviewer is required' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      let flow_template_id = null;

      // Skip review flow creation for upload_type='none' (manual/link-based tasks)
      if (state.uploadType !== 'none') {
        // Create workflow hash from normalized role values
        const workflowHash = hashReviewerChain(state.reviewers.map(r => r.value));

        const { data: existingTemplate } = await supabase
          .from('review_flow_templates')
          .select('*')
          .eq('workflow_hash', workflowHash)
          .single();

        flow_template_id = existingTemplate?.id;

        if (!flow_template_id) {
          const { data: newTemplate, error: templateError } = await supabase
            .from('review_flow_templates')
            .insert({
              name: `Review Flow - ${state.taskName}`,
              workflow_hash: workflowHash,
            })
            .select()
            .single();

          if (templateError) throw templateError;

          flow_template_id = newTemplate.id;

          const steps = state.reviewers.map((roleObj, idx) => ({
            template_id: flow_template_id,
            step_order: idx,
            reviewer_role: roleObj.value, // Use normalized value for reviewer_role
          }));

          const { error: stepsError } = await supabase
            .from('review_flow_template_steps')
            .insert(steps);

          if (stepsError) throw stepsError;
        }
      }

      const { data: newTask, error: taskError } = await supabase.from('tasks_temp').insert({
        task_name: state.taskName,
        task_desc: state.taskDesc,
        assigned_to: state.assignedTo?.value || roles[0]?.value, // Normalized value
        assigned_to_label: state.assignedTo?.label || roles[0]?.label, // Original label
        event_id: eventId,
        flow_template_id,
        current_step: state.uploadType === 'none' ? null : 0,
        current_reviewer_role: null,
        status: 'assigned',
        upload_type: state.uploadType,
        form_schema: state.uploadType === 'form' || state.uploadType === 'form_file' ? state.formSchema : null,
      }).select().single();

      if (taskError) throw taskError;

      // Add new task to cache
      if (newTask && addTaskToCache) {
        addTaskToCache(newTask);
      }

      console.log('Task created with upload_type:', state.uploadType);
      console.log('Form schema:', state.formSchema);

      setState({
        taskName: '',
        taskDesc: '',
        assignedTo: roles.length > 0 ? roles[0] : null,
        reviewers: [],
        uploadType: 'file',
        formSchema: [],
        loading: false,
        error: '',
      });

      onTaskAssigned?.();
      onClose();
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to assign task',
        loading: false,
      }));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400"
        >
          ×
        </button>

        <h2 className="text-xl font-bold mb-4">Assign Task</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Name */}
          <div>
            <label className="font-medium">Task Name</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={state.taskName}
              onChange={e =>
                setState(prev => ({ ...prev, taskName: e.target.value }))
              }
              required
            />
          </div>

          {/* Task Description */}
          <div>
            <label className="font-medium">Task Description</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={3}
              value={state.taskDesc}
              onChange={e =>
                setState(prev => ({ ...prev, taskDesc: e.target.value }))
              }
            />
          </div>

          {/* Assign To */}
          <div>
            <label className="font-medium">Assign To</label>
            {rolesLoading ? (
              <div className="w-full border rounded px-3 py-2 text-gray-500">
                Loading roles...
              </div>
            ) : (
              <select
                className="w-full border rounded px-3 py-2"
                value={state.assignedTo?.value || ''}
                onChange={e => {
                  const roleObj = roles.find(r => r.value === e.target.value);
                  setState(prev => ({ ...prev, assignedTo: roleObj }));
                }}
                required
              >
                <option value="">Select Role</option>
                {roles.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Upload Type */}
          <div>
            <label className="font-medium">Upload Type</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={state.uploadType}
              onChange={e =>
                setState(prev => ({
                  ...prev,
                  uploadType: e.target.value,
                  formSchema: [],
                }))
              }
            >
              <option value="file">File Upload</option>
              <option value="form">Form</option>
              <option value="table">Table</option>
              <option value="form_file">Form + File</option>
              <option value="none">Manual / Link-based (No Upload)</option>
            </select>
          </div>

          {/* Form Builder - Only for form and form_file types */}
          {['form', 'form_file'].includes(state.uploadType) && (
            <div className="border rounded p-3">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Form Fields</span>
                <button
                  type="button"
                  className="text-blue-600 text-sm"
                  onClick={() =>
                    setState(prev => ({
                      ...prev,
                      formSchema: [
                        ...prev.formSchema,
                        {
                          id: crypto.randomUUID(),
                          label: '',
                          type: 'text',
                          required: false,
                        },
                      ],
                    }))
                  }
                >
                  + Add Field
                </button>
              </div>

              {state.formSchema.map((field, idx) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <input
                    className="flex-1 border rounded px-2 py-1"
                    placeholder="Label"
                    value={field.label}
                    onChange={e => {
                      const updated = [...state.formSchema];
                      updated[idx].label = e.target.value;
                      setState(prev => ({ ...prev, formSchema: updated }));
                    }}
                  />

                  <select
                    className="border rounded px-2 py-1"
                    value={field.type}
                    onChange={e => {
                      const updated = [...state.formSchema];
                      updated[idx].type = e.target.value;
                      setState(prev => ({ ...prev, formSchema: updated }));
                    }}
                  >
                    {FIELD_TYPES.map(ft => (
                      <option key={ft.value} value={ft.value}>
                        {ft.label}
                      </option>
                    ))}
                  </select>

                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e => {
                        const updated = [...state.formSchema];
                        updated[idx].required = e.target.checked;
                        setState(prev => ({ ...prev, formSchema: updated }));
                      }}
                    />
                    Req
                  </label>

                  <button
                    type="button"
                    className="text-red-500"
                    onClick={() =>
                      setState(prev => ({
                        ...prev,
                        formSchema: prev.formSchema.filter((_, i) => i !== idx),
                      }))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Reviewers - hidden for manual tasks (upload_type='none') */}
          {state.uploadType !== 'none' && (
            <div>
              <label className="font-medium">Reviewers (order matters)</label>
              {state.reviewers.length === 0 ? (
                <button
                  type="button"
                  onClick={addReviewer}
                  className="w-full border-2 border-dashed border-gray-300 rounded px-3 py-2 text-gray-600 hover:border-blue-500 hover:text-blue-500"
                >
                  + Add Reviewer
                </button>
              ) : (
                <>
                  {state.reviewers.map((roleObj, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <select
                        className="flex-1 border rounded px-3 py-2"
                        value={roleObj?.value || ''}
                        onChange={e => handleReviewerChange(idx, e.target.value)}
                      >
                        {roles.map(r => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>

                      {idx === state.reviewers.length - 1 && (
                        <button 
                          type="button" 
                          onClick={addReviewer}
                          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          +
                        </button>
                      )}

                      {state.reviewers.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => removeReviewer(idx)}
                          className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          -
                        </button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Info text for manual tasks */}
          {state.uploadType === 'none' && (
            <div className="text-sm text-gray-600 bg-purple-50 p-3 rounded">
              <strong>Manual Task:</strong> No file uploads or review flow. 
              Use the description to include links. Task can be manually routed between roles.
            </div>
          )}

          {state.error && (
            <p className="text-red-600 text-sm">{state.error}</p>
          )}

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded"
            disabled={state.loading}
          >
            {state.loading ? 'Assigning...' : 'Assign Task'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default function ChairPersonAssignTaskFeature() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  // Only show button if user is Chair Person
  if (user?.role !== 'Chair Person') {
    return null;
  }

  return (
    <div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={() => setOpen(true)}
      >
        Assign Task
      </button>

      <AssignTaskModal
        open={open}
        onClose={() => setOpen(false)}
        onTaskAssigned={() => {}}
      />
    </div>
  );
}
