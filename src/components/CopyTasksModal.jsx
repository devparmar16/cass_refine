import React, { useState } from 'react';
import { useTaskTemplates } from '@/contexts/TaskTemplatesContext';
import { useParams } from 'react-router-dom';

const CopyTasksModal = ({ open, onClose, onTasksCopied }) => {
  const { groupedByRole, copyTasksToEvent, loading } = useTaskTemplates();
  const { eventId } = useParams();
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [copying, setCopying] = useState(false);
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

  const toggleTask = (taskId) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const selectAllInRole = (roleTasks) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      roleTasks.forEach(task => next.add(task.id));
      return next;
    });
  };

  const deselectAllInRole = (roleTasks) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      roleTasks.forEach(task => next.delete(task.id));
      return next;
    });
  };

  const handleCopy = async () => {
    if (selectedTasks.size === 0) {
      alert('Please select at least one task to copy');
      return;
    }

    if (!eventId) {
      alert('No event selected');
      return;
    }

    setCopying(true);
    try {
      const result = await copyTasksToEvent(Array.from(selectedTasks), eventId);
      if (result.success) {
        alert(`Successfully copied ${result.insertedTasks.length} tasks`);
        setSelectedTasks(new Set());
        onTasksCopied?.();
        onClose();
      } else {
        alert(`Failed to copy tasks: ${result.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setCopying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 text-2xl hover:text-gray-600"
        >
          ×
        </button>

        <h2 className="text-xl font-bold mb-4">Copy Tasks from All Events</h2>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading tasks...</div>
        ) : Object.keys(groupedByRole).length === 0 ? (
          <div className="text-center py-8 text-gray-500">No tasks available to copy</div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Selected: {selectedTasks.size} task(s)
            </div>

            <div className="space-y-3">
              {Object.entries(groupedByRole).map(([role, { label, tasks }]) => {
                const roleTaskIds = tasks.map(t => t.id);
                const selectedInRole = roleTaskIds.filter(id => selectedTasks.has(id)).length;
                const isExpanded = expandedRoles.has(role);

                return (
                  <div key={role} className="border rounded-lg">
                    {/* Role Header */}
                    <div className="bg-gray-100 p-3 flex items-center justify-between">
                      <button
                        onClick={() => toggleRole(role)}
                        className="flex items-center gap-2 flex-1 text-left font-semibold"
                      >
                        <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                        <span>{label} ({tasks.length} tasks)</span>
                        {selectedInRole > 0 && (
                          <span className="text-sm text-blue-600 ml-2">
                            {selectedInRole} selected
                          </span>
                        )}
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => selectAllInRole(tasks)}
                          className="text-sm text-blue-600 hover:underline px-2"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => deselectAllInRole(tasks)}
                          className="text-sm text-gray-600 hover:underline px-2"
                        >
                          Deselect All
                        </button>
                      </div>
                    </div>

                    {/* Task List */}
                    {isExpanded && (
                      <div className="p-3 space-y-2">
                        {tasks.map(task => (
                          <label
                            key={task.id}
                            className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedTasks.has(task.id)}
                              onChange={() => toggleTask(task.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="font-medium">{task.task_name}</div>
                              {task.task_desc && (
                                <div className="text-sm text-gray-600 mt-1">
                                  {task.task_desc}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                Upload Type: {task.upload_type || 'file'}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                disabled={copying}
              >
                Cancel
              </button>
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={copying || selectedTasks.size === 0}
              >
                {copying ? 'Copying...' : `Copy ${selectedTasks.size} Task(s)`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CopyTasksModal;
