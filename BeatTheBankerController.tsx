"use client";

import { useEffect, useState } from "react";

type GamePlayer = {
  id: string;
  username: string;
  score: number;
  status: "active" | "eliminated";
};

export default function BeatTheBankerController({
  username,
}: {
  username: string;
}) {
  const [gamePhase, setGamePhase] = useState("waiting");
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [round, setRound] = useState(0);
  const [bankerOffer, setBankerOffer] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [gameId, setGameId] = useState<string>("");

  useEffect(() => {
    const generatedGameId = `game-${username}-${Date.now()}`;
    setGameId(generatedGameId);
  }, [username]);

  const startGame = async () => {
    if (totalPlayers < 1) {
      alert("No players yet! Send !join in the chat.");
      return;
    }
    
    await fetch("/api/game/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: "start-game",
        gameId,
        username,
      }),
    });
  };

  const revealOffer = async () => {
    await fetch("/api/game/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: "reveal-offer",
        gameId,
        username,
      }),
    });
  };

  const nextRound = async () => {
    await fetch("/api/game/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: "next-round",
        gameId,
        username,
      }),
    });
  };

  const endGame = async () => {
    await fetch("/api/game/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command: "end-game",
        gameId,
        username,
      }),
    });
  };

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-6xl font-black">
            HOST
            <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-400 bg-clip-text text-transparent">
              {" "}
              IT!
            </span>
          </h1>

          <p className="mt-4 text-2xl text-zinc-400">
            Beat The Banker @ {username}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* GAME CONTROLS */}
          <div className="rounded-3xl border border-cyan-400/20 bg-white/5 p-8">
            <h2 className="text-3xl font-black mb-6">
              Game Controls
            </h2>

            <div className="space-y-4">
              <button
                onClick={startGame}
                disabled={gamePhase !== "waiting"}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-bold disabled:opacity-50 hover:disabled:opacity-50"
              >
                Start Game
              </button>

              <button
                onClick={revealOffer}
                disabled={
                  gamePhase !== "playing" || bankerOffer !== null
                }
                className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Reveal Banker Offer
              </button>

              <button
                onClick={nextRound}
                disabled={gamePhase !== "playing"}
                className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-50"
              >
                Next Round
              </button>

              <button
                onClick={endGame}
                disabled={gamePhase === "waiting" || gamePhase === "ended"}
                className="w-full py-4 rounded-2xl bg-red-500/80 hover:bg-red-600 disabled:opacity-50"
              >
                End Game
              </button>
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-yellow-400/10 border border-yellow-400/30">
              <p className="text-sm text-yellow-300">
                💡 Tip: Viewers type !join to play
              </p>
            </div>
          </div>

          {/* GAME STATE */}
          <div className="rounded-3xl border border-cyan-400/20 bg-white/5 p-8">
            <h2 className="text-3xl font-black mb-6">
              Game State
            </h2>

            <div className="space-y-4 text-zinc-300">
              <div>
                <p className="text-sm text-zinc-500">Status</p>
                <p className="text-2xl font-bold text-cyan-400 capitalize">
                  {gamePhase}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">Round</p>
                <p className="text-2xl font-bold text-fuchsia-400">
                  {round} / 5
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">Players</p>
                <p className="text-2xl font-bold text-green-400">
                  {totalPlayers}
                </p>
              </div>

              <div>
                <p className="text-sm text-zinc-500">Banker Offer</p>
                <p className="text-3xl font-black text-yellow-400">
                  {bankerOffer !== null ? `£${bankerOffer}` : "-"}
                </p>
              </div>
            </div>
          </div>

          {/* LIVE PLAYERS */}
          <div className="rounded-3xl border border-cyan-400/20 bg-white/5 p-8">
            <h2 className="text-3xl font-black mb-6">
              Active Players
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {players.length === 0 ? (
                <p className="text-zinc-500">
                  Waiting for players...
                </p>
              ) : (
                players.map((player) => (
                  <div
                    key={player.id}
                    className="p-3 rounded-2xl bg-white/10 border border-white/5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-white">
                          {player.username}
                        </p>
                        <p className="text-sm text-zinc-400">
                          Status: {player.status}
                        </p>
                      </div>
                      <p className="text-xl font-black text-yellow-400">
                        £{player.score}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 p-6 rounded-2xl bg-blue-400/10 border border-blue-400/30">
          <h3 className="text-xl font-bold text-blue-300 mb-3">
            📋 Game Commands
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-200">
            <div>
              <p className="font-bold">!join</p>
              <p className="text-blue-300">Join the game</p>
            </div>
            <div>
              <p className="font-bold">!box &lt;number&gt;</p>
              <p className="text-blue-300">Choose a box</p>
            </div>
            <div>
              <p className="font-bold">!yes</p>
              <p className="text-blue-300">Accept banker offer</p>
            </div>
            <div>
              <p className="font-bold">!no</p>
              <p className="text-blue-300">Reject banker offer</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
