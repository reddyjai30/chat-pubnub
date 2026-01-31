import { useMemo } from 'react'

function formatTime(value) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function ActivityFeed({ items }) {
  const list = useMemo(() => items.slice(0, 6), [items])

  return (
    <div className="card">
      <div className="card-header">
        <h3>Activity</h3>
        <span className="count">{items.length}</span>
      </div>
      <div className="activity-list">
        {list.length === 0 ? (
          <p className="muted">Presence events will appear here.</p>
        ) : (
          list.map((item) => (
            <div key={item.id} className="activity-item">
              <p>{item.text}</p>
              <time dateTime={item.createdAt}>{formatTime(item.createdAt)}</time>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
