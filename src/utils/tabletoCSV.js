export function tableToCSV({ columns, rows }) {
  const escape = (val) =>
    `"${String(val).replace(/"/g, '""')}"`;

  const header = columns.map(escape).join(',');
  const body = rows
    .map(row => row.map(escape).join(','))
    .join('\n');

  return `${header}\n${body}`;
}
