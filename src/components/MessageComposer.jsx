import { useEffect, useRef, useState } from 'react'

export default function MessageComposer({ onSend, onTyping, disabled }) {
  const [value, setValue] = useState('')
  const stopTypingRef = useRef(null)

  useEffect(() => () => {
    if (stopTypingRef.current) {
      clearTimeout(stopTypingRef.current)
    }
  }, [])

  const triggerTyping = () => {
    if (!onTyping) return
    onTyping(true)
    if (stopTypingRef.current) {
      clearTimeout(stopTypingRef.current)
    }
    stopTypingRef.current = setTimeout(() => {
      onTyping(false)
    }, 1800)
  }

  const handleChange = (event) => {
    setValue(event.target.value)
    triggerTyping()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
    if (onTyping) {
      onTyping(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <label className="composer-label" htmlFor="message">
        Message
      </label>
      <div className="composer-field">
        <textarea
          id="message"
          name="message"
          rows={2}
          placeholder="Write a message and press Enter..."
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button type="submit" className="primary" disabled={disabled || !value.trim()}>
          Send
        </button>
      </div>
      <p className="composer-hint">Shift + Enter for a new line.</p>
    </form>
  )
}
