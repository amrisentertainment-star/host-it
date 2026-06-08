'use client';

import React from "react";
import Navbar from "@/components/Navbar";
import GameCard from "@/components/GameCard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 text-sm mb-8">
            TikTok Interactive Streaming Platform
          </div>

          <h1 className="text-7xl md:text-8xl font-black leading-none tracking-tight">
            HOST
            <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-400 bg-clip-text text-transparent">
              {" "}IT!
            </span>
          </h1>

          <p className="text-2xl text-zinc-300 mt-8 leading-relaxed max-w-3xl">
            Build unforgettable TikTok Live experiences with
            interactive games, audience participation, live overlays,
            and premium creator tools.
          </p>

          <div className="flex flex-wrap gap-4 mt-10">
            <a
              href="/login"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-black text-lg hover:scale-105 transition-all text-center"
            >
              Start Hosting
            </a>

            <a
              href="#pricing"
              className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl text-lg hover:bg-white/10 transition-all text-center"
            >
              Pricing
            </a>
          </div>
        </div>
      </section>

      {/* GAMES */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-5xl font-black">Games Library</h2>
            <p className="text-zinc-400 mt-2">Creator-powered live experiences</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          <GameCard
            title="Beat The Banker"
            description="Interactive high-stakes audience game powered by TikTok gifts."
          />
          <GameCard
            title="Bingo Bash"
            description="Eight gift-locked players get a randomized bingo card, with line and full house prizes."
            href="/games/bingo/setup"
          />
          <GameCard
            title="Mystery Drop"
            description="Viewers unlock randomized rewards live on stream."
            locked
          />
          <GameCard
            title="Chaos Wheel"
            description="Spin-based interactive challenge game."
            locked
          />
          <GameCard
            title="Stream Survivor"
            description="Audience elimination battle royale system."
            locked
          />
          <GameCard
            title="Prediction Wars"
            description="Live audience prediction game engine."
            locked
          />
          <GameCard
            title="Battle Arena"
            description="Competitive head-to-head TikTok gameplay."
            locked
          />
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 pb-32">
        <div className="text-center mb-16">
          <h2 className="text-6xl font-black">Pricing</h2>
          <p className="text-zinc-400 mt-4 text-xl">Built for creators serious about audience engagement</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
            <h3 className="text-3xl font-black">Starter</h3>
            <div className="text-5xl font-black mt-6">£9<span className="text-lg text-zinc-400">/mo</span></div>
            <ul className="mt-8 space-y-3 text-zinc-300">
              <li>✓ 1 Game</li>
              <li>✓ Basic Overlays</li>
              <li>✓ TikTok Integration</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-cyan-400/30 bg-cyan-400/10 backdrop-blur-xl p-8 scale-105 shadow-[0_0_60px_rgba(34,211,238,0.2)]">
            <div className="inline-block px-3 py-1 rounded-full bg-cyan-400 text-black font-black text-sm mb-4">MOST POPULAR</div>
            <h3 className="text-3xl font-black">Pro</h3>
            <div className="text-5xl font-black mt-6">£29<span className="text-lg text-zinc-400">/mo</span></div>
            <ul className="mt-8 space-y-3 text-zinc-300">
              <li>✓ All Games</li>
              <li>✓ OBS Overlays</li>
              <li>✓ Full Admin Tools</li>
              <li>✓ Audience Analytics</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8">
            <h3 className="text-3xl font-black">Elite</h3>
            <div className="text-5xl font-black mt-6">£79<span className="text-lg text-zinc-400">/mo</span></div>
            <ul className="mt-8 space-y-3 text-zinc-300">
              <li>✓ Unlimited Games</li>
              <li>✓ Priority Features</li>
              <li>✓ Premium Support</li>
              <li>✓ Future AI Tools</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
