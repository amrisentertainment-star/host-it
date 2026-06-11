'use client';

import React, { use, useEffect, useMemo, useState } from "react";

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

  // 1. Replaced process.env with hardcoded string fallback for debugging
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const loadData = async () => {
    // If keys are missing from env, page won't fetch
    if (!SUPABASE_URL || !SUPABASE_KEY) return;

    const headers = { 
      'apikey': SUPABASE_KEY, 
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json' 
    };
    
    try {
      // We fetch rewards and state
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

      // DEBUG: If you see empty arrays in console, the RLS is still blocking
      console.log("Rewards loaded:", rewardData?.length);

      setController(ctrlData?.[0] || null);
      setOpenedBoxes(boxData || []);
      setGiftCatalog(giftData || []);
      
      // Update logic: Only update if we actually got data
      if (Array.isArray(rewardData)) {
        setHiddenRewards(rewardData);
        // SMART BOX GENERATION: Ensure we have the right amount of boxes
        const count = rewardData.length || 22;
        setBoxes(Array.from({ length: count }, (_, i) => `box ${i + 1}`));
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000); // Polling every 3s
    return () => clearInterval(interval);
  }, [sessionid]);

  const remainingRewards = useMemo(() => {
    if (!hiddenRewards.length) return [];
    
    return [...hiddenRewards]
      .sort((a, b) => a.box_name.localeCompare(b.box_name, undefined, { numeric: true }))
      .filter((r) => {
        // Hide reward if it is the player's chosen box
        if (controller?.player_box && r.box_name === controller.player_box) return false;
        // Hide reward if it has been opened
        return !openedBoxes.find((o) => o.opened_box === r.box_name);
      });
  }, [hiddenRewards, openedBoxes, controller]);

  function getRarityStyles(rewardName: string) {
    // Exact match search in catalog
    const gift = giftCatalog.find(g => g.gift_name.toLowerCase() === rewardName.toLowerCase());
    
    if (!gift) return "border-zinc-700 bg-zinc-800/50 text-zinc-400";
    
    const rarity = gift.rarity?.toLowerCase();
    if (rarity === 'legendary') return "border-yellow-500 bg-yellow-500/20 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.3)]";
    if (rarity === 'epic') return "border-purple-500 bg-purple-500/20 text-purple-300";
    if (rarity === 'rare') return "border-blue-500 bg-blue-500/20 text-blue-300";
    
    return "border-cyan-500/50 bg-cyan-500/10 text-cyan-300";
  }

  // Split into two columns for the UI
  const leftRewards = remainingRewards.filter((_, i) => i % 2 === 0);
  const rightRewards = remainingRewards.filter((_, i) => i % 2 !== 0);
  const visibleBoxes = boxes.filter((box) => box !== controller?.player_box);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-4 relative font-sans overflow-hidden">
      {/* Background Effect */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#22d3ee20,transparent_50%)] pointer-events-none" />

      <div className="flex justify-between items-end mb-8 px-4 relative z-10">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">HOST IT!</h1>
          <p className="text-xs font-bold text-zinc-500 tracking-[0.3em] uppercase">Beat The Banker</p>
        </div>
        <p className="text-zinc-300 font-mono text-sm bg-white/5 px-3 py-1 rounded-lg border border-white/10">{sessionid}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 relative z-10">
        {/* SIDEBAR: PRIZES */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[32px] p-6 h-[75vh] flex flex-col shadow-2xl">
          <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6 text-center">Prizes Remaining</h2>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-2">
              {leftRewards.map(r => (
                <div key={r.id} className={`border-2 rounded-xl p-2 text-center text-[10px] font-black transition-all duration-300 ${getRarityStyles(r.reward)}`}>
                  {r.reward.toUpperCase()}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {rightRewards.map(r => (
                <div key={r.id} className={`border-2 rounded-xl p-2 text-center text-[10px] font-black transition-all duration-300 ${getRarityStyles(r.reward)}`}>
                  {r.reward.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
          {remainingRewards.length === 0 && (
            <div className="mt-20 text-center animate-pulse">
               <p className="text-zinc-600 text-[10px] font-bold">WAITING FOR REWARDS...</p>
            </div>
          )}
        </div>

        {/* CENTER: BOARD */}
        <div className="flex flex-col items-center justify-start pt-10">
          <div className="mb-10 bg-gradient-to-b from-yellow-300 to-yellow-600 border-4 border-yellow-200 w-44 h-52 rounded-[40px] flex flex-col items-center justify-center shadow-2xl relative">
              <div className="absolute -top-4 bg-black text-yellow-400 text-[10px] font-black px-4 py-1 rounded-full border border-yellow-400">PLAYER SELECTION</div>
              <span className="text-7xl font-black text-black">{controller?.player_box ? controller.player_box.replace('box ', '') : '?'}</span>
              <span className="text-[10px] font-bold text-black uppercase">Your Box</span>
          </div>

          <div className="grid grid-cols-4 gap-3 w-full max-w-xl">
            {visibleBoxes.map(box => (
              <Box key={box} box={box} openedBoxes={openedBoxes} />
            ))}
          </div>
        </div>

        {/* RIGHT: STATUS */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-[32px] p-8 flex flex-col shadow-2xl">
          <p className="text-[10px] font-black text-cyan-500 uppercase mb-1">Current Contestant</p>
          <h3 className="text-2xl font-black mb-6 truncate text-white">
            {controller?.username ? `@${controller.username}` : 'Waiting...'}
          </h3>
          
          <div className="space-y-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <p className="text-[10px] font-black text-zinc-500 uppercase mb-1">Round</p>
                <p className="text-xl font-black">{controller?.current_round || 1}</p>
            </div>
          </div>

          <div className="bg-yellow-500 rounded-2xl p-6 mt-auto text-center shadow-[0_0_30px_rgba(234,179,8,0.2)]">
            <p className="text-[10px] font-black text-black uppercase mb-1">Banker Offer</p>
            <p className="text-4xl font-black text-black">0</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Box({ box, openedBoxes }: any) {
  const opened = openedBoxes.find((b: any) => b.opened_box === box);
  
  return (
    <div className={`aspect-square rounded-2xl border-4 flex items-center justify-center transition-all duration-500 
      ${opened 
        ? 'bg-zinc-800/80 border-zinc-700 text-zinc-600' 
        : 'bg-gradient-to-b from-yellow-400 to-yellow-600 border-yellow-300 text-black shadow-lg hover:scale-105 active:scale-95 cursor-pointer'
      }`}>
      <span className="font-black text-xl">
        {opened ? 'X' : box.replace('box ', '')}
      </span>
    </div>
  );
}
