import { useEffect, useMemo, useRef, useState } from 'react'
import PubNub from 'pubnub'
import { v4 as uuidv4 } from 'uuid'
import './App.css'
import LoginCard from './components/LoginCard'
import StatusPill from './components/StatusPill'
import MessageList from './components/MessageList'
import MessageComposer from './components/MessageComposer'
import TypingIndicator from './components/TypingIndicator'
import PresencePanel from './components/PresencePanel'
import RoomSwitcher from './components/RoomSwitcher'
import ActivityFeed from './components/ActivityFeed'
import { fetchDailyTip } from './services/api'

const STORAGE_KEY = 'pulseline-chat-session'
const DEFAULT_ROOMS = ['care-team', 'admissions', 'pharmacy', 'billing', 'support']

const PUBNUB_PUBLISH_KEY = import.meta.env.VITE_PUBNUB_PUBLISH_KEY
const PUBNUB_SUBSCRIBE_KEY = import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY

const STATUS_MAP = {
  PNConnectedCategory: { label: 'Connected', tone: 'success', detail: 'Realtime sync is healthy.' },
  PNNetworkUpCategory: { label: 'Network restored', tone: 'success', detail: 'Connection recovered.' },
  PNNetworkDownCategory: { label: 'Network down', tone: 'error', detail: 'Trying to reconnect...' },
  PNReconnectedCategory: { label: 'Reconnected', tone: 'success', detail: 'Syncing missed updates.' },
  PNReconnectingCategory: { label: 'Reconnecting', tone: 'warn', detail: 'Attempting to reconnect.' },
  PNTimeoutCategory: { label: 'Timeout', tone: 'warn', detail: 'Waiting for network response.' },
  PNDisconnectedCategory: { label: 'Disconnected', tone: 'offline', detail: 'Not connected to PubNub.' },
}

const systemMessage = (text) => ({
  id: uuidv4(),
  type: 'system',
  text,
  createdAt: new Date().toISOString(),
})

const sanitizeRoom = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')

const buildChannel = (room) => `pulseline.${sanitizeRoom(room)}`

const safeParse = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const loadSession = () => {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  const parsed = safeParse(stored)
  if (!parsed?.userId || !parsed?.displayName || !parsed?.room) return null
  return parsed
}

const saveSession = (session) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

const formatPresenceName = (occupant) => {
  if (!occupant) return 'Unknown'
  if (occupant.state && occupant.state.name) return occupant.state.name
  if (occupant.uuid) return occupant.uuid.slice(0, 8)
  return 'Unknown'
}

const normalizeMessage = (payload, timetoken) => {
  if (!payload || payload.type !== 'chat') return null
  return {
    id: payload.id || uuidv4(),
    type: 'chat',
    text: payload.text || '',
    senderId: payload.senderId || 'unknown',
    senderName: payload.senderName || 'Unknown',
    createdAt: payload.createdAt || new Date().toISOString(),
    timetoken: timetoken ? String(timetoken) : undefined,
  }
}

const sortByTimetoken = (messages) =>
  messages
    .slice()
    .sort((a, b) => {
      if (a.timetoken && b.timetoken) {
        if (a.timetoken.length !== b.timetoken.length) {
          return a.timetoken.length - b.timetoken.length
        }
        return a.timetoken.localeCompare(b.timetoken)
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

export default function App() {
  const [session, setSession] = useState(loadSession)
  const [activeRoom, setActiveRoom] = useState(session?.room || DEFAULT_ROOMS[0])
  const [client, setClient] = useState(null)
  const [messages, setMessages] = useState([])
  const [participants, setParticipants] = useState([])
  const [activity, setActivity] = useState([])
  const [typingUsers, setTypingUsers] = useState([])
  const [status, setStatus] = useState({ label: 'Offline', tone: 'offline', detail: 'Add PubNub keys to connect.' })
  const [tip, setTip] = useState(null)
  const [error, setError] = useState('')
  const [loadingHistory, setLoadingHistory] = useState(false)

  const messageIdsRef = useRef(new Set())
  const typingTimeoutsRef = useRef(new Map())
  const participantsRef = useRef(new Map())
  const typingThrottleRef = useRef(0)
  const presenceSupportedRef = useRef(false)

  const userId = session?.userId
  const keysReady = Boolean(PUBNUB_SUBSCRIBE_KEY && PUBNUB_PUBLISH_KEY)
  const channelName = useMemo(() => buildChannel(activeRoom), [activeRoom])

  const upsertParticipant = ({ id, name, isSelf }) => {
    if (!id) return
    const existing = participantsRef.current.get(id)
    if (existing && existing.name === name && existing.isSelf === isSelf) return
    const next = new Map(participantsRef.current)
    next.set(id, { id, name, isSelf })
    participantsRef.current = next
    setParticipants(Array.from(next.values()))
  }

  useEffect(() => {
    let mounted = true
    fetchDailyTip()
      .then((data) => {
        if (mounted) setTip(data)
      })
      .catch(() => {
        if (mounted) {
          setTip({ text: 'Keep messages concise and confirm critical details.', author: 'Care tip' })
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!userId || !keysReady) {
      setClient(null)
      return
    }

    const pubnub = new PubNub({
      publishKey: PUBNUB_PUBLISH_KEY,
      subscribeKey: PUBNUB_SUBSCRIBE_KEY,
      userId,
    })

    setClient(pubnub)

    return () => {
      pubnub.disconnect()
    }
  }, [userId, keysReady])

  useEffect(() => {
    if (!session) return
    setActiveRoom(session.room)
  }, [session])

  useEffect(() => {
    if (!client || !session) return

    let cancelled = false

    const refreshPresence = async () => {
      try {
        const response = await client.hereNow({
          channels: [channelName],
          includeUUIDs: true,
          includeState: true,
        })

        const channel = response.channels[channelName]
        const occupants = channel?.occupants || []
        const nextParticipants = occupants.map((occupant) => ({
          id: occupant.uuid,
          name: formatPresenceName(occupant),
          isSelf: occupant.uuid === session.userId,
        }))

        participantsRef.current = new Map(nextParticipants.map((user) => [user.id, user]))
        if (!cancelled) {
          setParticipants(nextParticipants)
          if (occupants.length > 0) {
            presenceSupportedRef.current = true
          }
        }
      } catch {
        if (!cancelled) setError('Unable to fetch presence. Check your PubNub keys.')
      }
    }

    const listener = {
      message: (event) => {
        const incoming = normalizeMessage(event.message, event.timetoken)
        if (!incoming) return
        if (messageIdsRef.current.has(incoming.id)) return
        messageIdsRef.current.add(incoming.id)
        setMessages((prev) => [...prev, incoming])
        upsertParticipant({
          id: incoming.senderId,
          name: incoming.senderName,
          isSelf: incoming.senderId === session.userId,
        })
        if (!presenceSupportedRef.current) {
          setActivity((prev) =>
            [systemMessage(`${incoming.senderName} sent a message.`), ...prev].slice(0, 8),
          )
        }
      },
      signal: (event) => {
        const payload = event.message
        if (!payload || payload.type !== 'typing') return
        if (payload.senderId === session.userId) return
        const name = payload.senderName || payload.senderId?.slice(0, 8) || 'Someone'

        if (payload.isTyping) {
          const timeout = typingTimeoutsRef.current.get(payload.senderId)
          if (timeout) clearTimeout(timeout)
          typingTimeoutsRef.current.set(
            payload.senderId,
            setTimeout(() => {
              typingTimeoutsRef.current.delete(payload.senderId)
              setTypingUsers((prev) => prev.filter((user) => user.id !== payload.senderId))
            }, 2500),
          )
          setTypingUsers((prev) => {
            if (prev.some((user) => user.id === payload.senderId)) return prev
            return [...prev, { id: payload.senderId, name }]
          })
        } else {
          const timeout = typingTimeoutsRef.current.get(payload.senderId)
          if (timeout) clearTimeout(timeout)
          typingTimeoutsRef.current.delete(payload.senderId)
          setTypingUsers((prev) => prev.filter((user) => user.id !== payload.senderId))
        }
      },
      presence: (event) => {
        const action = event.action
        if (action === 'join' || action === 'leave' || action === 'timeout') {
          presenceSupportedRef.current = true
          const displayName = participantsRef.current.get(event.uuid)?.name || event.uuid?.slice(0, 8)
          const verb = action === 'join' ? 'joined' : action === 'leave' ? 'left' : 'timed out'
          setActivity((prev) => [systemMessage(`${displayName} ${verb} the room.`), ...prev].slice(0, 8))
          refreshPresence()
        }
      },
      status: (event) => {
        const mapped = STATUS_MAP[event.category] || {
          label: event.category?.replace('PN', '').replace('Category', '') || 'Connecting',
          tone: 'warn',
          detail: 'Updating connection status.',
        }
        setStatus(mapped)
        if (event.category === 'PNConnectedCategory' || event.category === 'PNReconnectedCategory') {
          refreshPresence()
        }
      },
    }

    const loadHistory = async () => {
      setLoadingHistory(true)
      try {
        const response = await client.fetchMessages({
          channels: [channelName],
          count: 50,
          includeUUID: true,
        })
        const channelMessages = response.channels?.[channelName] || []
        const normalized = channelMessages
          .map((message) => normalizeMessage(message.message, message.timetoken))
          .filter(Boolean)
        normalized.forEach((message) => messageIdsRef.current.add(message.id))
        if (!cancelled) {
          setMessages(sortByTimetoken(normalized))
          if (!presenceSupportedRef.current && normalized.length > 0) {
            const next = new Map(participantsRef.current)
            normalized.forEach((message) => {
              if (!message.senderId) return
              next.set(message.senderId, {
                id: message.senderId,
                name: message.senderName,
                isSelf: message.senderId === session.userId,
              })
            })
            participantsRef.current = next
            setParticipants(Array.from(next.values()))
          }
        }
      } catch {
        if (!cancelled) setError('Unable to load message history.')
      } finally {
        if (!cancelled) setLoadingHistory(false)
      }
    }

    setMessages([])
    setActivity([])
    setParticipants([])
    setTypingUsers([])
    setError('')
    messageIdsRef.current = new Set()
    typingTimeoutsRef.current = new Map()
    participantsRef.current = new Map()
    presenceSupportedRef.current = false
    setStatus({ label: 'Connecting', tone: 'warn', detail: 'Joining the channel...' })

    client.addListener(listener)
    client.subscribe({ channels: [channelName], withPresence: true })
    client.setState({ channels: [channelName], state: { name: session.displayName, role: 'member' } })
    const presenceTimer = setTimeout(refreshPresence, 800)

    loadHistory()
    refreshPresence()

    return () => {
      cancelled = true
      clearTimeout(presenceTimer)
      client.removeListener(listener)
      client.unsubscribe({ channels: [channelName] })
    }
  }, [client, channelName, session])

  const handleLogin = ({ displayName, room }) => {
    const nextSession = {
      userId: session?.userId || uuidv4(),
      displayName,
      room: sanitizeRoom(room) || DEFAULT_ROOMS[0],
    }
    setSession(nextSession)
    saveSession(nextSession)
  }

  const handleRoomSwitch = (room) => {
    if (!session) return
    const nextRoom = sanitizeRoom(room)
    const updated = { ...session, room: nextRoom || DEFAULT_ROOMS[0] }
    setSession(updated)
    saveSession(updated)
  }

  const handleLogout = () => {
    setSession(null)
    setClient(null)
    setMessages([])
    setParticipants([])
    setTypingUsers([])
    setActivity([])
    setError('')
    participantsRef.current = new Map()
    presenceSupportedRef.current = false
    localStorage.removeItem(STORAGE_KEY)
  }

  const sendTypingSignal = (isTyping) => {
    if (!client || !session) return
    const now = Date.now()
    if (isTyping && now - typingThrottleRef.current < 500) return
    typingThrottleRef.current = now
    client.signal({
      channel: channelName,
      message: {
        type: 'typing',
        isTyping,
        senderId: session.userId,
        senderName: session.displayName,
      },
    })
  }

  const handleSendMessage = async (text) => {
    if (!client || !session) return
    const payload = {
      id: uuidv4(),
      type: 'chat',
      text,
      senderId: session.userId,
      senderName: session.displayName,
      createdAt: new Date().toISOString(),
    }

    messageIdsRef.current.add(payload.id)
    setMessages((prev) => [...prev, payload])
    upsertParticipant({ id: payload.senderId, name: payload.senderName, isSelf: true })
    if (!presenceSupportedRef.current) {
      setActivity((prev) => [systemMessage(`${payload.senderName} sent a message.`), ...prev].slice(0, 8))
    }

    try {
      await client.publish({ channel: channelName, message: payload })
    } catch {
      setError('Message failed to send. Please retry.')
    }
  }

  if (!session) {
    return (
      <LoginCard
        rooms={DEFAULT_ROOMS}
        defaultName={session?.displayName}
        defaultRoom={session?.room}
        onSubmit={handleLogin}
        keysReady={keysReady}
      />
    )
  }

  const typingNames = typingUsers.map((user) => user.name)

  return (
    <div className="app">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Pub/Sub care chat</p>
          <h2>PulseLine Workspace</h2>
          <p className="muted">Room: {activeRoom}</p>
        </div>
        <div className="top-bar-actions">
          <StatusPill label={status.label} tone={status.tone} detail={status.detail} />
          <button type="button" className="ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="chat-shell">
        <section className="chat-panel">
          <div className="chat-header">
            <div>
              <h3>Conversation feed</h3>
              <p className="muted">{loadingHistory ? 'Loading history...' : 'Live updates enabled'}</p>
            </div>
            <RoomSwitcher key={activeRoom} rooms={DEFAULT_ROOMS} activeRoom={activeRoom} onSwitch={handleRoomSwitch} />
          </div>

          {error ? <div className="alert alert--inline">{error}</div> : null}

          <MessageList messages={messages} currentUserId={session.userId} />
          <TypingIndicator names={typingNames} />
          <MessageComposer onSend={handleSendMessage} onTyping={sendTypingSignal} disabled={!keysReady} />
        </section>

        <aside className="sidebar">
          <PresencePanel participants={participants} />
          <ActivityFeed items={activity} />
          <div className="card">
            <div className="card-header">
              <h3>API Integration</h3>
              <span className="pill">axios</span>
            </div>
            <div className="tip">
              <p>{tip?.text || 'Fetching a team tip...'}</p>
              <span>{tip?.author || ' '}</span>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Security notes</h3>
            </div>
            <ul className="checklist">
              <li>Use TLS + PubNub Access Manager for production.</li>
              <li>Avoid sharing PHI in this demo.</li>
              <li>Audit every message in regulated workflows.</li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  )
}
