'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Streamer = {
  id: string;
  auth_user_id: string;
  email: string;
  tiktok_username: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [streamer, setStreamer] = useState<Streamer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStreamer = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("streamers")
        .select("*")
        .eq("auth_user_id", user.id)
        .single();

      if (error) console.error("Database query error:", error);
      if (data) setStreamer(data);
      
      setLoading(false);
    };

    loadStreamer();
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-2xl font-black text-cyan-400">INITIALIZING ADMIN...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row items-start justify-between mb-12 gap-6">
          <div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter">
              HOST
              <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-400 bg-clip-text text-transparent ml-3">
                IT!
              </span>
            </h1>
            <p className="mt-4 text-xl md:text-2xl text-zinc-400 font-medium">
              STREAMER ADMIN <span className="text-white">@ {streamer?.tiktok_username || 'unlinked'}</span>
            </p>
          </div>

          <button
            onClick={logout}
            className="px-8 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-red-500/10 hover:border-red-500/20 transition-all font-bold text-sm"
          >
            LOGOUT
          </button>
        </div>

        {/* GAME SELECTION GRID */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* BEAT THE BANKER */}
          <button
            onClick={() => router.push("/games/beat-the-banker/setup")}
            className="group rounded-3xl border border-cyan-400/20 bg-white/5 p-10 hover:bg-white/10 transition-all text-left shadow-[0_0_40px_rgba(34,211,238,0.05)]"
          >
            <h2 className="text-3xl font-black mb-4 group-hover:text-cyan-400 transition-colors">Beat The Banker</h2>
            <p className="text-zinc-400">Configure game settings, gift-triggers, and payouts before launching.</p>
          </button>

          {/* BINGO */}
          <button
            onClick={() => router.push("/games/bingo/setup")}
            className="group rounded-3xl border border-emerald-400/20 bg-white/5 p-10 hover:bg-white/10 transition-all text-left shadow-[0_0_40px_rgba(52,211,153,0.05)]"
          >
            <h2 className="text-3xl font-black mb-4 group-hover:text-emerald-400 transition-colors">Bingo Setup</h2>
            <p className="text-zinc-400">Launch an 8-player gift-lock Bingo session for your viewers.</p>
          </button>

          {/* OVERLAY STUDIO */}
          <button
            onClick={() => router.push("/overlay/studio")}
            className="group rounded-3xl border border-fuchsia-400/20 bg-white/5 p-10 hover:bg-white/10 transition-all text-left shadow-[0_0_40px_rgba(192,38,211,0.15)]"
          >
            <h2 className="text-3xl font-black mb-4 group-hover:text-fuchsia-400 transition-colors">Overlay Studio</h2>
            <p className="text-zinc-400">Open broadcaster controls and source URL for OBS integration.</p>
          </button>
        </div>
      </div>
    </main>
  );
}
