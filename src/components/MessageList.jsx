import { useEffect, useMemo, useRef } from 'react'

function formatTime(value) {
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function MessageList({ messages, currentUserId }) {
  const listRef = useRef(null)

  const renderedMessages = useMemo(() => messages, [messages])

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [renderedMessages.length])

  return (
    <div className="message-list" ref={listRef}>
      {renderedMessages.length === 0 ? (
        <div className="message-empty">
          <p>No messages yet. Start the conversation.</p>
        </div>
      ) : null}
      {renderedMessages.map((message) => {
        if (message.type === 'system') {
          return (
            <div key={message.id} className="message-system">
              <span>{message.text}</span>
              <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
            </div>
          )
        }

        const isOwn = message.senderId === currentUserId
        return (
          <div
            key={message.id}
            className={`message-bubble ${isOwn ? 'message-bubble--own' : ''}`}
          >
            <div className="message-meta">
              <span className="message-sender">{isOwn ? 'You' : message.senderName}</span>
              <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
            </div>
            <p className="message-text">{message.text}</p>
          </div>
        )
      })}
    </div>
  )
}
