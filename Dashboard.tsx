"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabaseClient";

type Subscription = {
  id: string;
  status: string;
  price_id?: string;
  current_period_end?: string;
  created_at?: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [activeSubscription, setActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tiktokUsername, setTiktokUsername] = useState<string | null>(null);
  const [connectorStatus, setConnectorStatus] = useState<string>("disconnected");

  const autoConnectTikTok = useCallback(async (username: string, token: string) => {
    try {
      const response = await fetch("/api/connectors/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          streamerUsername: username,
          sessionCode: `dashboard-${Date.now()}`,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setConnectorStatus("online");
        console.log(`Auto-connected TikTok: @${username}`);
      } else {
        setConnectorStatus("error");
        console.error("Failed to auto-connect TikTok");
      }
    } catch (error) {
      console.error("Auto-connect error:", error);
      setConnectorStatus("error");
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabase();

    const loadSession = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          router.replace("/");
          return;
        }

        setSession(session);

        const token = session.access_token;
        
        // Fetch user profile with TikTok username
        try {
          const profileResponse = await fetch("/api/profile", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const profileData = await profileResponse.json();
          if (profileData.tiktokUsername) {
            setTiktokUsername(profileData.tiktokUsername);
            // Auto-connect TikTok if username exists
            await autoConnectTikTok(profileData.tiktokUsername, token);
          }
        } catch (profileError) {
          console.error("Failed to fetch profile:", profileError);
        }

        const subscriptionResponse = await fetch("/api/subscription", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const subscriptionData = await subscriptionResponse.json();

        if (!subscriptionData.success) {
          setError(subscriptionData.error || "Unable to verify subscription.");
          setActiveSubscription(false);
          return;
        }

        const latest = subscriptionData.subscription ?? null;
        setSubscription(latest);
        setActiveSubscription(
          latest?.status === "active" || latest?.status === "trialing"
        );
      } catch (err: any) {
        setError(err?.message ?? "Unable to load session");
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          router.replace("/");
        } else {
          setSession(session);
        }
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          Loading your dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050816] text-white">
        <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8 text-center text-red-200">
          <p className="font-semibold">Dashboard error</p>
          <p className="mt-3">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-6 rounded-[32px] border border-white/10 bg-[#0b1220]/90 p-8 shadow-2xl shadow-black/40 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Creator dashboard</p>
            <h1 className="mt-3 text-4xl font-black text-white">Welcome back, {session?.user?.email ?? "creator"}</h1>
            <p className="mt-4 max-w-2xl text-slate-300">Manage your game sessions, view subscription status, and launch Host It experiences for your viewers.</p>
          </div>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-3 text-base font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-200"
          >
            Sign Out
          </button>
        </div>

        {!activeSubscription && (
          <div className="mb-8 rounded-[28px] border border-orange-400/20 bg-orange-500/10 p-6 text-orange-100">
            <p className="font-semibold text-orange-200">Subscription required</p>
            <p className="mt-2 text-slate-200">
              You are signed in, but access to the creator dashboard requires an active subscription.
              {subscription ? (
                <span> Your current subscription status is <strong>{subscription.status}</strong>.</span>
              ) : (
                <span> No active subscription was found for your account.</span>
              )}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="/#pricing"
                className="rounded-full border border-orange-400/30 bg-orange-400/10 px-5 py-2 text-sm font-semibold text-orange-100 transition hover:bg-orange-400/20"
              >
                View pricing
              </a>
              <button
                onClick={() => router.push("/")}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white transition hover:border-cyan-400 hover:text-cyan-200"
              >
                Return home
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Subscription</p>
            <p className="mt-4 text-3xl font-black text-white">{activeSubscription ? "Active" : "Inactive"}</p>
            <p className="mt-3 text-slate-300">
              {subscription
                ? `${subscription.status} ${subscription.price_id ? `(${subscription.price_id})` : "plan"}`
                : "No subscription record found."}
            </p>
            {subscription?.current_period_end && (
              <p className="mt-3 text-slate-400 text-sm">
                Renews {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">User</p>
            <p className="mt-4 text-3xl font-black text-white">{session?.user?.email ?? "—"}</p>
            <p className="mt-3 text-slate-300">Your authenticated session id is available in Supabase auth.</p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Next step</p>
            <p className="mt-4 text-3xl font-black text-white">Launch a game</p>
            <p className="mt-3 text-slate-300">Use the Host It game suite to start a live session and bring subscription viewers into the action.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
