// Generic table: columns = [{ key, label, render? }], rows = [obj...]
export default function DataTable({ columns, rows, onRowClick, emptyMessage = 'No records yet.' }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="empty-row">
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          )}
          {rows.map((row, idx) => (
            <tr
              key={row._id || row.id || idx}
              className={onRowClick ? 'row-link' : ''}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
