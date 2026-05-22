# Videoroom — Multi-User Video Calling Platform

A full-stack video calling platform built with Next.js, MediaSoup, and Socket.io.

## Project Structure

```
videoroom/
├── client/                   # Next.js frontend (port 3000)
├── server/
│   ├── signaling-server/     # MediaSoup + Socket.io (port 4000)
│   ├── recording-server/     # FFmpeg MP4 recording (port 4010)
│   └── streaming-server/     # FFmpeg → YouTube Live (port 8080)
└── README.md
```

## Prerequisites

- Node.js v18 or v20 LTS — https://nodejs.org
- FFmpeg installed and available in PATH
  - Mac: `brew install ffmpeg`
  - Windows: https://ffmpeg.org/download.html
  - Linux: `sudo apt install ffmpeg`

## First Time Setup

Run `npm install` in each folder:

```bash
cd client && npm install
cd ../server/signaling-server && npm install
cd ../recording-server && npm install
cd ../streaming-server && npm install
```

## Running the Project

You need **4 terminals** running simultaneously:

### Terminal 1 — Signaling Server (MediaSoup + Socket.io)
```bash
cd server/signaling-server
node server.js
```
Expected output:
```
Mediasoup worker and router are created successfully!
```

### Terminal 2 — Recording Server (FFmpeg MP4)
```bash
cd server/recording-server
node server.js
```
Expected output:
```
Streaming server running on port 4010
```

### Terminal 3 — Streaming Server (YouTube Live)
```bash
cd server/streaming-server
node server.js
```
Expected output:
```
WebSocket server running on ws://localhost:8080
```
> ⚠️ Update the YouTube RTMP stream key in `server/streaming-server/server.js` before using.

### Terminal 4 — Client (Next.js)
```bash
cd client
npm run dev
```
Expected output:
```
▲ Next.js ready on http://localhost:3000
```

## Ports

| Service           | Port  | Protocol  |
|-------------------|-------|-----------|
| Client (Next.js)  | 3000  | HTTP      |
| Signaling Server  | 4000  | WebSocket |
| Recording Server  | 4010  | WebSocket |
| Streaming Server  | 8080  | WebSocket |

## How It Works

1. **Signaling Server** — handles room creation, peer connections, and routes
   video/audio between users using MediaSoup (WebRTC SFU)
2. **Recording Server** — receives the canvas video stream from the client,
   pipes it through FFmpeg, and saves it as `output.mp4`
3. **Streaming Server** — receives the canvas video stream from the client,
   pipes it through FFmpeg, and pushes it to YouTube Live via RTMP

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | Next.js 15, React 19, Tailwind CSS |
| WebRTC    | MediaSoup 3.15 (server), MediaSoup-client 3.20 (client) |
| Signaling | Socket.io 4                       |
| Recording | FFmpeg via Node.js child_process  |
| Streaming | FFmpeg + YouTube RTMP             |
| Auth      | Google Auth                       |

## Common Issues

### Video not showing
- Make sure signaling server is running on port 4000
- Check browser console for WebSocket errors
- Ensure `mediasoup-client` version matches server (both should be 3.x latest)

### FFmpeg errors
- Verify FFmpeg is installed: `ffmpeg -version`
- Recording server saves `output.mp4` in the `recording-server/` folder

### Port already in use
```bash
# Find and kill process on a port (Mac/Linux)
lsof -ti:4000 | xargs kill
lsof -ti:4010 | xargs kill
lsof -ti:8080 | xargs kill
```

### mediasoup build errors on fresh install
```bash
# Mac/Linux — requires Python and build tools
xcode-select --install   # Mac only
npm install              # retry after
```