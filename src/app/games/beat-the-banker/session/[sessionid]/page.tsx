"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";

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
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  const [controller, setController] =
    useState<ControlRow | null>(null);

  const [queue, setQueue] =
    useState<ControlRow[]>([]);

  const [openedBoxes, setOpenedBoxes] =
    useState<BoxStateRow[]>([]);

  const [hiddenRewards, setHiddenRewards] =
    useState<RewardRow[]>([]);

  const [boxes, setBoxes] =
    useState<string[]>([]);

  const [message, setMessage] =
    useState("WAITING FOR PLAYER");

  const [openingBox, setOpeningBox] =
    useState<string | null>(null);

  const [revealedReward, setRevealedReward] =
    useState<string | null>(null);

  const [isRevealing, setIsRevealing] =
    useState(false);

  const [showBanker, setShowBanker] =
    useState(false);

  const [bankerCalling, setBankerCalling] =
    useState(false);

  const [finalReveal, setFinalReveal] =
    useState(false);

  const [finalReward, setFinalReward] =
    useState("");

  const [settings, setSettings] =
    useState<StreamerSettings | null>(null);

  const [giftCatalog, setGiftCatalog] =
    useState<TikTokGift[]>([]);

  const [jackpotExplosion, setJackpotExplosion] =
    useState(false);

  const bankerAudio =
    useRef<HTMLAudioElement | null>(null);

  const openAudio =
    useRef<HTMLAudioElement | null>(null);

  const jackpotAudio =
    useRef<HTMLAudioElement | null>(null);

  const dealAudio =
    useRef<HTMLAudioElement | null>(null);

  const noDealAudio =
    useRef<HTMLAudioElement | null>(null);

  const SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const SUPABASE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  async function loadStreamerSettings() {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/streamer_game_settings?session_id=eq.${sessionId}&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (data?.length) {
      setSettings(data[0]);
    }
  }

  async function loadGiftCatalog() {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tiktok_gifts?active=eq.true&order=gift_value.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    setGiftCatalog(await res.json());
  }

  async function loadGameConfig() {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/game_config?session_id=eq.${sessionId}`,
      {
        headers: {
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();

    if (!data?.length) return;

    const generated: string[] = [];

    for (
      let i = 1;
      i <= data[0].box_count;
      i++
    ) {
      generated.push(`box ${i}`);
    }

    setBoxes(generated);
  }

  async function loadController() {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/game_control?session_id=eq.${sessionId}&order=queue_position.asc`,
      {
        headers: {
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();

    setController(data?.[0] || null);
    setQueue(data || []);
  }

  async function loadBoxes() {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/mystery_box_state?session_id=eq.${sessionId}`,
      {
        headers: {
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    setOpenedBoxes(await res.json());
  }

  async function loadRewards() {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/mystery_box_rewards?session_id=eq.${sessionId}`,
      {
        headers: {
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    setHiddenRewards(await res.json());
  }

  async function markCommandProcessed(
    id: number
  ) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/game_commands?id=eq.${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          processed: true,
        }),
      }
    );
  }

  function currentRoundTarget() {
    if (!controller) return 5;

    return (
      ROUND_TARGETS[
        controller.current_round - 1
      ] || 1
    );
  }

  const remainingRewards = useMemo(() => {
    return hiddenRewards.filter((reward) => {
      if (
        reward.box_name ===
        controller?.player_box
      ) {
        return false;
      }

      return !openedBoxes.find(
        (o) =>
          o.opened_box === reward.box_name
      );
    });
  }, [hiddenRewards, openedBoxes, controller]);

  function calculateBankerOffer() {
    const values = remainingRewards
      .map((r) =>
        Number(r.reward.replace(/[^\d]/g, ""))
      )
      .filter((v) => !isNaN(v));

    const total =
      values.reduce((sum, val) => sum + val, 0);

    const remaining = remainingRewards.length;

    let multiplier = 0.2;

    if (remaining <= 15) multiplier = 0.35;
    if (remaining <= 9) multiplier = 0.55;
    if (remaining <= 5) multiplier = 0.75;
    if (remaining <= 2) multiplier = 0.9;

    return Math.round(total * multiplier);
  }

  function isLegendary(reward: string) {
    const found = giftCatalog.find(
      (g) => g.gift_name === reward
    );

    return found?.rarity === "legendary";
  }

  async function chooseSafeBox(box: string) {
    if (!controller) return;

    await fetch(
      `${SUPABASE_URL}/rest/v1/game_control?id=eq.${controller.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          player_box: box,
          game_state: "opening_boxes",
        }),
      }
    );

    setMessage(`${controller.username} secured ${box}`);

    await loadController();
  }

  async function nextRound() {
    if (!controller) return;

    await fetch(
      `${SUPABASE_URL}/rest/v1/game_control?id=eq.${controller.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          current_round:
            controller.current_round + 1,
          boxes_opened_this_round: 0,
          game_state: "opening_boxes",
        }),
      }
    );

    setShowBanker(false);

    await loadController();
  }

  async function startNextPlayer() {
    if (!controller) return;

    await fetch(
      `${SUPABASE_URL}/rest/v1/game_control?id=eq.${controller.id}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    await fetch(
      `${SUPABASE_URL}/rest/v1/mystery_box_state?session_id=eq.${sessionId}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    setMessage("NEXT PLAYER");

    await loadBoxes();
    await loadController();
  }

  async function takeDeal() {
    dealAudio.current?.play();

    setMessage("DEAL ACCEPTED");

    setTimeout(async () => {
      await startNextPlayer();
    }, 3000);
  }

  async function noDeal() {
    noDealAudio.current?.play();

    setMessage("NO DEAL");

    setShowBanker(false);

    await nextRound();
  }

  async function revealFinalBox() {
    if (!controller) return;

    const safeReward =
      hiddenRewards.find(
        (r) =>
          r.box_name === controller.player_box
      );

    if (!safeReward) return;

    setFinalReward(safeReward.reward);

    setFinalReveal(true);

    setTimeout(async () => {
      await startNextPlayer();
    }, 7000);
  }

  async function openBox(
    command: CommandRow,
    box: string
  ) {
    if (!controller) return;

    const hiddenReward =
      hiddenRewards.find(
        (r) => r.box_name === box
      );

    if (!hiddenReward) return;

    openAudio.current?.play();

    setOpeningBox(box);

    setTimeout(async () => {
      setRevealedReward(hiddenReward.reward);

      setIsRevealing(true);

      if (isLegendary(hiddenReward.reward)) {
        jackpotAudio.current?.play();

        setJackpotExplosion(true);

        setTimeout(() => {
          setJackpotExplosion(false);
        }, 4500);
      }

      await fetch(
        `${SUPABASE_URL}/rest/v1/mystery_box_state`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY as string,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            opened_box: box,
            opened_by: command.username,
            reward: hiddenReward.reward,
          }),
        }
      );

      const openedCount =
        controller.boxes_opened_this_round + 1;

      await fetch(
        `${SUPABASE_URL}/rest/v1/game_control?id=eq.${controller.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY as string,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            boxes_opened_this_round: openedCount,
          }),
        }
      );

      await markCommandProcessed(command.id);

      await loadBoxes();
      await loadController();

      if (
        openedCount >= currentRoundTarget()
      ) {
        if (settings?.banker_enabled !== false) {
          setBankerCalling(true);

          bankerAudio.current?.play();

          setTimeout(() => {
            setBankerCalling(false);
            setShowBanker(true);
          }, 3500);
        }
      }

      setTimeout(() => {
        setOpeningBox(null);
        setIsRevealing(false);
      }, 2200);
    }, 700);
  }

  async function executeCommand(command: CommandRow) {
    if (command.processed) return;

    if (!controller) return;

    if (
      command.username !== controller.username
    ) {
      return;
    }

    const text =
      command.command_text.toLowerCase();

    if (
      controller.game_state ===
      "selecting_safe"
    ) {
      if (text.startsWith("safe ")) {
        const chosen =
          text.replace("safe ", "box ");

        await chooseSafeBox(chosen);

        await markCommandProcessed(command.id);

        return;
      }
    }

    if (
      controller.game_state ===
      "opening_boxes"
    ) {
      if (text.startsWith("open ")) {
        const selected =
          text.replace("open ", "box ");

        await openBox(command, selected);

        return;
      }
    }

    if (showBanker) {
      if (text === "deal") {
        await takeDeal();

        await markCommandProcessed(command.id);

        return;
      }

      if (text === "no deal") {
        if (
          boxes.length - openedBoxes.length <= 2
        ) {
          await revealFinalBox();
        } else {
          await noDeal();
        }

        await markCommandProcessed(command.id);

        return;
      }
    }
  }

  async function resetGame() {
    await fetch(
      `${SUPABASE_URL}/rest/v1/game_control?session_id=eq.${sessionId}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    await fetch(
      `${SUPABASE_URL}/rest/v1/mystery_box_state?session_id=eq.${sessionId}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_KEY as string,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    setMessage("RESET");
  }

  useEffect(() => {
    bankerAudio.current =
      new Audio("/sounds/banker-phone.mp3");

    openAudio.current =
      new Audio("/sounds/box-open.mp3");

    jackpotAudio.current =
      new Audio("/sounds/jackpot.mp3");

    dealAudio.current =
      new Audio("/sounds/deal.mp3");

    noDealAudio.current =
      new Audio("/sounds/no-deal.mp3");
  }, []);

  // Auto-connect TikTok when session loads
  useEffect(() => {
    async function autoConnectSession() {
      try {
        // First load settings to get trigger gift info
        await loadStreamerSettings();
        
        // Auto-start TikTok connector for this session
        const response = await fetch("/api/connectors/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            streamerUsername: "s1lvabull3tgaming", // Default streamer - should come from user profile
            sessionId: sessionId,
            sessionCode: `session-${sessionId}`,
          }),
        });
        
        const data = await response.json();
        if (data.success) {
          console.log(`TikTok connector started for session ${sessionId}`);
        }
      } catch (error) {
        console.error("Failed to auto-connect session:", error);
      }
    }
    
    autoConnectSession();
    
    // Continue with other loads
    loadGiftCatalog();
    loadGameConfig();
    loadController();
    loadBoxes();
    loadRewards();

    const interval = setInterval(async () => {
      await loadController();
      await loadBoxes();

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/game_commands?session_id=eq.${sessionId}&processed=eq.false&order=id.asc`,
        {
          headers: {
            apikey: SUPABASE_KEY as string,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const commands =
        (await res.json()) as CommandRow[];

      for (const command of commands) {
        await executeCommand(command);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [controller, openedBoxes, showBanker]);

  const visibleBoxes = boxes.filter(
    (box) => box !== controller?.player_box
  );

  const leftRewards = remainingRewards.filter(
    (_, index) => index % 2 === 0
  );

  const rightRewards = remainingRewards.filter(
    (_, index) => index % 2 !== 0
  );

  function rarityClass(reward: string) {
    const found = giftCatalog.find(
      (g) => g.gift_name === reward
    );

    if (!found)
      return "border-yellow-600 text-yellow-300 bg-yellow-950/30";

    if (found.rarity === "legendary") {
      return "border-yellow-400 text-yellow-200 bg-yellow-900/40";
    }

    if (found.rarity === "epic") {
      return "border-red-500 text-red-300 bg-red-950/30";
    }

    if (found.rarity === "rare") {
      return "border-cyan-500 text-cyan-300 bg-cyan-950/20";
    }

    return "border-green-600 text-green-300 bg-green-950/20";
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden p-3 relative">
      {/* Background gradient overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,255,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,0,255,0.08),transparent_50%)]" />

      {jackpotExplosion && (
        <div className="fixed inset-0 z-[70] pointer-events-none">

          <div className="absolute inset-0 bg-yellow-400/20 animate-pulse" />

          <div className="absolute inset-0 flex items-center justify-center">

            <div className="w-[500px] h-[500px] rounded-full bg-yellow-300/20 blur-3xl animate-ping" />

          </div>

          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">

            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className="absolute bg-yellow-300 rounded-full animate-bounce"
                style={{
                  width: `${Math.random() * 14 + 6}px`,
                  height: `${Math.random() * 14 + 6}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${
                    Math.random() * 2 + 1
                  }s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {bankerCalling && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">

          <div className="text-center animate-pulse">

            <div className="text-8xl mb-8 animate-bounce">
              ☎️
            </div>

            <h1 className="text-6xl font-black text-yellow-400 tracking-widest">
              BANKER CALLING
            </h1>

          </div>
        </div>
      )}

      {finalReveal && (
        <div className="fixed inset-0 bg-gradient-to-br from-yellow-600/40 to-black z-[60] flex flex-col items-center justify-center">

          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-black animate-pulse" />

          <h1 className="text-7xl font-black text-yellow-300 mb-10 animate-pulse relative z-10">
            FINAL BOX
          </h1>

          <div className="border-[10px] border-yellow-500 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-[40px] px-24 py-16 shadow-[0_0_80px_rgba(250,204,21,0.5)] animate-bounce relative z-10">

            <h2 className="text-8xl font-black text-black">
              {finalReward}
            </h2>

          </div>
        </div>
      )}

      {isRevealing && revealedReward && (
        <div className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center">

          <div className="border-4 border-yellow-500 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-3xl px-24 py-14 animate-pulse shadow-[0_0_60px_rgba(250,204,21,0.6)]">

            <h1 className="text-7xl font-black text-black">
              {revealedReward}
            </h1>

          </div>
        </div>
      )}

      {showBanker && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">

          <div className="bg-gradient-to-br from-slate-800 to-blue-900 border-4 border-yellow-500 rounded-[40px] p-10 w-[620px] text-center shadow-[0_0_60px_rgba(250,204,21,0.4)] animate-pulse">

            <h2 className="text-6xl font-black text-yellow-400 mb-6">
              BANKER OFFER
            </h2>

            <div className="text-7xl font-black text-yellow-300 mb-8">
              {calculateBankerOffer()}
            </div>

            <div className="flex justify-center gap-10 text-3xl font-black">

              <div className="text-green-400 animate-pulse">
                DEAL
              </div>

              <div className="text-red-400 animate-pulse">
                NO DEAL
              </div>

            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex justify-between items-center mb-4 px-2">

        <div>
          <h1 className="text-5xl font-black text-yellow-400 tracking-widest drop-shadow-lg">
            BEAT THE BANKER
          </h1>

          <p className="text-sm text-cyan-300 mt-1 drop-shadow">
            {message}
          </p>
        </div>

        <button
          onClick={resetGame}
          className="border-2 border-red-500 text-red-400 px-4 py-2 text-sm font-bold hover:bg-red-500 hover:text-white transition-all rounded-lg"
        >
          RESET
        </button>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_1fr_320px] gap-4 h-[calc(100vh-120px)]">

        {/* LEFT SECTION - PRIZES REMAINING */}
        <div className="rounded-[24px] border-2 border-cyan-500/40 bg-slate-900/80 backdrop-blur p-6 overflow-hidden flex flex-col">
          <h2 className="text-2xl font-black text-cyan-300 mb-4 uppercase tracking-wide">
            Prizes Remaining
          </h2>
          
          <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <p className="text-xs font-bold text-green-400 uppercase">LOW</p>
              {leftRewards.map((reward) => (
                <div
                  key={reward.id}
                  className={`border-2 rounded-xl px-3 py-2 text-center text-sm font-black transition-all ${rarityClass(
                    reward.reward
                  )}`}
                >
                  {reward.reward}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-red-400 uppercase">HIGH</p>
              {rightRewards.map((reward) => (
                <div
                  key={reward.id}
                  className={`border-2 rounded-xl px-3 py-2 text-center text-sm font-black transition-all ${rarityClass(
                    reward.reward
                  )}`}
                >
                  {reward.reward}
                </div>
              ))}
            </div>
          </div>

          {/* Rarity Legend */}
          <div className="mt-4 pt-4 border-t border-cyan-500/30 text-xs space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-green-300">COMMON</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span className="text-cyan-300">UNCOMMON</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-purple-300">RARE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-red-300">EPIC</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-yellow-300">LEGENDARY</span>
            </div>
          </div>
        </div>

        {/* CENTER SECTION - GAME BOARD */}
        <div className="rounded-[28px] border-2 border-yellow-500/50 bg-gradient-to-br from-slate-800/80 to-blue-900/80 backdrop-blur p-6 flex flex-col">
          
          {/* Contestant Box */}
          <div className="text-center mb-4">
            <p className="text-xl font-bold text-yellow-300 mb-2 uppercase tracking-wide">CONTESTANT BOX</p>
            <div className="relative h-40 mx-auto max-w-[200px]">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1/3 h-2 rounded-full border-2 border-yellow-200 bg-gradient-to-b from-yellow-100 to-yellow-700 z-20" />
              <div className="absolute inset-0 rounded-2xl border-4 border-yellow-300 bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                <div className="text-6xl font-black text-black leading-none">
                  {controller?.player_box?.replace("box ", "") || "?"}
                </div>
                <div className="text-lg font-black text-black mt-2 tracking-wider">SAFE</div>
              </div>
            </div>
          </div>

          {/* Box Grid */}
          <div className="flex-1 grid grid-cols-5 gap-2 overflow-hidden">
            {visibleBoxes.map((box) => (
              <Box
                key={box}
                box={box}
                openedBoxes={openedBoxes}
                openingBox={openingBox}
              />
            ))}
          </div>
        </div>

        {/* RIGHT SECTION - WHO'S PLAYING & GAME STATUS */}
        <div className="rounded-[24px] border-2 border-cyan-500/40 bg-slate-900/80 backdrop-blur p-6 flex flex-col space-y-6">
          
          {/* Current Contestant */}
          <div className="rounded-2xl border border-cyan-500/50 bg-slate-800/50 p-4">
            <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">WHO'S PLAYING</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center">
                <span className="text-white font-black">👤</span>
              </div>
              <div>
                <p className="text-lg font-black text-cyan-300">
                  @{controller?.username || "WAITING"}
                </p>
                <p className="text-xs text-cyan-500 font-bold">CURRENT CONTESTANT</p>
              </div>
            </div>
          </div>

          {/* Game Status */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider">GAME STATUS</p>
            
            <div className="space-y-2">
              <div className="bg-slate-800/50 rounded-lg p-3 border border-purple-500/30">
                <p className="text-xs text-purple-400 font-bold uppercase">ROUND</p>
                <p className="text-3xl font-black text-purple-300">{controller?.current_round || 1}</p>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-3 border border-green-500/30">
                <p className="text-xs text-green-400 font-bold uppercase">BOXES REMAINING</p>
                <p className="text-3xl font-black text-green-300">
                  {boxes.length - openedBoxes.length}
                </p>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-3 border border-yellow-500/30">
                <p className="text-xs text-yellow-400 font-bold uppercase">BANKER OFFER</p>
                <p className="text-3xl font-black text-yellow-300">
                  {calculateBankerOffer()}
                </p>
              </div>
            </div>
          </div>

          {/* Chat Commands */}
          <div className="space-y-2 mt-auto">
            <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">CHAT COMMANDS</p>
            
            <div className="space-y-2">
              <div className="bg-slate-800/50 rounded-lg p-2 border-l-2 border-yellow-500">
                <p className="font-mono text-xs font-bold text-yellow-400">OPEN &lt;BOX #&gt;</p>
                <p className="text-[10px] text-slate-300">Example: OPEN 12</p>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-2 border-l-2 border-cyan-500">
                <p className="font-mono text-xs font-bold text-cyan-400">KEEP &lt;BOX #&gt;</p>
                <p className="text-[10px] text-slate-300">Example: KEEP 7</p>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-2 border-l-2 border-green-500">
                <p className="font-mono text-xs font-bold text-green-400">DEAL</p>
                <p className="text-[10px] text-slate-300">Take the banker's offer</p>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-2 border-l-2 border-red-500">
                <p className="font-mono text-xs font-bold text-red-400">NO DEAL</p>
                <p className="text-[10px] text-slate-300">Decline the offer</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Box({
  box,
  openedBoxes,
  openingBox,
}: {
  box: string;
  openedBoxes: BoxStateRow[];
  openingBox: string | null;
}) {
  const opened = openedBoxes.find(
    (b) => b.opened_box === box
  );

  const isOpening = openingBox === box;

  return (
    <div
      className={`rounded-xl border-4 flex items-center justify-center text-lg font-black transition-all duration-700 shadow-lg ${
        opened
          ? "bg-gradient-to-br from-green-600 to-green-800 border-green-400 text-green-100"
          : "bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-300 text-black hover:scale-105"
      } ${
        isOpening
          ? "scale-110 animate-pulse ring-4 ring-yellow-300 rotate-2 shadow-[0_0_20px_rgba(250,204,21,0.6)]"
          : ""
      }`}
    >
      {opened
        ? "✓ OPENED"
        : isOpening
        ? "..."
        : box.toUpperCase().replace("BOX ", "")}
    </div>
  );
}

