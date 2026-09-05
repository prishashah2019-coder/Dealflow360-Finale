// Small, dependency-free donut chart. `data` is [{ label, value, color }].
// Renders as a ring (not a filled pie) so a center total can sit inside it,
// plus a legend with each slice's value and share of the total.
const SIZE = 180
const STROKE = 30
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function PieChart({ data = [], title, emptyMessage = 'No data yet.' }) {
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0)

  let offset = 0
  const arcs = total > 0
    ? data.filter((d) => d.value > 0).map((d) => {
      const fraction = d.value / total
      const dash = fraction * CIRCUMFERENCE
      const arc = { ...d, fraction, dashArray: `${dash} ${CIRCUMFERENCE - dash}`, dashOffset: -offset }
      offset += dash
      return arc
    })
    : []

  return (
    <div className="piechart">
      {title && <div className="piechart-title">{title}</div>}
      {total === 0 ? (
        <div className="loading-state">{emptyMessage}</div>
      ) : (
        <div className="piechart-body">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="piechart-svg">
            <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="rgba(111, 101, 89, 0.16)" strokeWidth={STROKE} />
            {arcs.map((arc) => (
              <circle
                key={arc.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={STROKE}
                strokeDasharray={arc.dashArray}
                strokeDashoffset={arc.dashOffset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            ))}
            <text x={SIZE / 2} y={SIZE / 2 - 4} textAnchor="middle" className="piechart-total-value">{total}</text>
            <text x={SIZE / 2} y={SIZE / 2 + 16} textAnchor="middle" className="piechart-total-label">total</text>
          </svg>
          <ul className="piechart-legend">
            {data.map((d) => (
              <li key={d.label}>
                <span className="piechart-swatch" style={{ background: d.color }} />
                <span className="piechart-legend-label">{d.label}</span>
                <span className="piechart-legend-value">{d.value}</span>
                <span className="piechart-legend-pct">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
