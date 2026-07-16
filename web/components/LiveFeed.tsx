"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/config";
import { feedFor } from "@/lib/liveFeeds";

/* Ambient live window onto an airport — not a video player. The stream is
 * driven through the YouTube IFrame API (we start it muted ourselves), a
 * click-shield swallows every interaction, and our own cover hides the frame
 * until video is actually rendering — so no YouTube chrome, spinner, title,
 * or link-out is ever visible. */

interface FeedInfo {
  airport: string;
  videoId: string;
  label: string;
  credit: string;
}

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytPromise: Promise<any> | null = null;
function loadYT(): Promise<any> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytPromise) {
    ytPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve(window.YT);
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    });
  }
  return ytPromise;
}

export function LiveFeed({ airport }: { airport: string }) {
  const meta = feedFor(airport);
  const { data: feeds } = useQuery<FeedInfo[]>({
    queryKey: ["feeds"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/feeds`, { cache: "no-store" });
      if (!res.ok) throw new Error("feeds unavailable");
      return res.json();
    },
    staleTime: 10 * 60_000,
    refetchInterval: false,
    enabled: !!meta,
  });

  const videoId = feeds?.find((f) => f.airport === airport)?.videoId ?? meta?.fallback ?? null;
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [dead, setDead] = useState(false);

  useEffect(() => {
    if (!videoId || !hostRef.current) return;
    let cancelled = false;
    const target = document.createElement("div");
    hostRef.current.appendChild(target);
    loadYT().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(target, {
        width: "100%",
        height: "100%",
        videoId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e: any) => {
            e.target.mute();
            e.target.playVideo();
          },
          onStateChange: (e: any) => setPlaying(e.data === 1),
          onError: () => setDead(true),
        },
      });
    });
    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* already gone */
      }
      playerRef.current = null;
    };
  }, [videoId]);

  if (!meta) return null;
  if (dead) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-board-line bg-black text-xs text-board-dim">
        {airport} cam is offline right now
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-video select-none overflow-hidden rounded-lg border border-board-line bg-black">
        {/* player fills the box; the shield above it eats every click/touch */}
        <div ref={hostRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
        <div className="absolute inset-0 z-20" aria-hidden />
        {/* our cover until real frames are rendering — YouTube's loading UI
            (spinner, title, More Videos) never gets seen */}
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center bg-black transition-opacity duration-700 ${
            playing ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <span className="animate-pulse text-xs uppercase tracking-widest text-board-dim">
            <span className="text-board-red">●</span> connecting to {airport} cam…
          </span>
        </div>
        <div className="absolute inset-x-0 top-0 z-10 h-12 bg-gradient-to-b from-black/80 to-transparent" />
        <div className="absolute left-3 top-2.5 z-10 text-[11px] font-bold uppercase tracking-widest text-white/90">
          <span className="text-board-red">●</span> live · {airport}
        </div>
      </div>
      <div className="mt-1.5 text-[11px] text-board-dim">
        {meta.label} · feed: {meta.credit}
      </div>
    </div>
  );
}
