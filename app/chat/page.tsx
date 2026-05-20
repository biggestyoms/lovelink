"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Heart, Mic, MicOff, Phone, PhoneOff, Send, Video, VideoOff } from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";

interface Message {
  id: string;
  text: string;
  name: string;
  timestamp: number;
  mine: boolean;
}

type VCState = "idle" | "calling" | "in-call";

export default function ChatPage() {
  const router = useRouter();
  const [myName, setMyName] = useState("");
  const [room, setRoom] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [vcState, setVCState] = useState<VCState>("idle");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Bootstrap
  useEffect(() => {
    const name = sessionStorage.getItem("ll_name");
    const roomCode = sessionStorage.getItem("ll_room");
    if (!name || !roomCode) {
      router.push("/");
      return;
    }
    setMyName(name);
    setRoom(roomCode);

    fetch("/api/socketio").then(() => {
      const socket = io({ path: "/api/socketio", addTrailingSlash: false });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("join-room", { room: roomCode, name });
      });

      socket.on("disconnect", () => setConnected(false));

      socket.on("user-joined", ({ name: pName }: { name: string }) => {
        setPartnerOnline(true);
        setPartnerName(pName);
        addSystemMsg(`${pName} joined 💕`);
      });

      socket.on("user-left", ({ name: pName }: { name: string }) => {
        setPartnerOnline(false);
        addSystemMsg(`${pName} left the room`);
      });

      socket.on("message", ({ text, name: senderName, id, timestamp }: any) => {
        setMessages((prev) => [
          ...prev,
          { id, text, name: senderName, timestamp, mine: false },
        ]);
      });

      socket.on("typing", ({ name: tName, isTyping }: any) => {
        setPartnerName(tName);
        setPartnerTyping(isTyping);
      });

      // WebRTC signaling
      socket.on("vc-offer", async ({ offer }: any) => {
        setVCState("calling");
        const pc = createPeer(socket, roomCode);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("vc-answer", { room: roomCode, answer });
        setVCState("in-call");
      });

      socket.on("vc-answer", async ({ answer }: any) => {
        await peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
        setVCState("in-call");
      });

      socket.on("vc-ice", async ({ candidate }: any) => {
        try {
          await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      });

      socket.on("vc-end", () => {
        endCall(false);
        addSystemMsg("Call ended");
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  const addSystemMsg = (text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, name: "system", timestamp: Date.now(), mine: false },
    ]);
  };

  const sendMessage = () => {
    if (!input.trim() || !socketRef.current) return;
    const msg: Message = {
      id: crypto.randomUUID(),
      text: input.trim(),
      name: myName,
      timestamp: Date.now(),
      mine: true,
    };
    setMessages((prev) => [...prev, msg]);
    socketRef.current.emit("message", { room, ...msg });
    setInput("");
    socketRef.current.emit("typing", { room, name: myName, isTyping: false });
  };

  const handleTyping = (val: string) => {
    setInput(val);
    if (!socketRef.current) return;
    socketRef.current.emit("typing", { room, name: myName, isTyping: val.length > 0 });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("typing", { room, name: myName, isTyping: false });
    }, 2000);
  };

  // WebRTC
  const createPeer = useCallback((socket: Socket, roomCode: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("vc-ice", { room: roomCode, candidate: e.candidate });
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current!));
    }

    return pc;
  }, []);

  const startCall = async () => {
    if (!socketRef.current) return;
    setVCState("calling");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: camOn,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = createPeer(socketRef.current, room);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit("vc-offer", { room, offer });
    } catch (err) {
      console.error("Media error:", err);
      setVCState("idle");
      alert("Couldn't access mic/camera. Check permissions.");
    }
  };

  const endCall = (notify = true) => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (notify && socketRef.current) {
      socketRef.current.emit("vc-end", { room });
      addSystemMsg("You ended the call");
    }
    setVCState("idle");
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !camOn));
    setCamOn(!camOn);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Hidden audio/video elements */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Header */}
      <header className="glass border-b border-white/5 px-5 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-wine to-rose flex items-center justify-center">
            <Heart size={14} className="text-cream fill-cream" />
          </div>
          <div>
            <p className="text-cream text-sm font-medium font-display">{room}</p>
            <div className="flex items-center gap-1.5">
              <div className={clsx("w-1.5 h-1.5 rounded-full", partnerOnline ? "bg-emerald-400 animate-pulse" : "bg-muted/40")} />
              <p className="text-muted text-xs">
                {partnerOnline ? `${partnerName} is here` : "waiting for them..."}
              </p>
            </div>
          </div>
        </div>

        {/* VC controls */}
        <div className="flex items-center gap-2">
          {vcState === "idle" && (
            <button
              onClick={startCall}
              disabled={!partnerOnline}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose/20 border border-rose/30 text-rose text-xs hover:bg-rose/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Phone size={14} />
              <span>call</span>
            </button>
          )}

          {vcState === "calling" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted animate-pulse">connecting...</span>
              <button onClick={() => endCall()} className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all">
                <PhoneOff size={14} />
              </button>
            </div>
          )}

          {vcState === "in-call" && (
            <div className="flex items-center gap-2">
              <button onClick={toggleMic} className={clsx("p-2 rounded-xl border transition-all", micOn ? "bg-white/5 border-white/10 text-muted hover:text-cream" : "bg-rose/20 border-rose/30 text-rose")}>
                {micOn ? <Mic size={14} /> : <MicOff size={14} />}
              </button>
              <button onClick={toggleCam} className={clsx("p-2 rounded-xl border transition-all", camOn ? "bg-rose/20 border-rose/30 text-rose" : "bg-white/5 border-white/10 text-muted hover:text-cream")}>
                {camOn ? <Video size={14} /> : <VideoOff size={14} />}
              </button>
              <button onClick={() => endCall()} className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all">
                <PhoneOff size={14} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Video area (shown during calls with cam) */}
      {vcState === "in-call" && camOn && (
        <div className="relative h-44 bg-coal/80 border-b border-white/5 flex gap-2 p-3 shrink-0">
          <video ref={remoteVideoRef} autoPlay playsInline className="flex-1 rounded-xl object-cover bg-black" />
          <video ref={localVideoRef} autoPlay playsInline muted className="w-28 rounded-xl object-cover bg-black self-end" />
        </div>
      )}

      {/* Audio only call indicator */}
      {vcState === "in-call" && !camOn && (
        <div className="flex items-center justify-center gap-3 py-3 border-b border-white/5 bg-rose/5 shrink-0">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-8 h-8 rounded-full bg-rose/20 ripple" />
            <div className="absolute w-8 h-8 rounded-full bg-rose/20 ripple-2" />
            <Phone size={14} className="text-rose relative z-10" />
          </div>
          <span className="text-rose text-xs">voice call active</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <Heart size={32} className="text-rose/60" />
            <p className="text-muted text-sm font-display italic">say something sweet...</p>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.name === "system") {
            return (
              <div key={msg.id} className="flex justify-center py-1">
                <span className="text-muted/50 text-xs font-mono">{msg.text}</span>
              </div>
            );
          }

          const showTime = i === 0 || msg.timestamp - messages[i - 1].timestamp > 5 * 60 * 1000;

          return (
            <div key={msg.id}>
              {showTime && (
                <div className="flex justify-center my-3">
                  <span className="text-muted/40 text-xs">{format(msg.timestamp, "h:mm a")}</span>
                </div>
              )}
              <div className={clsx("flex", msg.mine ? "justify-end" : "justify-start")}>
                <div
                  className={clsx(
                    "max-w-xs px-4 py-2.5 text-sm leading-relaxed",
                    msg.mine ? "message-bubble-me text-cream" : "message-bubble-them text-cream/90"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {partnerTyping && (
          <div className="flex justify-start">
            <div className="message-bubble-them px-4 py-3 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-muted/60 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted/60 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted/60 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass border-t border-white/5 px-4 py-4 shrink-0">
        <div className="flex gap-3 items-end">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-rose/40 transition-all">
            <textarea
              value={input}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="type something..."
              rows={1}
              className="w-full bg-transparent text-cream placeholder:text-muted/40 outline-none resize-none text-sm leading-relaxed max-h-32"
              style={{ height: "auto" }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-wine to-rose flex items-center justify-center shrink-0 hover:opacity-90 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100"
          >
            <Send size={15} className="text-cream" />
          </button>
        </div>
        {!connected && (
          <p className="text-rose/60 text-xs mt-2 text-center animate-pulse">reconnecting...</p>
        )}
      </div>
    </div>
  );
}
