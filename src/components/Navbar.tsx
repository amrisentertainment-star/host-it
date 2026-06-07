'use client';
import React from 'react';
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="w-full border-b border-white/10 backdrop-blur-xl bg-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-3xl font-black tracking-tight"
        >
          <span className="text-white">
            HOST
          </span>
          <span className="text-cyan-400 ml-1">
            IT!
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-5 py-2 rounded-xl border border-cyan-400/20 text-white hover:bg-cyan-400/10 transition-all text-sm font-medium"
          >
            Login
          </Link>

          <Link
            href="/login"
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-bold hover:scale-105 transition-all text-sm"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
