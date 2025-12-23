import React, { useState } from 'react';
import { useTaskTemplates } from '@/contexts/TaskTemplatesContext';

const TemplatesSection = () => {
  const { groupedByRole, loading, lastFetch, fetchTemplates } = useTaskTemplates();
  const [expandedRoles, setExpandedRoles] = useState(new Set());

  const toggleRole = (role) => {
    setExpandedRoles(prev => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Task Templates</h2>
        <div className="text-center text-gray-500">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Task Templates</h2>
        <div className="flex items-center gap-4">
          {lastFetch && (
            <span className="text-sm text-gray-500">
              Last updated: {lastFetch.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchTemplates}
            className="text-sm text-blue-600 hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        All tasks from all events, grouped by role. Use "Copy Tasks" button to reuse these tasks in other events.
      </p>

      {Object.keys(groupedByRole).length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No tasks available yet
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groupedByRole).map(([role, { label, tasks }]) => {
            const isExpanded = expandedRoles.has(role);

            return (
              <div key={role} className="border rounded-lg bg-white">
                {/* Role Header */}
                <button
                  onClick={() => toggleRole(role)}
                  className="w-full bg-blue-50 p-3 flex items-center gap-2 text-left font-semibold hover:bg-blue-100"
                >
                  <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                  <span>{label}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    ({tasks.length} tasks)
                  </span>
                </button>

                {/* Task List */}
                {isExpanded && (
                  <div className="p-3 space-y-2">
                    {tasks.map(task => (
                      <div
                        key={task.id}
                        className="p-3 border rounded hover:bg-gray-50"
                      >
                        <div className="font-medium">{task.task_name}</div>
                        {task.task_desc && (
                          <div className="text-sm text-gray-600 mt-1">
                            {task.task_desc}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2 flex gap-4">
                          <span>Type: {task.upload_type || 'file'}</span>
                          {task.flow_template_id && (
                            <span>Has Review Flow</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TemplatesSection;
