// Yellow callout box from the wireframe (used for limit-check notes,
// backorder consolidation notes, re-approval notices, etc). `tone="success"`
// swaps it to a green confirmation banner (e.g. after a successful confirm).
export default function NoteBanner({ children, icon, tone = 'warning' }) {
  return (
    <div className={`note-banner${tone === 'success' ? ' note-banner-success' : ''}`}>
      <span className="icon">{icon ?? (tone === 'success' ? '✅' : '⚠️')}</span>
      <span>{children}</span>
    </div>
  )
}
