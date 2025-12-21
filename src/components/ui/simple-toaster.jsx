import React from 'react';

// Simple toaster that doesn't use hooks
export function SimpleToaster() {
  return (
    <div id="toast-container" className="fixed top-4 right-4 z-50">
      {/* Toast notifications will be rendered here */}
    </div>
  );
}

// Simple toast function that doesn't require hooks
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `mb-2 p-3 rounded-lg shadow-lg ${
    type === 'success' ? 'bg-green-500 text-white' :
    type === 'error' ? 'bg-red-500 text-white' :
    type === 'warning' ? 'bg-yellow-500 text-white' :
    'bg-blue-500 text-white'
  }`;
  toast.textContent = message;

  container.appendChild(toast);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
} 