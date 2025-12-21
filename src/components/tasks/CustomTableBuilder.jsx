import { useState } from 'react';
import { uploadTaskFile } from '@/lib/uploadTaskFile';
import { createTaskSubmission } from '@/lib/taskSubmissions';

// Helper: convert table to CSV
function tableToCSV({ columns, rows }) {
  const header = columns.join(',');
  const body = rows.map(row => row.join(',')).join('\n');
  return `${header}\n${body}`;
}

export default function CustomTableBuilder({ task, role, onCancel, onSubmit }) {
  const [columns, setColumns] = useState(['Column 1']);
  const [rows, setRows] = useState([['']]);
  const [saving, setSaving] = useState(false);

  const addColumn = () => {
    setColumns([...columns, `Column ${columns.length + 1}`]);
    setRows(rows.map(r => [...r, '']));
  };

  const addRow = () => {
    setRows([...rows, Array(columns.length).fill('')]);
  };

  const updateCell = (r, c, value) => {
    const updated = [...rows];
    updated[r][c] = value;
    setRows(updated);
  };

  const submitTable = async () => {
    setSaving(true);

    try {
      // Convert table to CSV
      const csv = tableToCSV({ columns, rows });
      const blob = new Blob([csv], { type: 'text/csv' });
      const file = new File([blob], 'table_data.csv');

      // Upload to storage
      const fileUrl = await uploadTaskFile({
        file,
        role,
        eventId: task.event_id,
        taskId: task.id,
      });

      // Save to task_submissions
      await createTaskSubmission({
        taskId: task.id,
        role,
        data: { columns, rows }, // Also store raw data
        fileUrl,
      });

      if (onSubmit) onSubmit();
    } catch (err) {
      console.error('Table upload error:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-[90%] max-w-4xl">
        <h2 className="text-lg font-semibold mb-4">
          Create Table
        </h2>

        <div className="overflow-x-auto">
          <table className="border w-full">
            <thead>
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="border p-2">
                    <input
                      value={col}
                      onChange={e => {
                        const c = [...columns];
                        c[i] = e.target.value;
                        setColumns(c);
                      }}
                      className="w-full border px-1"
                    />
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border p-1">
                      <input
                        value={cell}
                        onChange={e => updateCell(r, c, e.target.value)}
                        className="w-full border px-1"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={addColumn} className="px-3 py-1 bg-gray-200 rounded">
            + Column
          </button>
          <button onClick={addRow} className="px-3 py-1 bg-gray-200 rounded">
            + Row
          </button>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel}>Cancel</button>
          <button
            onClick={submitTable}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
