'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.push("/dashboard");
          return;
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setCheckingSession(false);
      }
    };
    checkUser();
  }, [router]);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  const signUp = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { tiktok_username: tiktokUsername },
        },
      });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      const user = data.user;
      if (!user) {
        alert("No user returned");
        setLoading(false);
        return;
      }

      const { error: streamerError } = await supabase
        .from("streamers")
        .insert({
          auth_user_id: user.id,
          email,
          tiktok_username: tiktokUsername,
        });

      if (streamerError) {
        alert(streamerError.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Signup failed");
    }
    setLoading(false);
  };

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-2xl text-zinc-500 animate-pulse">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-cyan-400/20 bg-white/5 backdrop-blur-2xl p-10 shadow-[0_0_60px_rgba(34,211,238,0.15)]">
        <h1 className="text-5xl font-black mb-2">
          HOST
          <span className="bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-400 bg-clip-text text-transparent">
            {" "}IT!
          </span>
        </h1>
        <p className="text-zinc-400 mb-8">Streamer Control Platform</p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="TikTok Username"
            value={tiktokUsername}
            onChange={(e) => setTiktokUsername(e.target.value)}
            className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 outline-none focus:border-cyan-400 transition-all"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 outline-none focus:border-cyan-400 transition-all"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 outline-none focus:border-cyan-400 transition-all"
          />

          <button
            onClick={signIn}
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-black font-bold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <button
            onClick={signUp}
            disabled={loading}
            className="w-full py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
          >
            Create Account
          </button>
        </div>
      </div>
    </main>
  );
}
        
