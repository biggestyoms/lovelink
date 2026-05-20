"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = () => {
    if (!name.trim() || !room.trim()) return;
    setLoading(true);
    // Store in sessionStorage so components can read it
    sessionStorage.setItem("ll_name", name.trim());
    sessionStorage.setItem("ll_room", room.trim());
    router.push("/chat");
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute w-96 h-96 rounded-full bg-wine/20 blur-3xl -top-20 -left-20 animate-blob" />
      <div className="absolute w-80 h-80 rounded-full bg-rose/10 blur-3xl bottom-10 right-10 animate-blob" style={{ animationDelay: "2s" }} />

      <div className="glass rounded-3xl p-10 w-full max-w-md mx-4 animate-fade-up relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-wine to-rose flex items-center justify-center">
            <Heart size={18} className="text-cream fill-cream" />
          </div>
          <div>
            <h1 className="font-display text-xl text-cream leading-none">LoveLink</h1>
            <p className="text-muted text-xs mt-0.5">just the two of you</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted uppercase tracking-widest mb-2 block">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. babe, love, your name..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream placeholder:text-muted/50 outline-none focus:border-rose/50 focus:bg-white/8 transition-all font-body text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-widest mb-2 block">Room code</label>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="pick a secret room name..."
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream placeholder:text-muted/50 outline-none focus:border-rose/50 transition-all font-body text-sm"
            />
            <p className="text-muted/60 text-xs mt-2">share the same code with your partner to connect</p>
          </div>

          <button
            onClick={handleJoin}
            disabled={!name.trim() || !room.trim() || loading}
            className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-wine to-rose text-cream font-medium text-sm tracking-wide transition-all hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "connecting..." : "enter the room →"}
          </button>
        </div>

        <p className="text-center text-muted/40 text-xs mt-8 font-mono">
          just you two
        </p>
      </div>
    </main>
  );
}
