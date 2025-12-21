// TableDataView.jsx - Renders table submission data as a proper HTML table
import React from 'react';

export default function TableDataView({ data }) {
  // Handle different data formats
  if (!data) {
    return <p className="text-gray-500 text-sm">No table data available.</p>;
  }

  let rows = [];
  let headers = [];

  if (typeof data === 'string') {
    // Parse CSV string
    const lines = data.trim().split('\n');
    if (lines.length > 0) {
      headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      rows = lines.slice(1).map(line => {
        // Handle CSV with quoted values
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        return values;
      });
    }
  } else if (Array.isArray(data)) {
    if (data.length > 0) {
      // Check if it's array of arrays (row data) or array of objects
      if (Array.isArray(data[0])) {
        // Array of arrays - first row might be headers or data
        // Check if first row looks like headers (all strings, no numbers)
        const firstRowAllStrings = data[0].every(cell => typeof cell === 'string' && isNaN(Number(cell)));
        if (firstRowAllStrings && data.length > 1) {
          headers = data[0].map(h => String(h));
          rows = data.slice(1);
        } else {
          // Generate column headers
          headers = data[0].map((_, idx) => `Column ${idx + 1}`);
          rows = data;
        }
      } else if (typeof data[0] === 'object' && data[0] !== null) {
        // Array of objects
        headers = Object.keys(data[0]);
        rows = data.map(row => headers.map(h => row[h]));
      } else {
        // Array of primitives - single column
        headers = ['Value'];
        rows = data.map(item => [item]);
      }
    }
  } else if (typeof data === 'object') {
    // Single object - show as key-value pairs
    headers = ['Field', 'Value'];
    rows = Object.entries(data).map(([k, v]) => [k, v]);
  }

  if (headers.length === 0 || rows.length === 0) {
    return <p className="text-gray-500 text-sm">No table data to display.</p>;
  }

  // Calculate visible columns (max 3 before scroll)
  const visibleCols = Math.min(headers.length, 3);
  const hasMoreCols = headers.length > 3;
  const hasMoreRows = rows.length > 5;

  return (
    <div className="space-y-2">
      {/* Scroll container - horizontal always if >3 cols, vertical if >5 rows */}
      <div 
        className={`overflow-x-auto ${hasMoreRows ? 'max-h-64 overflow-y-auto' : ''}`}
        style={{ maxWidth: '100%' }}
      >
        <table className="border-collapse border border-gray-300 text-sm" style={{ minWidth: hasMoreCols ? '600px' : 'auto' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-200">
              {headers.map((header, idx) => (
                <th 
                  key={idx} 
                  className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-800 whitespace-nowrap"
                  style={{ minWidth: '120px' }}
                >
                  {String(header).replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {Array.isArray(row) ? (
                  // Row is an array
                  row.map((cell, cellIdx) => (
                    <td 
                      key={cellIdx} 
                      className="border border-gray-300 px-4 py-2 text-gray-900 whitespace-nowrap"
                    >
                      {cell === null || cell === undefined ? '-' : String(cell)}
                    </td>
                  ))
                ) : (
                  // Row is an object (fallback)
                  headers.map((header, cellIdx) => (
                    <td 
                      key={cellIdx} 
                      className="border border-gray-300 px-4 py-2 text-gray-900 whitespace-nowrap"
                    >
                      {row[header] === null || row[header] === undefined ? '-' : String(row[header])}
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Info footer */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{rows.length} row(s) × {headers.length} column(s)</span>
        {(hasMoreCols || hasMoreRows) && (
          <span className="text-blue-600">
            {hasMoreCols && '← Scroll horizontally →'}
            {hasMoreCols && hasMoreRows && ' | '}
            {hasMoreRows && '↑ Scroll vertically ↓'}
          </span>
        )}
      </div>
    </div>
  );
}
