"use client";

import { useEffect, useState } from "react";

type BingoPlayer = {
  id: string;
  tiktokUsername: string;
  displayName: string;
  card: number[][];
  lineClaimed: boolean;
  fullHouseClaimed: boolean;
  lockedAt: string;
};

type BingoGameState = {
  id: string;
  streamer: string;
  phase: string;
  players: BingoPlayer[];
  calledNumbers: number[];
  currentNumber: number | null;
  linePrize: string;
  housePrize: string;
  createdAt: string;
  totalPlayers: number;
};

export default function BingoSessionClient({ gameId }: { gameId: string }) {
  const [game, setGame] = useState<BingoGameState | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Loading bingo session...");
  const [controlStatus, setControlStatus] = useState<string>("");

  async function refreshGame() {
    try {
      const res = await fetch(`/api/bingo/state?gameId=${gameId}`);
      const data = await res.json();
      if (res.ok && data.game) {
        setGame(data.game);
        setStatusMessage(
          data.game.phase === "started"
            ? "The caller is live. Keep eyes down!"
            : data.game.phase === "ready"
            ? "Eight players are ready. Start the game when you are ready."
            : data.game.phase === "locked"
            ? `Waiting for ${8 - data.game.totalPlayers} more gifts to lock in.`
            : "Waiting for viewers to gift and lock in Bingo cards."
        );
      }
    } catch (error) {
      setStatusMessage("Unable to load bingo session.");
      console.error(error);
    }
  }

  useEffect(() => {
    refreshGame();
    const interval = setInterval(refreshGame, 2500);
    return () => clearInterval(interval);
  }, [gameId]);

  async function sendCommand(command: string) {
    setControlStatus(`Sending ${command}...`);
    try {
      const res = await fetch(`/api/bingo/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, gameId }),
      });
      const data = await res.json();
      if (res.ok) {
        setControlStatus(`Sent: ${command}`);
        refreshGame();
      } else {
        setControlStatus(`Error: ${data.error || "Unable to send command"}`);
      }
    } catch (error) {
      console.error(error);
      setControlStatus("Failed to send command.");
    }
  }

  function formatCard(card: number[][]) {
    return card.map((row, rowIndex) => (
      <div key={rowIndex} className="grid grid-cols-5 gap-2">
        {row.map((value, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className={`flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950 text-sm font-semibold ${
              value === 0 ? "bg-cyan-500/20 text-cyan-200" : "bg-slate-900 text-white"
            }`}
          >
            {value === 0 ? "FREE" : value}
          </div>
        ))}
      </div>
    ));
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-5xl font-black tracking-tight text-white">Bingo Caller Live</h1>
              <p className="mt-3 text-slate-400 max-w-3xl">
                First 8 gift-lock viewers get a randomized bingo card. Start the game when all 8 are locked in or press eyes down to begin.
              </p>
            </div>
            <div className="rounded-3xl border border-cyan-500/20 bg-black/30 p-4 text-center">
              <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Session ID</p>
              <p className="mt-2 text-2xl font-black text-white">{gameId}</p>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-700 bg-slate-950/90 p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Status</p>
            <p className="mt-2 text-lg text-white">{statusMessage}</p>
            <p className="mt-3 text-sm text-slate-400">
              Viewer gifts lock in unique cards automatically. The caller will draw numbers, and line / full house winners are announced live.
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Players locked in</p>
                  <p className="mt-2 text-4xl font-black text-white">{game?.totalPlayers ?? 0}/8</p>
                </div>
                <div className="rounded-3xl bg-slate-950/70 px-4 py-3 text-sm text-cyan-300">
                  {game?.phase.toUpperCase() ?? "WAITING"}
                </div>
              </div>

              <div className="grid gap-3">
                {game?.players.length ? (
                  game.players.map((player) => (
                    <div key={player.id} className="rounded-3xl border border-white/10 bg-black/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-400">{player.displayName}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{player.tiktokUsername}</p>
                        </div>
                        <div className="text-xs text-slate-400">Locked in</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950/80 p-6 text-center text-slate-500">
                    Waiting for the first gift lock in.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Caller status</p>
                <p className="mt-2 text-3xl font-black text-white">
                  {game?.currentNumber ? `Last called: ${game.currentNumber}` : "No numbers yet"}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-700 bg-black/40 p-4">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Called numbers</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {game?.calledNumbers.length ? (
                    game.calledNumbers.map((number) => (
                      <span key={number} className="rounded-full bg-cyan-500/20 px-3 py-1 text-sm text-cyan-200">
                        {number}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No calls yet.</span>
                  )}
                </div>
              </div>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => sendCommand("eyes-down")}
                  className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition"
                >
                  Eyes Down / Start Game
                </button>
                <button
                  type="button"
                  onClick={() => sendCommand("call-next")}
                  className="rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition"
                >
                  Call Next Number
                </button>
                <button
                  type="button"
                  onClick={() => sendCommand("end-game")}
                  className="rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-400 transition"
                >
                  End Game
                </button>
                {controlStatus && <p className="text-sm text-slate-400">{controlStatus}</p>}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-xl">
          <h2 className="text-3xl font-black text-white">Cards preview</h2>
          <p className="mt-3 text-slate-400">Each gift-locked player gets a fresh randomized card with a free center.</p>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {game?.players.map((player) => (
              <div key={player.id} className="rounded-[2rem] border border-slate-700 bg-black/50 p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xl font-semibold text-white">{player.displayName}</p>
                    <p className="text-sm text-slate-500">@{player.tiktokUsername}</p>
                  </div>
                  <div className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-300">
                    {player.lineClaimed ? "Line claimed" : "Locked"}
                  </div>
                </div>
                <div className="grid gap-2 rounded-3xl border border-slate-700 bg-slate-950/90 p-4">
                  <div className="grid grid-cols-5 gap-2 text-center text-xs uppercase tracking-[0.2em] text-slate-400">
                    <span>B</span>
                    <span>I</span>
                    <span>N</span>
                    <span>G</span>
                    <span>O</span>
                  </div>
                  {formatCard(player.card)}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
