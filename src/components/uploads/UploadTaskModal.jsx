// UploadTaskModal - ONLY routes to correct modal based on upload_type
// NEVER uploads files, NEVER talks to storage
import FileUploadModal from '../tasks/FileUploadModal';
import FormUploadModal from './FormUploadModal';
import FormWithFileModal from './FormWithFileModal';

export default function UploadTaskModal({ task, open, onClose, onSuccess }) {
  if (!open) return null;

  const role = task.assigned_to;

  switch (task.upload_type) {
    case 'file':
      return (
        <FileUploadModal
          task={task}
          role={role}
          onCancel={onClose}
          onSubmit={() => { onSuccess?.(); onClose(); }}
        />
      );

    case 'form':
      return (
        <FormUploadModal
          task={task}
          role={role}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      );

    // Note: 'table' type is handled separately via TableUploadChoiceModal in TaskCard

    case 'form_file':
      return (
        <FormWithFileModal
          task={task}
          schema={task.form_schema || []}
          onCancel={onClose}
          onSubmit={() => { onSuccess?.(); onClose(); }}
        />
      );

    default:
      // Default to file upload for backwards compatibility
      return (
        <FileUploadModal
          task={task}
          role={role}
          onCancel={onClose}
          onSubmit={() => { onSuccess?.(); onClose(); }}
        />
      );
  }
}
