import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { useRoles } from '@/contexts/RolesContext';
import { normalizeRole } from '@/lib/roleUtils';

// Remove hardcoded AVAILABLE_ROLES - now using context
// const AVAILABLE_ROLES = [...]; ← DELETED

export default function AssignTaskForm({ eventId, onSuccess }) {
  const { roles, loading: rolesLoading } = useRoles(); // Get roles from context
  
  const [formData, setFormData] = useState({
    name: '',
    task_desc: '',
    assigned_to: null, // Now stores full { label, value } object
  });
  const [reviewers, setReviewers] = useState([]); // Now stores array of { label, value } objects
  const [submitting, setSubmitting] = useState(false);

  const handleAddReviewer = (roleValue) => {
    const roleObj = roles.find(r => r.value === roleValue);
    if (roleObj && !reviewers.find(r => r.value === roleValue)) {
      setReviewers([...reviewers, roleObj]);
    }
  };

  const handleRemoveReviewer = (roleValue) => {
    setReviewers(reviewers.filter(r => r.value !== roleValue));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.assigned_to || reviewers.length === 0) {
      alert('Please fill task name, assigned role, and at least one reviewer.');
      return;
    }

    setSubmitting(true);
    try {
      // Find or create workflow template using normalized values
      const workflowHash = reviewers.map(r => r.value).join('>');
      let { data: template, error: templateError } = await supabase
        .from('review_flow_templates')
        .select('*')
        .eq('workflow_hash', workflowHash)
        .single();

      let flow_template_id;
      if (template) {
        flow_template_id = template.id;
      } else {
        // Create new template
        const { data: newTemplate, error: newTemplateError } = await supabase
          .from('review_flow_templates')
          .insert([{
            name: `Review Flow for ${formData.name}`,
            workflow_hash: workflowHash,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        if (newTemplateError || !newTemplate) throw newTemplateError || new Error('Failed to create template');
        flow_template_id = newTemplate.id;

        // Insert reviewer steps with normalized values
        const steps = reviewers.map((roleObj, idx) => ({
          template_id: flow_template_id,
          step_order: idx,
          reviewer_role: roleObj.value, // Use normalized value
        }));
        const { error: stepsError } = await supabase
          .from('review_flow_template_steps')
          .insert(steps);
        if (stepsError) throw stepsError;
      }

      // Create task with both normalized and label
      const { error: taskError } = await supabase
        .from('tasks_temp')
        .insert([{
          task_name: formData.name,
          task_desc: formData.task_desc,
          event_id: eventId,
          assigned_to: formData.assigned_to.value, // Normalized value
          assigned_to_label: formData.assigned_to.label, // Original label
          flow_template_id,
          current_step: 0,
          current_reviewer_role: null,
          status: 'assigned',
        }]);
      if (taskError) throw taskError;

      alert('Task assigned successfully!');
      setFormData({ name: '', task_desc: '', assigned_to: null });
      setReviewers([]);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to assign task: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border rounded p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3">Assign Task (Chair Only)</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Task Name *</label>
          <input
            type="text"
            className="border p-2 w-full rounded"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Task Description</label>
          <textarea
            className="border p-2 w-full rounded"
            rows="3"
            value={formData.task_desc}
            onChange={(e) => setFormData({ ...formData, task_desc: e.target.value })}
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Assigned To *</label>
          {rolesLoading ? (
            <div className="border p-2 w-full rounded text-gray-500">
              Loading roles...
            </div>
          ) : (
            <select
              className="border p-2 w-full rounded"
              value={formData.assigned_to?.value || ''}
              onChange={(e) => {
                const roleObj = roles.find(r => r.value === e.target.value);
                setFormData({ ...formData, assigned_to: roleObj });
              }}
              required
            >
              <option value="">Select role</option>
              {roles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Reviewer Chain * (in order)</label>
          <div className="flex gap-2 flex-wrap mb-2">
            {reviewers.map((roleObj, idx) => (
              <div key={idx} className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded">
                <span className="text-xs">{idx + 1}. {roleObj.label}</span>
                <button type="button" onClick={() => handleRemoveReviewer(roleObj.value)} className="text-red-500 text-xs">✕</button>
              </div>
            ))}
          </div>
          <select
            className="border p-2 w-full rounded"
            onChange={(e) => {
              if (e.target.value) {
                handleAddReviewer(e.target.value);
                e.target.value = '';
              }
            }}
          >
            <option value="">Add reviewer</option>
            {roles.filter(r => !reviewers.find(rev => rev.value === r.value)).map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Assigning...' : 'Assign Task'}
        </Button>
      </form>
    </div>
  );
}
