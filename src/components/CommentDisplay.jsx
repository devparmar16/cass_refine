import React from 'react';
import { Badge } from '@/components/ui/badge';

const CommentDisplay = ({ comments }) => {
  // Separate comments by type
  const messageComments = comments.filter(c => 
    c.comment_type?.type === 'reupload' || 
    c.comment_type?.type === 'upload' ||
    !c.comment_type?.type // Default to message if no type specified
  );
  
  const reviewComments = comments.filter(c => 
    c.comment_type?.type === 'review'
  );

  return (
    <div className="space-y-4">
      {/* Message Section */}
      {messageComments.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Message</Badge>
            <span>({messageComments.length})</span>
          </h4>
          <div className="space-y-3">
            {messageComments.map((c, idx) => (
              <div key={c.id || c.comment_id || idx} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm text-blue-800 dark:text-blue-200">
                    {c.commenter_role} ({c.commenter_name})
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {c.comment_type?.type === 'reupload' ? 'Reupload' : 'Upload'}
                  </Badge>
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-line">
                  {c.comment_text}
                </div>
                <div className="text-xs text-blue-500 dark:text-blue-400 mt-2">
                  {new Date(c.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Section */}
      {reviewComments.length > 0 && (
        <div>
          <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Review</Badge>
            <span>({reviewComments.length})</span>
          </h4>
          <div className="space-y-3">
            {reviewComments.map((c, idx) => (
              <div key={c.id || c.comment_id || idx} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm text-green-800 dark:text-green-200">
                    {c.commenter_role} ({c.commenter_name})
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={c.comment_type?.action === 'approved' ? 'default' : 'destructive'} 
                      className="text-xs"
                    >
                      {c.comment_type?.action === 'approved' ? 'Approved' : 'Rejected'}
                    </Badge>
                    {c.comment_type?.step && (
                      <Badge variant="outline" className="text-xs">
                        Step {c.comment_type.step}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-sm text-green-700 dark:text-green-300 whitespace-pre-line">
                  {c.comment_text}
                </div>
                <div className="text-xs text-green-500 dark:text-green-400 mt-2">
                  {new Date(c.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Comments */}
      {comments.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
          No comments yet
        </div>
      )}
    </div>
  );
};

export default CommentDisplay; 