// src/components/modals/BaseModal.jsx
import React from 'react';

export default function BaseModal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-full max-w-lg p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 text-xl"
          onClick={onClose}
        >
          ×
        </button>

        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        {children}
      </div>
    </div>
  );
}
