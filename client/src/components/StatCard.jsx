export default function StatCard({ label, value, accent, sub, icon, onClick }) {
  return (
    <div className={`stat-card${onClick ? ' stat-card-clickable' : ''}`} onClick={onClick} onKeyDown={(event) => event.key === 'Enter' && onClick?.()} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="stat-card-top">
        {icon && <span className={`stat-icon stat-icon-${accent || 'default'}`} aria-hidden="true"><i className={icon} /></span>}
        <span className="stat-label">{label}</span>
      </div>
      <div className={`stat-value${accent ? ` accent-${accent}` : ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
