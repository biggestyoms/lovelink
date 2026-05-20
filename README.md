# 💕 LoveLink

A private real-time chat + voice/video call app built for just two people.

## Features
- **Text chat** — real-time messaging with typing indicators
- **Voice calls** — WebRTC peer-to-peer audio
- **Video calls** — toggle camera on/off mid-call
- **Room system** — share a room code with your partner, no accounts needed
- **Aesthetic** — dark, warm, minimal UI (you can style it however you want)

## Stack
- **Next.js 14** (App Router + Pages Router for socket)
- **Socket.io** for real-time messaging & WebRTC signaling
- **WebRTC** for peer-to-peer voice/video (no server needed for the media itself)
- **Tailwind CSS** for styling

## Setup

```bash
# Install deps
npm install

# Run dev server
npm run dev
```

Then open `http://localhost:3000` in two browser tabs (or on two devices on the same network).
Both people enter a **shared room code** and their name, and they're connected.

## Deploying

Works on **Vercel** out of the box. Just push to GitHub and connect to Vercel.

> ⚠️ **Note on WebRTC for video/voice**: WebRTC works great on localhost and over HTTPS. 
> For production video calls across different networks, you may want to add a TURN server 
> (Twilio offers free STUN/TURN, or use `coturn` self-hosted). 
> Voice-only usually works fine with just the Google STUN server included.

## Customize

- **Colors/fonts** — edit `tailwind.config.js` and `app/globals.css`
- **App name** — change "LoveLink" in `app/layout.tsx` and `app/page.tsx`  
- **Add emoji reactions** — in `app/chat/page.tsx`, extend the message object
- **Add image sharing** — use a file input + upload to Cloudinary/S3 then send the URL as a message
- **Persist messages** — hook up a DB (Planetscale, Supabase, etc.) in the socket events in `lib/socket.ts`

## File Structure

```
lovelink/
├── app/
│   ├── layout.tsx         # root layout
│   ├── page.tsx           # landing / login page
│   ├── globals.css        # styles + fonts
│   └── chat/
│       └── page.tsx       # main chat + vc page
├── lib/
│   ├── socket.ts          # socket.io server setup
│   └── useSocket.ts       # socket hook (unused, integrated inline)
├── pages/
│   └── api/
│       └── socketio.ts    # socket.io API endpoint
└── tailwind.config.js
```
