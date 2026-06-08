"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRIZE_REGISTRY } from "@/lib/prizeRegistry";

type TikTokGift = {
  id: number;
  gift_name: string;
  gift_value: number;
  rarity: string;
  active: boolean;
  weight: number;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const DEFAULT_BOX_COUNT = 22;

function generateSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }

  return `s-${Math.random().toString(36).slice(2, 10)}`;
}

export default function BeatTheBankerSetupPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState("");
  const [giftCatalog, setGiftCatalog] = useState(PRIZE_REGISTRY.filter(p => p.enabled));
  const [triggerGift, setTriggerGift] = useState("");
  const [jackpotGift, setJackpotGift] = useState("");
  const [boxCount, setBoxCount] = useState(DEFAULT_BOX_COUNT);
  const [prizeBoard, setPrizeBoard] = useState<string[]>(
    Array(DEFAULT_BOX_COUNT).fill("")
  );
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const sortedGiftCatalog = useMemo(() => {
    return [...giftCatalog].sort((a, b) => a.value - b.value);
  }, [giftCatalog]);

  // Helper to normalize gift names for matching
  const normalizeGiftName = (name: string) => {
    return name.toLowerCase().replace(/[\s-]/g, '');
  };

  useEffect(() => {
    if (sessionId) {
      loadExistingSetup(sessionId);
    } else {
      setIsLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function loadExistingSetup(id: string) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      setError("Missing Supabase environment variables.");
      return;
    }

    try {
      const settingsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/streamer_game_settings?session_id=eq.${id}&limit=1`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const settingsData = await settingsRes.json();
      const settings = settingsData?.[0];

      if (settings) {
        setTriggerGift(settings.trigger_gift || "");
        setJackpotGift(settings.jackpot_gift || "");
        setBoxCount(settings.box_count || DEFAULT_BOX_COUNT);
      }

      const rewardsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/mystery_box_rewards?session_id=eq.${id}&order=box_name.asc`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const rewardsData = await rewardsRes.json();
      if (Array.isArray(rewardsData) && rewardsData.length) {
        const loadedRewards = Array(DEFAULT_BOX_COUNT).fill("");
        rewardsData.forEach((reward: any) => {
          const match = reward.box_name?.match(/box\s*(\d+)/i);
          const index = match ? Number(match[1]) - 1 : -1;
          if (index >= 0 && index < loadedRewards.length) {
            loadedRewards[index] = reward.reward;
          }
        });
        setPrizeBoard(loadedRewards);
      }
    } catch (err) {
      setError("Unable to load existing setup.");
    } finally {
      setIsLoaded(true);
    }
  }

  function updatePrize(index: number, value: string) {
    setPrizeBoard((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  }

  async function saveSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      setError("Missing Supabase environment variables.");
      return;
    }

    let sid = sessionId;
    if (!sid) {
      sid = generateSessionId();
      setSessionId(sid);
    }

    if (!triggerGift) {
      setError("Select a trigger gift before saving.");
      return;
    }

    setStatus("saving");

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/streamer_game_settings?on_conflict=session_id`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify([
            {
              session_id: sid,
              trigger_gift: triggerGift,
              jackpot_gift: jackpotGift,
              box_count: boxCount,
            },
          ]),
        }
      );

      await fetch(
        `${SUPABASE_URL}/rest/v1/game_config?on_conflict=session_id`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: "return=representation",
          },
          body: JSON.stringify([
            {
              session_id: sid,
              box_count: boxCount,
            },
          ]),
        }
      );

      await fetch(
        `${SUPABASE_URL}/rest/v1/mystery_box_rewards?session_id=eq.${sid}`,
        {
          method: "DELETE",
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const rewardsPayload = prizeBoard.map((gift, index) => ({
        session_id: sid,
        box_name: `box ${index + 1}`,
        reward: gift || "TBD",
      }));

      await fetch(`${SUPABASE_URL}/rest/v1/mystery_box_rewards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: "return=representation",
        },
        body: JSON.stringify(rewardsPayload),
      });

      setStatus("saved");
      router.push(`/games/beat-the-banker/session/${sid}`);
    } catch (err) {
      console.error(err);
      setError("Unable to save setup. Please try again.");
      setStatus("error");
    }
  }

  const giftOptions = sortedGiftCatalog.map((gift) => (
    <option key={gift.id} value={gift.name}>
      {gift.name} — {gift.value} pts
    </option>
  ));

  const canSave = Boolean(triggerGift && prizeBoard.some((gift) => gift));

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl">
          <h1 className="text-5xl font-black tracking-tight text-cyan-300">
            Beat The Banker Setup
          </h1>
          <p className="mt-3 text-slate-300 max-w-3xl">
            Configure the pre-game experience for your TikTok audience. Choose a trigger gift to hand control to the contestant, assign a jackpot gift, and build the full 22-box prize board for Beat The Banker.
          </p>
          <p className="mt-4 text-sm text-slate-400">
            After saving, you can launch the session from the game page and allow viewers to use chat commands like <span className="font-semibold">open box 10</span>, <span className="font-semibold">stay</span>, or <span className="font-semibold">split</span>.
          </p>
        </div>

        <form
          className="grid gap-8"
          onSubmit={saveSetup}
        >
          <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Session ID
                </label>
                <input
                  value={sessionId}
                  onChange={(event) => setSessionId(event.target.value)}
                  placeholder="Enter or generate session id"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setSessionId(generateSessionId())}
                className="rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400 transition"
              >
                Generate ID
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Trigger Gift
                </label>
                <select
                  value={triggerGift}
                  onChange={(event) => setTriggerGift(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500"
                >
                  <option value="">Select the gift that activates contestant control</option>
                  {giftOptions}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Jackpot Gift
                </label>
                <select
                  value={jackpotGift}
                  onChange={(event) => setJackpotGift(event.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-cyan-500"
                >
                  <option value="">Choose a special jackpot gift</option>
                  {giftOptions}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Prize Board Size
                </label>
                <div className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-200">
                  {DEFAULT_BOX_COUNT} boxes
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  The game uses a fixed 22-box prize board for Beat The Banker.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Full Gift Catalog
                </label>
                <div className="rounded-2xl border border-slate-700 bg-slate-900 p-3 text-sm text-slate-300 h-28 overflow-auto">
                  {sortedGiftCatalog.length ? (
                    <ul className="space-y-1">
                      {sortedGiftCatalog.slice(0, 8).map((gift) => (
                        <li key={gift.id}>
                          {gift.name} — {gift.value}
                        </li>
                      ))}
                      {sortedGiftCatalog.length > 8 && (
                        <li className="text-slate-500">
                          + {sortedGiftCatalog.length - 8} more gifts...
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-slate-500">Loading gift catalog...</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-white">
                  Prize Board
                </h2>
                <p className="mt-2 text-slate-400">
                  Select up to {DEFAULT_BOX_COUNT} gifts. These values will be randomly assigned to boxes for the Beat The Banker prize board.
                </p>
              </div>
              <span className="rounded-full bg-cyan-500/20 px-4 py-2 text-sm text-cyan-200">
                {DEFAULT_BOX_COUNT} slots
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {prizeBoard.map((value, index) => (
                <label
                  key={index}
                  className="block rounded-3xl border border-slate-700 bg-slate-950 p-4"
                >
                  <span className="block text-sm font-semibold text-slate-300 mb-2">
                    Box {index + 1}
                  </span>
                  <select
                    value={value}
                    onChange={(event) => updatePrize(index, event.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-3 text-white outline-none focus:border-cyan-500"
                  >
                    <option value="">Pick a gift reward</option>
                    {giftOptions}
                  </select>
                </label>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {status === "error" && (
                <p className="text-sm text-rose-400">{error || "Unable to save setup."}</p>
              )}
              {status === "saved" && (
                <p className="text-sm text-emerald-400">Setup saved. Launching game now...</p>
              )}
            </div>

            <button
              disabled={!canSave || status === "saving"}
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-6 py-4 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "saving" ? "Saving setup..." : "Save and Launch Game"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

