import { useState } from 'react'

export default function RoomSwitcher({ rooms, activeRoom, onSwitch }) {
  const initialPreset = rooms.includes(activeRoom) ? activeRoom : rooms[0]
  const initialCustom = rooms.includes(activeRoom) ? '' : activeRoom
  const [preset, setPreset] = useState(initialPreset)
  const [custom, setCustom] = useState(initialCustom)

  const handleSubmit = (event) => {
    event.preventDefault()
    const value = (custom || preset || '').trim()
    if (!value) return
    onSwitch(value)
  }

  return (
    <form className="room-switcher" onSubmit={handleSubmit}>
      <label htmlFor="room-select">Room</label>
      <div className="room-field">
        <select
          id="room-select"
          value={preset}
          onChange={(event) => {
            setPreset(event.target.value)
            setCustom('')
          }}
        >
          {rooms.map((room) => (
            <option key={room} value={room}>
              {room}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="custom-room"
        />
      </div>
      <button type="submit" className="secondary">
        Switch
      </button>
    </form>
  )
}
