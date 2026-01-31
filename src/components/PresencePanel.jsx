export default function PresencePanel({ participants }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3>People online</h3>
        <span className="count">{participants.length}</span>
      </div>
      <div className="presence-list">
        {participants.length === 0 ? (
          <p className="muted">No active participants yet.</p>
        ) : (
          participants.map((person) => (
            <div key={person.id} className="presence-item">
              <span className={`presence-dot ${person.isSelf ? 'presence-dot--self' : ''}`} />
              <div>
                <p className="presence-name">
                  {person.name}
                  {person.isSelf ? ' (You)' : ''}
                </p>
                <p className="presence-meta">Active now</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
