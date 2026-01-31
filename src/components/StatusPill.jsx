const toneMap = {
  success: 'status--success',
  warn: 'status--warn',
  error: 'status--error',
  offline: 'status--offline',
}

export default function StatusPill({ label, tone = 'offline', detail }) {
  const toneClass = toneMap[tone] || toneMap.offline

  return (
    <div className={`status-pill ${toneClass}`}>
      <span className="status-dot" aria-hidden="true" />
      <div>
        <p className="status-label">{label}</p>
        {detail ? <p className="status-detail">{detail}</p> : null}
      </div>
    </div>
  )
}
