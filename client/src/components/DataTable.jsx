import { cloneElement, isValidElement } from 'react'
import { usePageSearch } from '../context/PageSearchContext.jsx'

function highlightMatches(value, query) {
  if (!query) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value)
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'))
    return parts.map((part, index) => (
      part.toLowerCase() === query ? <mark key={`${part}-${index}`}>{part}</mark> : part
    ))
  }
  if (Array.isArray(value)) return value.map((child, index) => <span key={index}>{highlightMatches(child, query)}</span>)
  if (isValidElement(value) && value.props.children) {
    return cloneElement(value, { children: highlightMatches(value.props.children, query) })
  }
  return value
}

// Generic table: columns = [{ key, label, render? }], rows = [obj...]
export default function DataTable({ columns, rows, onRowClick, emptyMessage = 'No records yet.' }) {
  const searchQuery = usePageSearch().trim().toLowerCase()
  const visibleRows = searchQuery
    ? rows.filter((row) => JSON.stringify(row).toLowerCase().includes(searchQuery))
    : rows

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
          {visibleRows.length === 0 && (
            <tr className="empty-row">
              <td colSpan={columns.length}>{searchQuery ? 'No matching records.' : emptyMessage}</td>
            </tr>
          )}
          {visibleRows.map((row, idx) => (
            <tr
              key={row._id || row.id || idx}
              className={onRowClick ? 'row-link' : ''}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => {
                const content = col.render ? col.render(row) : row[col.key]
                return <td key={col.key}>{highlightMatches(content, searchQuery)}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
