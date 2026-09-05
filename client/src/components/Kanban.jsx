import Badge from './Badge.jsx'

// columns = [{ key, label }], cardsByColumn = { [key]: [card...] }
// card renderer expects card.title, card.meta, card.status(optional)
export default function Kanban({ columns, cardsByColumn, onCardClick }) {
  return (
    <div className="kanban-board">
      {columns.map((col) => {
        const cards = cardsByColumn[col.key] || []
        return (
          <div className="kanban-col" key={col.key}>
            <div className="kanban-col-header">
              <span>{col.label}</span>
              <span className="count">{cards.length}</span>
            </div>
            {cards.map((card) => (
              <div
                className="kanban-card"
                key={card.id}
                onClick={() => onCardClick && onCardClick(card)}
              >
                <div className="kc-title">{card.title}</div>
                <div className="kc-meta">{card.meta}</div>
                {card.status && (
                  <div className="mt-8">
                    <Badge status={card.status}>{card.status}</Badge>
                  </div>
                )}
              </div>
            ))}
            {cards.length === 0 && <div className="muted" style={{ fontSize: 12, padding: '8px 4px' }}>No deals</div>}
          </div>
        )
      })}
    </div>
  )
}
