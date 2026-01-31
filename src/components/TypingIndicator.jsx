function formatTyping(names) {
  if (names.length === 1) return `${names[0]} is typing...`
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`
  return `${names.slice(0, 2).join(', ')} and ${names.length - 2} others are typing...`
}

export default function TypingIndicator({ names }) {
  if (!names || names.length === 0) return null

  return (
    <div className="typing-indicator">
      <span className="typing-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <p>{formatTyping(names)}</p>
    </div>
  )
}
