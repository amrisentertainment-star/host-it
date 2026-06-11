'use client';

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRIZE_REGISTRY } from "@/lib/prizeRegistry";

const DEFAULT_BOX_COUNT = 22;

export default function BeatTheBankerSetupPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [triggerGift, setTriggerGift] = useState("");
  const [jackpotGift, setJackpotGift] = useState("");
  const [prizeBoard, setPrizeBoard] = useState<string[]>(Array(DEFAULT_BOX_COUNT).fill(""));
  const [status, setStatus] = useState("idle");

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  function generateSessionId() {
    return `s-${Math.random().toString(36).slice(2, 10)}`;
  }

  async function saveSetup(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    const sid = sessionId || generateSessionId();

    const headers = {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY as string,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    };

    try {
      // 1. Save Settings
      await fetch(`${SUPABASE_URL}/rest/v1/streamer_game_settings`, {
        method: "POST",
        headers,
        body: JSON.stringify({ session_id: sid, trigger_gift: triggerGift, jackpot_gift: jackpotGift, box_count: DEFAULT_BOX_COUNT })
      });

      // 2. Save Rewards (All 22)
      const rewards = prizeBoard.map((gift, i) => ({
        session_id: sid,
        box_name: `box ${i + 1}`,
        reward: gift || "Rose"
      }));

      await fetch(`${SUPABASE_URL}/rest/v1/mystery_box_rewards`, {
        method: "POST",
        headers,
        body: JSON.stringify(rewards)
      });

      router.push(`/games/beat-the-banker/session/${sid}`);
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-10">
      <div className="max-w-4xl mx-auto bg-white/5 p-10 rounded-[40px] border border-white/10">
        <h1 className="text-4xl font-black text-cyan-400 mb-6">Setup Game Board</h1>
        
        <form onSubmit={saveSetup} className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <input 
              placeholder="Session ID (Optional)" 
              value={sessionId} 
              onChange={e => setSessionId(e.target.value)}
              className="bg-black border border-white/10 p-4 rounded-2xl" 
            />
            <select 
              value={triggerGift}
              onChange={e => setTriggerGift(e.target.value)}
              className="bg-black border border-white/10 p-4 rounded-2xl"
            >
              <option value="">Select Trigger Gift</option>
              {PRIZE_REGISTRY.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-4 gap-3 text-[10px]">
            {prizeBoard.map((p, i) => (
              <select 
                key={i} 
                value={p} 
                onChange={e => {
                  const newBoard = [...prizeBoard];
                  newBoard[i] = e.target.value;
                  setPrizeBoard(newBoard);
                }}
                className="bg-black border border-white/10 p-2 rounded-lg"
              >
                <option value="">Box {i+1}</option>
                {PRIZE_REGISTRY.map(pr => <option key={pr.id} value={pr.name}>{pr.name}</option>)}
              </select>
            ))}
          </div>

          <button className="w-full py-4 bg-cyan-500 text-black font-black rounded-2xl hover:bg-cyan-400 transition-all">
            {status === "saving" ? "SAVING..." : "LAUNCH GAME BOARD"}
          </button>
        </form>
      </div>
    </main>
  );
}
