// src/components/uploads/DynamicFormModal.jsx
import React, { useState } from 'react';
import BaseModal from '../modals/BaseModal';

export default function DynamicFormModal({ open, onClose, schema, onSubmit }) {
  const [formData, setFormData] = useState({});

  const handleChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <BaseModal open={open} onClose={onClose} title="Fill Form">
      <div className="space-y-4">
        {schema.map(field => (
          <div key={field.id}>
            <label className="block text-sm font-medium mb-1">
              {field.label}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                className="w-full border rounded p-2"
                required={field.required}
                onChange={e => handleChange(field.id, e.target.value)}
              />
            ) : (
              <input
                type={field.type}
                className="w-full border rounded p-2"
                required={field.required}
                onChange={e => handleChange(field.id, e.target.value)}
              />
            )}
          </div>
        ))}

        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => onSubmit({ formData })}
        >
          Submit
        </button>
      </div>
    </BaseModal>
  );
}
