"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { http } from "wagmi";
import { base, baseSepolia, foundry } from "wagmi/chains";
import { CHAIN_ID, PRIVY_APP_ID, RPC_URL, WALLETCONNECT_PROJECT_ID } from "@/lib/config";

const chain = [base, baseSepolia, foundry].find((c) => c.id === CHAIN_ID) ?? foundry;

const wagmiConfig = createConfig({
  chains: [chain],
  // only `chain` is active; the extra keys just satisfy the union type
  transports: { [base.id]: http(RPC_URL), [baseSepolia.id]: http(RPC_URL), [foundry.id]: http(RPC_URL) },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchInterval: 5000 } } }),
  );
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#fbbf24",
          landingHeader: "Board Jetlag",
          loginMessage: "Sign in to bet on flights",
          walletList: [
            "coinbase_wallet",
            "metamask",
            "rainbow",
            "wallet_connect",
            "detected_wallets",
          ],
        },
        loginMethods: ["email", "google", "wallet"],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: chain,
        supportedChains: [chain],
        walletConnectCloudProjectId: WALLETCONNECT_PROJECT_ID,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
