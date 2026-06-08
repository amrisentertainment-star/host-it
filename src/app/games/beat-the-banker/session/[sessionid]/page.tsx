'use client';

import React, { use, useEffect, useMemo, useRef, useState } from "react";

// --- TYPES ---
type ControlRow = {
  id: number;
  session_id: string;
  username: string;
  queue_position: number;
  player_box: string | null;
  boxes_opened_this_round: number;
  current_round: number;
  deal_taken: boolean;
  game_state: string;
};

type BoxStateRow = {
  id: number;
  session_id: string;
  opened_box: string;
  opened_by: string;
  reward: string;
};

type RewardRow = {
  id: number;
  session_id: string;
  box_name: string;
  reward: string;
};

type CommandRow = {
  id: number;
  session_id: string;
  username: string;
  command_text: string;
  processed: boolean;
};

type StreamerSettings = {
  trigger_gift: string;
  jackpot_gift: string;
  box_count: number;
  banker_enabled: boolean;
};

type TikTokGift = {
  id: number;
  gift_name: string;
  gift_value: number;
  rarity: string;
  active: boolean;
  weight: number;
};

const ROUND_TARGETS = [5, 4, 3, 2, 1, 1];

// --- MAIN COMPONENT ---
export default function BeatTheBankerSessionPage({
  params,
}: {
  params: Promise<{ sessionid: string }>;
}) {
  // 1. Resolve params (Next.js 15 pattern)
  const resolvedParams = use(params);
  const sessionid = resolvedParams.sessionid;

  // 2. States
  const [controller, setController] = useState<ControlRow | null>(null);
  const [queue, setQueue] = useState<ControlRow[]>([]);
  const [openedBoxes, setOpenedBoxes] = useState<BoxStateRow[]>([]);
  const [hiddenRewards, setHiddenRewards] = useState<RewardRow[]>([]);
  const [boxes, setBoxes] = useState<string[]>([]);
  const [message, setMessage] = useState("WAITING FOR PLAYER");
  const [openingBox, setOpeningBox] = useState<string | null>(null);
  const [revealedReward, setRevealedReward] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showBanker, setShowBanker] = useState(false);
  const [bankerCalling, setBankerCalling] = useState(false);
  const [finalReveal, setFinalReveal] = useState(false);
  const [finalReward, setFinalReward] = useState("");
  const [settings, setSettings] = useState<StreamerSettings | null>(null);
  const [giftCatalog, setGiftCatalog] = useState<TikTokGift[]>([]);
  const [jackpotExplosion, setJackpotExplosion] = useState(false);

  // 3. Audio Refs
  const bankerAudio = useRef<HTMLAudioElement | null>(null);
  const openAudio = useRef<HTMLAudioElement | null>(null);
  const jackpotAudio = useRef<HTMLAudioElement | null>(null);
  const dealAudio = useRef<HTMLAudioElement | null>(null);
  const noDealAudio = useRef<HTMLAudioElement | null>(null);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // --- DATA LOADING FUNCTIONS ---
  async function loadStreamerSettings() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/streamer_game_settings?session_id=eq.${sessionid}&limit=1`, {
        headers: { apikey: SUPABASE_KEY as string, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const data = await res.json();
    if (data?.length) setSettings(data[0]);
  }

  async function loadGiftCatalog() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tiktok_gifts?active=eq.true&order=gift_value.asc`, {
        headers: { apikey: SUPABASE_KEY as string, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    setGiftCatalog(await res.json());
  }

  async function loadGameConfig() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/game_config?session_id=eq.${sessionid}`, {
        headers: { apikey: SUPABASE_KEY as string, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const data = await res.json();
    const count = data?.[0]?.box_count || 22;
    const generated = Array.from({ length: count }, (_, i) => `box ${i + 1}`);
    setBoxes(generated);
  }

  async function loadController() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/game_control?session_id=eq.${sessionid}&order=queue_position.asc`, {
        headers: { apikey: SUPABASE_KEY as string, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const data = await res.json();
    setController(data?.[0] || null);
    setQueue(data || []);
  }

  async function loadBoxes() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/mystery_box_state?session_id=eq.${sessionid}`, {
        headers: { apikey: SUPABASE_KEY as string, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    setOpenedBoxes(await res.json());
  }

  async function loadRewards() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/mystery_box_rewards?session_id=eq.${sessionid}`, {
        headers: { apikey: SUPABASE_KEY as string, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    const data = await res.json();
    setHiddenRewards(data);
  }

  // --- GAME LOGIC ---
  const remainingRewards = useMemo(() => {
    if (!hiddenRewards.length) return [];
    return hiddenRewards.filter((reward) => {
      if (controller?.player_box && reward.box_name === controller.player_box) return false;
      return !openedBoxes.find((o) => o.opened_box === reward.box_name);
    });
  }, [hiddenRewards, openedBoxes, controller]);

  function calculateBankerOffer() {
    const values = remainingRewards.map((r) => Number(r.reward.replace(/[^\d]/g, ""))).filter((v) => !isNaN(v));
    const total = values.reduce((sum, val) => sum + val, 0);
    const remaining = remainingRewards.length;
    let multiplier = remaining <= 2 ? 0.9 : remaining <= 5 ? 0.75 : remaining <= 9 ? 0.55 : 0.2;
    return Math.round(total * multiplier);
  }

  async function resetGame() {
    await fetch(`${SUPABASE_URL}/rest/v1/game_control?session_id=eq.${sessionid}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY as string, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    await fetch(`${SUPABASE_URL}/rest/v1/mystery_box_state?session_id=eq.${sessionid}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY as string, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    setMessage("RESET");
  }

  // --- EFFECTS ---
  useEffect(() => {
    bankerAudio.current = new Audio("/sounds/banker-phone.mp3");
    openAudio.current = new Audio("/sounds/box-open.mp3");
    jackpotAudio.current = new Audio("/sounds/jackpot.mp3");
    dealAudio.current = new Audio("/sounds/deal.mp3");
    noDealAudio.current = new Audio("/sounds/no-deal.mp3");
  }, []);

  useEffect(() => {
    // Initial Load
    loadGameConfig();
    loadRewards();
    loadGiftCatalog();
    loadController();
    loadBoxes();

    const interval = setInterval(() => {
        loadController();
        loadBoxes();
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionid]);

  // --- RENDER HELPERS ---
  const visibleBoxes = boxes.filter((box) => box !== controller?.player_box);
  const leftRewards = remainingRewards.filter((_, index) => index % 2 === 0);
  const rightRewards = remainingRewards.filter((_, index) => index % 2 !== 0);

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6 relative">
       {/* UI Elements (Show Banker, Final Reveal, etc.) */}
       {showBanker && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
            <div className="bg-slate-800 border-4 border-yellow-500 p-10 rounded-3xl text-center">
              <h2 className="text-4xl font-black text-yellow-500 mb-4 tracking-tighter">BANKER OFFER</h2>
              <div className="text-6xl font-black mb-6">{calculateBankerOffer()}</div>
              <div className="flex gap-4 justify-center font-bold">
                <span className="text-green-400">DEAL</span>
                <span className="text-red-400">NO DEAL</span>
              </div>
            </div>
          </div>
       )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-black text-yellow-400 tracking-tighter italic">BEAT THE BANKER</h1>
        <button onClick={resetGame} className="px-4 py-2 border border-red-500 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all text-sm font-bold">RESET</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6">
        {/* PRIZES REMAINING */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h2 className="text-sm font-bold text-zinc-500 uppercase mb-4">Prizes Remaining</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">{leftRewards.map(r => <div key={r.id} className="bg-blue-500/10 border border-blue-500/20 p-2 text-center rounded-lg text-xs font-bold">{r.reward}</div>)}</div>
            <div className="space-y-2">{rightRewards.map(r => <div key={r.id} className="bg-red-500/10 border border-red-500/20 p-2 text-center rounded-lg text-xs font-bold">{r.reward}</div>)}</div>
          </div>
        </div>

        {/* GAME BOARD */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center">
          <div className="mb-8 text-center bg-yellow-400/10 border border-yellow-400/20 p-6 rounded-2xl w-full">
            <p className="text-xs font-bold text-yellow-500 uppercase mb-1">Contestant Box</p>
            <p className="text-4xl font-black text-white">{controller?.player_box || '??'}</p>
          </div>
          <div className="grid grid-cols-5 gap-3 w-full">
            {visibleBoxes.map(box => (
              <Box key={box} box={box} openedBoxes={openedBoxes} openingBox={openingBox} />
            ))}
          </div>
        </div>

        {/* STATUS */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <p className="text-xs font-bold text-zinc-500 uppercase mb-2">Contestant</p>
          <p className="text-xl font-black text-cyan-400 mb-6">@{controller?.username || 'WAITING'}</p>
          
          <div className="space-y-4">
             <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Current Round</p>
                <p className="text-2xl font-black">{controller?.current_round || 1}</p>
             </div>
             <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Offer</p>
                <p className="text-2xl font-black text-yellow-400">{calculateBankerOffer()}</p>
             </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Box({ box, openedBoxes, openingBox }: any) {
  const opened = openedBoxes.find((b: any) => b.opened_box === box);
  return (
    <div className={`h-16 rounded-xl border-2 flex items-center justify-center font-black text-sm transition-all ${opened ? 'bg-zinc-800 border-zinc-700 text-zinc-600' : 'bg-yellow-500 border-yellow-400 text-black shadow-lg shadow-yellow-500/10'}`}>
      {opened ? 'OPEN' : box.replace('box ', '')}
    </div>
  );
}
