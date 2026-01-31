# PulseLine PubNub Chat Demo

A polished React + PubNub realtime chat experience built to showcase:
- Pub/Sub messaging with PubNub (publish, subscribe, history)
- Presence + occupancy (who is online)
- Typing indicators with PubNub signals
- REST API integration via axios
- Room switching and state persistence
- A production-ready UI layout and UX flow

## Features
- **Realtime chat** with message history (last 50 messages per room)
- **Presence** panel listing active participants
- **Typing indicators** powered by PubNub signals
- **Connection status** with PubNub status events
- **API integration** card (axios) with configurable endpoint
- **Security reminders** for HIPAA-aligned workflows

## Getting started

### 1) Install dependencies
```bash
npm install
```

### 2) Configure PubNub keys
Create a `.env` file at the project root:
```bash
VITE_PUBNUB_PUBLISH_KEY=your_publish_key
VITE_PUBNUB_SUBSCRIBE_KEY=your_subscribe_key
```

Optional:
```bash
VITE_TIP_API_URL=https://dummyjson.com/quotes/random
```

### 3) Start the dev server
```bash
npm run dev
```

## Demo flow
1. Enter your display name.
2. Pick a room (or create a custom one).
3. Start chatting in realtime.
4. Open a second tab or device to see presence + typing indicators.

## PubNub message payload
Messages are published with this shape:
```json
{
  "id": "uuid",
  "type": "chat",
  "text": "Message body",
  "senderId": "user-id",
  "senderName": "Display name",
  "createdAt": "ISO timestamp"
}
```

## AWS deployment (static hosting)
This project is Vite-based, so it can be deployed to AWS S3 + CloudFront:
1. Build: `npm run build`
2. Upload `dist/` to an S3 bucket configured for static website hosting.
3. Create a CloudFront distribution pointing to the bucket.
4. Configure HTTPS and cache invalidations as needed.

## HIPAA considerations (for real production use)
This demo **must not** be used for PHI. In a production healthcare app you should:
- Ensure a BAA is in place with every vendor.
- Enable PubNub Access Manager (PAM) and audit logging.
- Enforce encryption at rest + in transit.
- Implement user access controls, session timeouts, and audit trails.

## Tech stack
- React + Vite
- PubNub JavaScript SDK
- Axios

## License
MIT
