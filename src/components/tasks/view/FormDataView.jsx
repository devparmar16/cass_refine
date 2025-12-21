// FormDataView.jsx - Renders form submission data as a clean form-like display
import React from 'react';

export default function FormDataView({ data }) {
  if (!data || typeof data !== 'object') {
    return <p className="text-gray-500 text-sm">No form data available.</p>;
  }

  // Handle array of form fields or plain object
  const entries = Array.isArray(data) 
    ? data.map(item => [item.label || item.name || 'Field', item.value])
    : Object.entries(data);

  return (
    <div className="space-y-2">
      {entries.map(([key, value], idx) => (
        <div key={idx} className="flex border-b border-gray-100 pb-2">
          <span className="font-medium text-gray-700 w-1/3 text-sm capitalize">
            {String(key).replace(/_/g, ' ')}:
          </span>
          <span className="text-gray-900 w-2/3 text-sm break-words">
            {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-')}
          </span>
        </div>
      ))}
    </div>
  );
}
