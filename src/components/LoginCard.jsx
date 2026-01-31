import { useState } from 'react'

export default function LoginCard({ rooms, defaultName, defaultRoom, onSubmit, keysReady }) {
  const initialRoom = rooms.includes(defaultRoom) ? defaultRoom : rooms[0]
  const [name, setName] = useState(defaultName || '')
  const [selectedRoom, setSelectedRoom] = useState(initialRoom)
  const [customRoom, setCustomRoom] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const roomValue = (customRoom || selectedRoom || '').trim()
    if (!name.trim() || !roomValue) return
    onSubmit({ displayName: name.trim(), room: roomValue })
  }

  return (
    <div className="login">
      <div className="login-card">
        <div>
          <p className="eyebrow">Realtime demo</p>
          <h1>PulseLine Care Chat</h1>
          <p className="muted">
            A PubNub-powered chat workspace for care teams. Set a name, pick a room, and start
            collaborating in real time.
          </p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Display name</span>
            <input
              type="text"
              name="displayName"
              placeholder="e.g. Priya N."
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          <div className="field">
            <span>Choose a room</span>
            <div className="chip-grid">
              {rooms.map((room) => (
                <button
                  key={room}
                  type="button"
                  className={`chip ${selectedRoom === room && !customRoom ? 'chip--active' : ''}`}
                  onClick={() => {
                    setSelectedRoom(room)
                    setCustomRoom('')
                  }}
                >
                  {room}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Or create a new room</span>
            <input
              type="text"
              name="customRoom"
              placeholder="e.g. discharge-planning"
              value={customRoom}
              onChange={(event) => setCustomRoom(event.target.value)}
            />
          </label>
          {!keysReady ? (
            <div className="alert">
              <strong>Missing PubNub keys.</strong>
              <p>Add `VITE_PUBNUB_PUBLISH_KEY` and `VITE_PUBNUB_SUBSCRIBE_KEY` to a `.env` file.</p>
            </div>
          ) : null}
          <button type="submit" className="primary" disabled={!keysReady}>
            Enter workspace
          </button>
        </form>
      </div>
    </div>
  )
}
