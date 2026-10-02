# ShareFast – Lightning-Fast P2P File Transfer

> Transfer files directly between devices at blazing speed. No cloud, no account, no limits.

## Features

- 🚀 **Ultra-fast WebRTC transfers** – 256KB chunks with backpressure control
- 📁 **Multi-file selection** – drag & drop or browse, send/receive multiple files at once
- 📱 **Phone to Phone** – fully mobile-optimized, works in any browser
- 🔢 **6-digit OTP pairing** – simple code-based pairing
- 📷 **QR code pairing** – scan to connect instantly
- ✅ **SHA-256 integrity** – every file is hash-verified
- 📊 **Real-time progress** – per-file and overall speed, ETA, transferred size
- 🎨 **Light/Dark theme** – auto-detects system preference
- 📴 **Offline support** – QR chain encoding for small files, text codes for tiny data
- 🔒 **Privacy-first** – no files ever touch the server, purely peer-to-peer
- ⚡ **PWA installable** – add to home screen on any device

## Quick Start

### Prerequisites
- Node.js 18+

### Install
```bash
npm install
```

### Development
Run both the signaling server and Vite dev server:

```bash
# Terminal 1: Signaling server (port 3001)
npm run dev:server

# Terminal 2: Frontend dev server (port 5173)
npm run dev
```

Or on Unix/macOS:
```bash
npm run dev:all
```

Then open http://localhost:5173

### Production Build
```bash
npm run build
```

This outputs the frontend to `dist/`.

## Architecture

```
ShareFast
├── server/           # WebSocket signaling server (Express + WS)
│   └── index.ts      # Session management, WebSocket relay, rate limiting
├── src/
│   ├── engine/
│   │   ├── TransferEngine.ts   # WebRTC P2P transfer engine
│   │   └── OfflineEngine.ts    # Offline transfer (QR chain, text codes)
│   ├── components/
│   │   └── Header.tsx
│   ├── context/
│   │   └── ThemeContext.tsx     # Dark/light theme
│   ├── pages/
│   │   ├── HomePage.tsx        # Landing with Send/Receive cards
│   │   ├── SendPage.tsx        # Multi-file selection, pairing, progress
│   │   └── ReceivePage.tsx     # Code/QR connect, file accept, download
│   ├── utils.ts                # Formatters, helpers
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css               # Design system
└── public/
    ├── favicon.svg
    └── manifest.webmanifest
```

### How It Works

1. **Sender** selects files → creates a session (6-digit code + session ID)
2. **Receiver** enters code or scans QR → looks up session
3. Both connect via WebSocket to the signaling server
4. WebRTC peer connection is established (STUN for NAT traversal)
5. Files are chunked (256KB) and streamed over a data channel
6. Backpressure prevents buffer overflow for maximum throughput
7. SHA-256 hash verification confirms integrity
8. Session auto-expires after 10 minutes

### Offline Transfer

When no internet is available:
- **QR Chain** (≤100KB): File encoded into sequential QR codes
- **Text Code** (≤2KB): Data encoded as compact text to type manually
- **Local WebRTC**: When on same WiFi Direct / hotspot

## Deployment

### Replit
1. Fork/import the repo
2. Set run command: `npm run build && NODE_ENV=production npx tsx server/index.ts`
3. The server serves the built frontend from `dist/`

### Railway
```bash
# railway.toml
[build]
  builder = "nixpacks"

[deploy]
  startCommand = "npm run build && NODE_ENV=production npx tsx server/index.ts"
```

### Render
- Build command: `npm install && npm run build`
- Start command: `NODE_ENV=production npx tsx server/index.ts`
- Environment: Node

### Docker
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npx", "tsx", "server/index.ts"]
```

### Vercel / Netlify (Frontend only)
Deploy the frontend build (`npm run build` → `dist/`) and host the signaling
server separately on Railway/Render/Fly.io. Update `getApiUrl()` in `src/utils.ts`
to point to your server URL.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Set to `production` to serve frontend from `dist/` |

## Performance

- **Chunk size**: 256KB (maximum reliable WebRTC chunk size)
- **Buffer management**: 16MB high / 4MB low watermarks
- **Speed**: Limited only by network/device; typically 50-200+ MB/s on LAN
- **No file size limit**: Tested with 10GB+ files

## License

MIT
