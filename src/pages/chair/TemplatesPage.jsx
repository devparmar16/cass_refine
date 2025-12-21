// Chair-only Templates Page
// Manage templates for tasks across all events
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  generateTaskSlug, 
  listTemplates, 
  uploadTemplate, 
  removeAllTemplates,
  getTemplateUrl
} from '@/lib/templateStorage';
import { Upload, Eye, Trash2, Plus, ArrowLeft, FileText, Download, ExternalLink, Loader2 } from 'lucide-react';

// Role display names
const ROLE_DISPLAY = {
  'chair': 'Chair Person',
  'vice_chair': 'Vice Chairperson',
  'secretary': 'Secretary',
  'treasurer': 'Treasurer',
  'technical': 'Technical Coordinator',
  'coordinator': 'Event Coordinator',
  'social_media': 'Social Media Promotion Manager',
};

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [templateStatus, setTemplateStatus] = useState({}); // { taskSlug: files[] }
  const [checkingTemplates, setCheckingTemplates] = useState(false);

  // Modal states
  const [uploadModal, setUploadModal] = useState(null); // { taskSlug, taskName, assignedTo }
  const [viewModal, setViewModal] = useState(null); // { taskSlug, taskName, files }
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(null); // taskSlug being removed

  // Check if user is Chair
  const isChair = user?.role === 'Chair Person';

  // Redirect non-chair users
  useEffect(() => {
    if (user && !isChair) {
      navigate('/events');
    }
  }, [user, isChair, navigate]);

  // Fetch all tasks (unique by task_name + assigned_to)
  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tasks_temp')
          .select('task_name, assigned_to')
          .order('assigned_to', { ascending: true })
          .order('task_name', { ascending: true });

        if (error) throw error;

        // Deduplicate by task_name + assigned_to
        const uniqueMap = new Map();
        (data || []).forEach(t => {
          const key = `${t.task_name}__${t.assigned_to}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, t);
          }
        });

        const uniqueTasks = Array.from(uniqueMap.values());
        setTasks(uniqueTasks);

        // Check template status for each unique task
        await checkAllTemplateStatus(uniqueTasks);
      } catch (err) {
        console.error('Error fetching tasks:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isChair) {
      fetchTasks();
    }
  }, [isChair]);

  // Check template status for all tasks
  const checkAllTemplateStatus = async (taskList) => {
    setCheckingTemplates(true);
    const status = {};

    for (const task of taskList) {
      const slug = generateTaskSlug(task.task_name, task.assigned_to);
      const files = await listTemplates(slug);
      status[slug] = files;
    }

    setTemplateStatus(status);
    setCheckingTemplates(false);
  };

  // Refresh template status for a single task
  const refreshTemplateStatus = async (taskSlug) => {
    const files = await listTemplates(taskSlug);
    setTemplateStatus(prev => ({ ...prev, [taskSlug]: files }));
  };

  // Group tasks by role
  const tasksByRole = tasks.reduce((acc, task) => {
    const role = task.assigned_to || 'unassigned';
    if (!acc[role]) acc[role] = [];
    acc[role].push(task);
    return acc;
  }, {});

  // Handle file upload
  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        await uploadTemplate(uploadModal.taskSlug, file);
      }
      await refreshTemplateStatus(uploadModal.taskSlug);
      setUploadModal(null);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload template: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Handle remove all templates
  const handleRemoveAll = async (taskSlug, taskName) => {
    if (!confirm(`Remove ALL templates for "${taskName}"?\n\nThis will affect all events with this task.`)) {
      return;
    }

    setRemoving(taskSlug);
    try {
      await removeAllTemplates(taskSlug);
      await refreshTemplateStatus(taskSlug);
    } catch (err) {
      console.error('Remove error:', err);
      alert('Failed to remove templates');
    } finally {
      setRemoving(null);
    }
  };

  // Open view modal
  const openViewModal = async (task) => {
    const slug = generateTaskSlug(task.task_name, task.assigned_to);
    const files = templateStatus[slug] || [];
    setViewModal({ taskSlug: slug, taskName: task.task_name, files });
  };

  // Download file
  const handleDownload = async (taskSlug, fileName) => {
    const url = await getTemplateUrl(taskSlug, fileName);
    if (url) {
      window.open(url, '_blank');
    }
  };

  if (!isChair) {
    return <div className="p-4">Access denied. Chair only.</div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/events')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Task Templates</h1>
        <span className="text-sm text-gray-500">
          (Chair Only - Applies across all events)
        </span>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Templates</strong> are reusable files attached to task types. 
          When you add a template for a task (e.g., "Submit Report" → Secretary), 
          it will be available for that task across ALL events.
        </p>
      </div>

      {loading || checkingTemplates ? (
        <p className="text-gray-500">Loading tasks and templates...</p>
      ) : tasks.length === 0 ? (
        <p className="text-gray-500">No tasks found.</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(tasksByRole).map(([role, roleTasks]) => (
            <div key={role} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 font-semibold">
                {ROLE_DISPLAY[role] || role} ({roleTasks.length} task types)
              </div>
              <div className="divide-y">
                {roleTasks.map(task => {
                  const slug = generateTaskSlug(task.task_name, task.assigned_to);
                  const files = templateStatus[slug] || [];
                  const hasFiles = files.length > 0;

                  return (
                    <div key={slug} className="flex items-center justify-between p-4 hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium">{task.task_name}</p>
                        <p className="text-sm text-gray-500">
                          {hasFiles ? `${files.length} template(s)` : 'No templates'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasFiles ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openViewModal(task)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUploadModal({ 
                                taskSlug: slug, 
                                taskName: task.task_name, 
                                assignedTo: task.assigned_to 
                              })}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add More
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveAll(slug, task.task_name)}
                              disabled={removing === slug}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              {removing === slug ? 'Removing...' : 'Remove All'}
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setUploadModal({ 
                              taskSlug: slug, 
                              taskName: task.task_name, 
                              assignedTo: task.assigned_to 
                            })}
                          >
                            <Upload className="w-4 h-4 mr-1" />
                            Add Template
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[450px]">
            <h2 className="text-lg font-semibold mb-4">
              Add Template
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Task: <strong>{uploadModal.taskName}</strong><br />
              Role: <strong>{ROLE_DISPLAY[uploadModal.assignedTo] || uploadModal.assignedTo}</strong>
            </p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-4">
              <input
                type="file"
                multiple
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
                id="template-upload"
              />
              <label htmlFor="template-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">
                  {uploading ? 'Uploading...' : 'Click to select files'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Multiple files allowed
                </p>
              </label>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setUploadModal(null)}
                disabled={uploading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-lg font-semibold mb-4">
              Templates: {viewModal.taskName}
            </h2>
            
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {viewModal.files.map(file => (
                <div 
                  key={file.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-gray-500 flex-shrink-0" />
                    <span className="text-sm truncate">
                      {file.name.replace(/^\d+_/, '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="View in new tab"
                      onClick={async () => {
                        const url = await getTemplateUrl(viewModal.taskSlug, file.name);
                        if (url) window.open(url, '_blank');
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Download"
                      onClick={() => handleDownload(viewModal.taskSlug, file.name)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setViewModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
