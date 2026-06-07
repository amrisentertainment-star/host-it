"use client";

import { useEffect, useState, useRef } from "react";
import { PRIZE_REGISTRY } from "@/lib/prizeRegistry";

type OverlayEvent = {
  type: string;
  user?: string;
  message?: string;
  amount?: number;
  gift?: string;
  timestamp: string;
  id: string;
};

type ChatMessage = {
  id: string;
  user: string;
  message: string;
};

type GiftSound = {
  giftId: string;
  giftName: string;
  audioUrl: string;
};

const DEFAULT_CHAT: ChatMessage[] = [
  { id: "1", user: "rachael", message: "Let's gooooo!" },
  { id: "2", user: "kingston", message: "Banker is sweating 😂" },
  { id: "3", user: "luna", message: "Drop the jackpot!" },
  { id: "4", user: "echo", message: "This overlay is fire 🔥" },
];

export default function OverlayClient({
  username,
}: {
  username: string;
}) {
  const [events, setEvents] = useState<OverlayEvent[]>([]);
  const [currentAlert, setCurrentAlert] = useState<OverlayEvent | null>(null);
  const [players, setPlayers] = useState(0);
  const [gameState, setGameState] = useState("waiting");
  const [latestId, setLatestId] = useState("0");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(DEFAULT_CHAT);
  const [activeEffect, setActiveEffect] = useState<string | null>(null);
  const [giftSounds, setGiftSounds] = useState<GiftSound[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load gift sounds from localStorage on mount
  useEffect(() => {
    const stored = window.localStorage.getItem("giftSounds");
    if (stored) {
      try {
        setGiftSounds(JSON.parse(stored));
      } catch (error) {
        console.error("[Overlay] Failed to parse gift sounds:", error);
      }
    }

    // Initialize audio element
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
    }
  }, []);

  // Play gift sound when a gift event occurs
  useEffect(() => {
    if (currentAlert?.type === "gift" && currentAlert.gift && audioRef.current) {
      // Normalize gift name: match against stored gift sounds
      const matchingSound = giftSounds.find((sound) => {
        // Try exact match first
        if (sound.giftName.toLowerCase() === currentAlert.gift?.toLowerCase()) {
          return true;
        }
        // Try partial match for gift names
        return sound.giftName.toLowerCase().includes(currentAlert.gift?.toLowerCase() || "");
      });

      if (matchingSound) {
        try {
          audioRef.current.src = matchingSound.audioUrl;
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch((error) => {
            console.error("[Overlay] Audio playback failed:", error);
          });
        } catch (error) {
          console.error("[Overlay] Error playing gift sound:", error);
        }
      }
    }
  }, [currentAlert, giftSounds]);

  // Poll for events from the feed
  useEffect(() => {
    const pollEvents = async () => {
      try {
        const response = await fetch(
          `/api/events/feed?username=${username}&sinceId=${latestId}`
        );
        const data = await response.json();

        if (data.events && data.events.length > 0) {
          setLatestId(data.latestId);

          data.events.forEach((event: any) => {
            const overlayEvent: OverlayEvent = {
              type: event.data.type,
              user: event.data.user || event.data.username,
              message: event.data.comment || event.data.gift || event.data.message,
              amount: event.data.amount || event.data.repeatCount || event.data.likes,
              gift: event.data.gift,
              timestamp: event.timestamp,
              id: event.id,
            };

            if (["gift", "like", "follow", "banker-offer"].includes(event.data.type)) {
              setCurrentAlert(overlayEvent);
              setTimeout(() => setCurrentAlert(null), 3000);
              setActiveEffect(event.data.type);
              setTimeout(() => setActiveEffect(null), 3200);
            }

            if (overlayEvent.message) {
              setChatMessages((previous) => [
                {
                  id: `${Date.now()}-${Math.random()}`,
                  user: overlayEvent.user || "viewer",
                  message: String(overlayEvent.message),
                },
                ...previous.slice(0, 5),
              ]);
            }

            setPlayers((prev) => Math.max(prev, (event.data.players as number) || prev));
            if (event.data.type === "game-start") {
              setGameState("playing");
            }
            if (event.data.type === "game-end") {
              setGameState("waiting");
            }

            setEvents((prev) => [overlayEvent, ...prev].slice(0, 12));
          });
        }
      } catch (error) {
        console.error("[Overlay] Poll error:", error);
      }
    };

    const interval = setInterval(pollEvents, 1000);
    pollEvents();

    return () => clearInterval(interval);
  }, [username, latestId]);

  return (
    <main className="w-screen h-screen overflow-hidden bg-transparent text-white">
      {/* Hidden audio element for gift sounds */}
      <audio ref={audioRef} crossOrigin="anonymous" />

      {activeEffect && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          <div className="pointer-events-none absolute inset-0 animate-overlay-flicker" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-10 top-24 text-7xl opacity-90 animate-overlay-pop">✨</div>
            <div className="absolute right-16 top-32 text-8xl opacity-90 animate-overlay-pop delay-150">💖</div>
            <div className="absolute left-1/2 top-10 -translate-x-1/2 text-8xl opacity-80 animate-overlay-pop delay-300">🎉</div>
          </div>
        </div>
      )}

      <div className="absolute inset-x-4 top-4 z-20 flex justify-center sm:inset-x-auto sm:left-10 sm:justify-start">
        <div className="px-6 py-4 rounded-3xl border border-cyan-400/20 bg-black/30 backdrop-blur-2xl shadow-[0_0_40px_rgba(34,211,238,0.15)] min-w-[240px] max-w-[calc(100vw-2rem)]">
          <div className="text-sm text-cyan-300 font-bold tracking-widest">HOST IT!</div>
          <div className="text-3xl font-black mt-1">@{username}</div>
          <div className="text-zinc-400 text-sm mt-2">{gameState === "playing" ? "🔴 LIVE" : "⚪ WAITING"}</div>
          <div className="text-yellow-400 text-lg font-bold mt-3">👥 {players} Players</div>
        </div>
      </div>

      {currentAlert && (
        <div className="absolute inset-x-4 top-[25%] z-20 flex justify-center sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
          <div className="max-w-2xl animate-overlay-bounce rounded-[2rem] border border-white/10 bg-black/60 px-8 py-6 text-center shadow-[0_0_80px_rgba(255,255,255,0.08)] backdrop-blur-3xl">
            {currentAlert.type === "gift" && (
              <div>
                <div className="text-5xl">🎁</div>
                <div className="mt-4 text-3xl font-black text-amber-300">{currentAlert.user}</div>
                <p className="mt-2 text-lg text-slate-200">sent {currentAlert.gift}</p>
                <p className="mt-3 text-4xl font-black text-amber-200">×{currentAlert.amount}</p>
              </div>
            )}
            {currentAlert.type === "like" && (
              <div>
                <div className="text-6xl animate-pulse">❤️</div>
                <div className="mt-4 text-3xl font-black text-red-300">{currentAlert.user} liked!</div>
                <p className="mt-2 text-lg text-slate-200">+{currentAlert.amount} likes</p>
              </div>
            )}
            {currentAlert.type === "follow" && (
              <div>
                <div className="text-6xl">⭐</div>
                <div className="mt-4 text-3xl font-black text-purple-300">{currentAlert.user} followed!</div>
              </div>
            )}
            {currentAlert.type === "banker-offer" && (
              <div>
                <div className="text-5xl">💰</div>
                <div className="mt-4 text-3xl font-black text-cyan-300">{currentAlert.message}</div>
              </div>
            )}
            {currentAlert.type === "game-state" && (
              <div>
                <div className="text-3xl font-black text-cyan-300">{currentAlert.message}</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="absolute bottom-4 right-4 left-4 mx-auto w-auto max-w-[calc(100vw-2rem)] rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_0_60px_rgba(255,255,255,0.08)] backdrop-blur-2xl">
        <div className="text-sm uppercase tracking-[0.2em] text-fuchsia-300 font-bold mb-3">Live feed</div>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {events.length === 0 ? (
            <p className="text-slate-500 text-sm">Waiting for events…</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{event.user || "System"}</span>
                  <span className="text-slate-500">{event.type}</span>
                </div>
                <p className="mt-2">{event.message}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 hidden h-96 w-[320px] flex-col rounded-3xl border border-slate-700 bg-slate-950/90 p-5 shadow-[0_0_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl lg:flex">
        <div className="text-sm uppercase tracking-[0.2em] text-slate-400 font-semibold mb-4">Chat overlay</div>
        <div className="space-y-3 overflow-y-auto">
          {chatMessages.map((chat) => (
            <div key={chat.id} className="rounded-3xl bg-black/60 px-4 py-3 text-sm text-slate-100">
              <p className="font-semibold text-white">@{chat.user}</p>
              <p className="mt-1 text-slate-300">{chat.message}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes overlay-bounce {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -52%) scale(1.03); }
        }
        @keyframes overlay-flicker {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.16; }
        }
        @keyframes overlay-pop {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-14px) scale(1.06); }
        }
        .animate-overlay-bounce {
          animation: overlay-bounce 0.9s ease-in-out infinite;
        }
        .animate-overlay-flicker {
          animation: overlay-flicker 1.8s ease-in-out infinite;
        }
        .animate-overlay-pop {
          animation: overlay-pop 1.2s ease-in-out infinite;
        }
      `}</style>
    </main>
  );
}
