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

export default function BeatTheBankerSessionPage({
  params,
}: {
  params: Promise<{ sessionid: string }>;
}) {
  const resolvedParams = use(params);
  const sessionid = resolvedParams.sessionid;

  // --- STATES ---
  const [controller, setController] = useState<ControlRow | null>(null);
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

  // --- REFS ---
  const bankerAudio = useRef<HTMLAudioElement | null>(null);
  const openAudio = useRef<HTMLAudioElement | null>(null);
  const jackpotAudio = useRef<HTMLAudioElement | null>(null);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // --- DATA FETCHERS ---
  const loadInitialData = async () => {
    const headers = { apikey: SUPABASE_KEY as string, Authorization: `Bearer ${SUPABASE_KEY}` };
    
    // Load Settings
    const sRes = await fetch(`${SUPABASE_URL}/rest/v1/streamer_game_settings?session_id=eq.${sessionid}&limit=1`, { headers });
    const sData = await sRes.json();
    if (sData?.length) setSettings(sData[0]);

    // Load Catalog
    const cRes = await fetch(`${SUPABASE_URL}/rest/v1/tiktok_gifts?active=eq.true`, { headers });
    setGiftCatalog(await cRes.json());

    // Load Rewards
    const rRes = await fetch(`${SUPABASE_URL}/rest/v1/mystery_box_rewards?session_id=eq.${sessionid}`, { headers });
    setHiddenRewards(await rRes.json());
    
    // Load Game Config (Boxes)
    const confRes = await fetch(`${SUPABASE_URL}/rest/v1/game_config?session_id=eq.${sessionid}`, { headers });
    const confData = await confRes.json();
    const count = confData?.[0]?.box_count || 22;
    setBoxes(Array.from({ length: count }, (_, i) => `box ${i + 1}`));
  };

  const pollDynamicData = async () => {
    const headers = { apikey: SUPABASE_KEY as string, Authorization: `Bearer ${SUPABASE_KEY}` };
    
    const [ctrlRes, boxRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/game_control?session_id=eq.${sessionid}&order=queue_position.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/mystery_box_state?session_id=eq.${sessionid}`, { headers })
    ]);

    setController((await ctrlRes.json())?.[0] || null);
    setOpenedBoxes(await boxRes.json());
  };

  // --- LOGIC ---
  const remainingRewards = useMemo(() => {
    if (!hiddenRewards.length) return [];
    return [...hiddenRewards].sort((a,b) => a.box_name.localeCompare(b.box_name, undefined, {numeric: true})).filter((reward) => {
      if (controller?.player_box && reward.box_name === controller.player_box) return false;
      return !openedBoxes.find((o) => o.opened_box === reward.box_name);
    });
  }, [hiddenRewards, openedBoxes, controller]);

  function calculateBankerOffer() {
    const values = remainingRewards.map((r) => Number(r.reward.replace(/[^\d]/g, ""))).filter((v) => !isNaN(v));
    const total = values.reduce((sum, val) => sum + val, 0);
    const count = remainingRewards.length;
    let mult = count <= 2 ? 0.9 : count <= 5 ? 0.75 : count <= 10 ? 0.5 : 0.2;
    return Math.round(total * mult);
  }

  function getRarityStyles(reward: string) {
    const gift = giftCatalog.find(g => g.gift_name === reward);
    if (!gift) return "border-zinc-700 bg-zinc-800/50 text-zinc-400";
    if (gift.rarity === 'legendary') return "border-yellow-500 bg-yellow-500/20 text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
    if (gift.rarity === 'rare') return "border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-300";
    return "border-cyan-500/50 bg-cyan-500/10 text-cyan-300";
  }

  // --- EFFECTS ---
  useEffect(() => {
    loadInitialData();
    const interval = setInterval(pollDynamicData, 2000);
    return () => clearInterval(interval);
  }, [sessionid]);

  useEffect(() => {
    bankerAudio.current = new Audio("/sounds/banker-phone.mp3");
    openAudio.current = new Audio("/sounds/box-open.mp3");
    jackpotAudio.current = new Audio("/sounds/jackpot.mp3");
  }, []);

  const visibleBoxes = boxes.filter((box) => box !== controller?.player_box);
  const leftRewards = remainingRewards.filter((_, i) => i % 2 === 0);
  const rightRewards = remainingRewards.filter((_, i) => i % 2 !== 0);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-4 overflow-hidden relative font-sans">
      {/* GLOW DECORATION */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#22d3ee20,transparent_50%)] pointer-events-none" />

      {/* OVERLAYS */}
      {bankerCalling && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-in fade-in duration-500">
          <div className="text-center">
            <div className="text-9xl mb-8 animate-bounce">☎️</div>
            <h1 className="text-6xl font-black text-yellow-400 tracking-tighter">BANKER CALLING</h1>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between items-end mb-8 px-4 relative z-10">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            BEAT THE BANKER
          </h1>
          <p className="text-cyan-400 font-bold text-sm tracking-widest uppercase mt-1 opacity-80">{message}</p>
        </div>
        <div className="text-right">
             <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Session ID</p>
             <p className="text-zinc-300 font-mono text-sm bg-white/5 px-3 py-1 rounded-lg border border-white/10 uppercase">{sessionid}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-6 relative z-10">
        
        {/* LEFT: PRIZES */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[32px] p-6 flex flex-col h-[75vh]">
          <h2 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6 text-center">Prizes Remaining</h2>
          <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-2">
              {leftRewards.map(r => (
                <div key={r.id} className={`border-2 rounded-xl py-3 px-2 text-center text-[10px] font-black transition-all ${getRarityStyles(r.reward)}`}>
                  {r.reward.toUpperCase()}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {rightRewards.map(r => (
                <div key={r.id} className={`border-2 rounded-xl py-3 px-2 text-center text-[10px] font-black transition-all ${getRarityStyles(r.reward)}`}>
                  {r.reward.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: BOARD */}
        <div className="flex flex-col items-center">
          {/* PLAYER BOX */}
          <div className="mb-10 text-center relative group">
            <div className="absolute -inset-4 bg-yellow-500/20 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-all" />
            <div className="relative bg-gradient-to-b from-yellow-300 to-yellow-600 border-4 border-yellow-200 w-48 h-56 rounded-[40px] flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(234,179,8,0.3)]">
                <span className="text-black/50 font-black text-xs uppercase tracking-tighter">Player Safe</span>
                <span className="text-7xl font-black text-black leading-none my-2">
                    {controller?.player_box ? controller.player_box.replace('box ', '') : '?'}
                </span>
                <div className="bg-black/10 px-4 py-1 rounded-full text-[10px] font-bold text-black uppercase">Secure</div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3 w-full max-w-2xl px-4">
            {visibleBoxes.map(box => (
              <Box key={box} box={box} openedBoxes={openedBoxes} openingBox={openingBox} />
            ))}
          </div>
        </div>

        {/* RIGHT: CONTROLS */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[32px] p-8 flex flex-col gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Current Contestant</p>
            <h3 className="text-3xl font-black text-white truncate">@{controller?.username || 'Waiting...'}</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Round</p>
                <p className="text-3xl font-black text-white">{controller?.current_round || 1}</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-right">
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Left</p>
                <p className="text-3xl font-black text-white">{boxes.length - openedBoxes.length}</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/10 to-transparent rounded-3xl p-6 border border-yellow-500/20 mt-auto">
            <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">Banker Offer</p>
            <p className="text-5xl font-black text-yellow-400">
                {calculateBankerOffer()}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Box({ box, openedBoxes, openingBox }: any) {
  const opened = openedBoxes.find((b: any) => b.opened_box === box);
  const isOpening = openingBox === box;

  return (
    <div className={`
      aspect-square rounded-2xl border-4 flex flex-col items-center justify-center transition-all duration-500
      ${opened 
        ? 'bg-zinc-800/80 border-zinc-700 text-zinc-600 scale-95 opacity-50' 
        : isOpening 
        ? 'bg-cyan-400 border-white scale-110 animate-pulse shadow-[0_0_30px_#22d3ee]' 
        : 'bg-gradient-to-b from-yellow-400 to-yellow-600 border-yellow-300 text-black shadow-lg hover:scale-105 active:scale-95 cursor-pointer'}
    `}>
      <span className={`font-black tracking-tighter ${opened ? 'text-[8px]' : 'text-2xl'}`}>
        {opened ? 'OPENED' : box.replace('box ', '')}
      </span>
    </div>
  );
}
