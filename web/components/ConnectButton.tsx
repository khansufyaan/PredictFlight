"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectButton() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address } = useAccount();

  if (!ready) {
    return (
      <span className="rounded-lg border border-board-line px-3 py-1.5 text-xs text-board-dim">
        …
      </span>
    );
  }

  if (authenticated) {
    return (
      <button
        onClick={logout}
        className="rounded-lg border border-board-line bg-board-panel px-3 py-1.5 text-xs font-bold text-board-amber transition-colors hover:border-board-amber/60"
        title="Sign out"
      >
        {address ? shortAddr(address) : "Signed in"}
      </button>
    );
  }

  return (
    <button
      onClick={login}
      className="rounded-lg bg-board-amber px-3.5 py-1.5 text-xs font-extrabold text-black transition-transform hover:scale-105"
    >
      Sign in
    </button>
  );
}
