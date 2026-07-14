"use client";

import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { http, WagmiProvider } from "wagmi";
import { base, baseSepolia, foundry } from "wagmi/chains";
import { CHAIN_ID, RPC_URL, WALLETCONNECT_PROJECT_ID } from "@/lib/config";

const chain = [base, baseSepolia, foundry].find((c) => c.id === CHAIN_ID) ?? foundry;

const wagmiConfig = getDefaultConfig({
  appName: "FlightPool",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [chain],
  transports: { [chain.id]: http(RPC_URL) },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchInterval: 5000 } } }),
  );
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#ffb300" })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
