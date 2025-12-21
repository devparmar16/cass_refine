// Template View Modal - For all roles to view/download templates
// Read-only - no delete functionality
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { listTemplates, getTemplateUrl } from '@/lib/templateStorage';
import { FileText, Download, X, Loader2, ExternalLink } from 'lucide-react';

export default function TemplateViewModal({ taskSlug, taskName, open, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // { fileName, action }

  useEffect(() => {
    if (open && taskSlug) {
      loadTemplates();
    }
  }, [open, taskSlug]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await listTemplates(taskSlug);
      setFiles(data);
    } catch (err) {
      console.error('Error loading templates:', err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // View in new tab
  const handleView = async (fileName) => {
    setActionLoading({ fileName, action: 'view' });
    try {
      const url = await getTemplateUrl(taskSlug, fileName);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('View error:', err);
      alert('Failed to open file');
    } finally {
      setActionLoading(null);
    }
  };

  // Download file
  const handleDownload = async (fileName) => {
    setActionLoading({ fileName, action: 'download' });
    try {
      const url = await getTemplateUrl(taskSlug, fileName);
      if (url) {
        // Fetch the file and trigger download
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = cleanFileName(fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file');
    } finally {
      setActionLoading(null);
    }
  };

  // Clean filename (remove timestamp prefix)
  const cleanFileName = (name) => {
    return name.replace(/^\d+_/, '');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[550px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Templates</h2>
            <p className="text-sm text-gray-500">{taskName}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading templates...</span>
            </div>
          ) : files.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No templates available.
            </p>
          ) : (
            <div className="space-y-2">
              {files.map(file => (
                <div 
                  key={file.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {cleanFileName(file.name)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {file.metadata?.size 
                          ? `${(file.metadata.size / 1024).toFixed(1)} KB` 
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* View button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(file.name)}
                      disabled={actionLoading?.fileName === file.name}
                      title="View in new tab"
                    >
                      {actionLoading?.fileName === file.name && actionLoading?.action === 'view' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <ExternalLink className="w-4 h-4" />
                      )}
                    </Button>
                    {/* Download button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(file.name)}
                      disabled={actionLoading?.fileName === file.name}
                      title="Download"
                    >
                      {actionLoading?.fileName === file.name && actionLoading?.action === 'download' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> View in new tab
            </span>
            <span className="flex items-center gap-1">
              <Download className="w-3 h-3" /> Download file
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
