// src/components/uploads/TableUploadModal.jsx
import React, { useState } from 'react';
import BaseModal from '../modals/BaseModal';

export default function TableUploadModal({ open, onClose, onSubmit }) {
  const [rows, setRows] = useState('');

  return (
    <BaseModal open={open} onClose={onClose} title="Paste Table Data">
      <div className="space-y-4">
        <textarea
          className="w-full border rounded p-2"
          rows={6}
          placeholder="Paste table data (CSV / tab separated)"
          value={rows}
          onChange={e => setRows(e.target.value)}
        />

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => onSubmit({ rows })}
        >
          Submit
        </button>
      </div>
    </BaseModal>
  );
}
