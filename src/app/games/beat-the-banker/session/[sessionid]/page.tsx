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

type TikTokGift = {
  id: number;
  gift_name: string;
  gift_value: number;
  rarity: string;
  active: boolean;
};

// --- MAIN COMPONENT ---
export default function BeatTheBankerSessionPage({
  params,
}: {
  params: Promise<{ sessionid: string }>;
}) {
  const resolvedParams = use(params);
  const sessionid = resolvedParams.sessionid;

  const [controller, setController] = useState<ControlRow | null>(null);
  const [openedBoxes, setOpenedBoxes] = useState<BoxStateRow[]>([]);
  const [hiddenRewards, setHiddenRewards] = useState<RewardRow[]>([]);
  const [boxes, setBoxes] = useState<string[]>([]);
  const [giftCatalog, setGiftCatalog] = useState<TikTokGift[]>([]);
  const [showBanker, setShowBanker] = useState(false);
  const [message, setMessage] = useState("WAITING FOR PLAYER");

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const loadData = async () => {
    const headers = { apikey: SUPABASE_KEY as string, Authorization: `Bearer ${SUPABASE_KEY}` };
    
    // 1. Load dynamic game state
    const [ctrlRes, boxRes, giftRes, rewardRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/game_control?session_id=eq.${sessionid}&order=queue_position.asc`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/mystery_box_state?session_id=eq.${sessionid}`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/tiktok_gifts?active=eq.true`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/mystery_box_rewards?session_id=eq.${sessionid}`, { headers })
    ]);

    const ctrlData = await ctrlRes.json();
    const boxData = await boxRes.json();
    const giftData = await giftRes.json();
    const rewardData = await rewardRes.json();

    setController(ctrlData?.[0] || null);
    setOpenedBoxes(boxData || []);
    setGiftCatalog(giftData || []);
    setHiddenRewards(rewardData || []);

    // 2. SMART BOX GENERATION: Matches the number of rewards in DB
    const count = rewardData?.length || 22;
    setBoxes(Array.from({ length: count }, (_, i) => `box ${i + 1}`));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [sessionid]);

  const remainingRewards = useMemo(() => {
    if (!hiddenRewards.length) return [];
    return [...hiddenRewards]
      .sort((a, b) => a.box_name.localeCompare(b.box_name, undefined, { numeric: true }))
      .filter((r) => {
        if (controller?.player_box && r.box_name === controller.player_box) return false;
        return !openedBoxes.find((o) => o.opened_box === r.box_name);
      });
  }, [hiddenRewards, openedBoxes, controller]);

  function getRarityStyles(reward: string) {
    const gift = giftCatalog.find(g => g.gift_name === reward);
    if (!gift) return "border-zinc-700 bg-zinc-800/50 text-zinc-400";
    if (gift.rarity === 'legendary') return "border-yellow-500 bg-yellow-500/20 text-yellow-300";
    return "border-cyan-500/50 bg-cyan-500/10 text-cyan-300";
  }

  const leftRewards = remainingRewards.filter((_, i) => i % 2 === 0);
  const rightRewards = remainingRewards.filter((_, i) => i % 2 !== 0);
  const visibleBoxes = boxes.filter((box) => box !== controller?.player_box);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-4 relative font-sans">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#22d3ee20,transparent_50%)] pointer-events-none" />

      <div className="flex justify-between items-end mb-8 px-4 relative z-10">
        <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">BEAT THE BANKER</h1>
        <p className="text-zinc-300 font-mono text-sm bg-white/5 px-3 py-1 rounded-lg border border-white/10">{sessionid}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 relative z-10">
        {/* PRIZES */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[32px] p-6 h-[75vh] flex flex-col">
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6 text-center">Prizes Remaining</h2>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto">
            <div className="space-y-2">{leftRewards.map(r => <div key={r.id} className={`border-2 rounded-xl p-2 text-center text-[10px] font-black ${getRarityStyles(r.reward)}`}>{r.reward.toUpperCase()}</div>)}</div>
            <div className="space-y-2">{rightRewards.map(r => <div key={r.id} className={`border-2 rounded-xl p-2 text-center text-[10px] font-black ${getRarityStyles(r.reward)}`}>{r.reward.toUpperCase()}</div>)}</div>
          </div>
        </div>

        {/* BOARD */}
        <div className="flex flex-col items-center">
          <div className="mb-10 bg-gradient-to-b from-yellow-300 to-yellow-600 border-4 border-yellow-200 w-44 h-52 rounded-[40px] flex flex-col items-center justify-center shadow-2xl">
              <span className="text-7xl font-black text-black">{controller?.player_box ? controller.player_box.replace('box ', '') : '?'}</span>
              <span className="text-[10px] font-bold text-black uppercase">Your Box</span>
          </div>
          <div className="grid grid-cols-4 gap-3 w-full max-w-xl">
            {visibleBoxes.map(box => <Box key={box} box={box} openedBoxes={openedBoxes} />)}
          </div>
        </div>

        {/* STATUS */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[32px] p-8 flex flex-col">
          <p className="text-[10px] font-black text-cyan-500 uppercase mb-1">Contestant</p>
          <h3 className="text-2xl font-black mb-6 truncate">@{controller?.username || 'Waiting...'}</h3>
          <div className="bg-yellow-500/10 rounded-2xl p-6 border border-yellow-500/20 mt-auto text-center">
            <p className="text-[10px] font-black text-yellow-500 uppercase mb-1">Banker Offer</p>
            <p className="text-4xl font-black text-yellow-400">0</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Box({ box, openedBoxes }: any) {
  const opened = openedBoxes.find((b: any) => b.opened_box === box);
  return (
    <div className={`aspect-square rounded-2xl border-4 flex items-center justify-center transition-all duration-500 ${opened ? 'bg-zinc-800/80 border-zinc-700 text-zinc-600' : 'bg-gradient-to-b from-yellow-400 to-yellow-600 border-yellow-300 text-black shadow-lg hover:scale-105'}`}>
      <span className="font-black text-xl">{opened ? 'X' : box.replace('box ', '')}</span>
    </div>
  );
}
