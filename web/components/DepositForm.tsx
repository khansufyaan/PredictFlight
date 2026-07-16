"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi, flightMarketAbi } from "@/lib/abi";
import { api } from "@/lib/api";
import { takeoff } from "@/components/PlaneFly";
import { FLIGHT_MARKET_ADDRESS, USDC_ADDRESS } from "@/lib/config";
import { hhmm, usdc as fmtUsdc } from "@/lib/format";

type Step = "idle" | "approving" | "depositing";

export function DepositForm({
  marketId,
  deadline,
  defaultSide,
  lockSide,
  minimal,
  challengeCode,
}: {
  marketId: string;
  /** land-by time (scheduled arrival + 15 min grace), epoch seconds */
  deadline?: number;
  defaultSide?: 0 | 1;
  /** challenge flow: force the taker onto this side */
  lockSide?: boolean;
  /** the side is fixed and stated above the form — render only amount + one action */
  minimal?: boolean;
  challengeCode?: string;
}) {
  const { address } = useAccount();
  const { login } = usePrivy();
  const queryClient = useQueryClient();
  const [side, setSide] = useState<0 | 1>(defaultSide ?? 0);
  const [amount, setAmount] = useState("25");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  let parsed = 0n;
  try {
    parsed = parseUnits(amount || "0", 6);
  } catch {
    /* keep 0 */
  }

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, FLIGHT_MARKET_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const needsApproval = (allowance ?? 0n) < parsed;
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isSuccess: txConfirmed, isError: txFailed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (!txConfirmed) return;
    if (step === "approving") {
      refetchAllowance().then(() => {
        reset();
        setStep("idle");
      });
    } else if (step === "depositing") {
      reset();
      setStep("idle");
      setAmount("25");
      takeoff(); // position taken — send a plane across the screen
      queryClient.invalidateQueries();
      if (challengeCode && address) {
        // indexer needs a beat to see the Deposited event
        let tries = 0;
        const tick = async () => {
          const ok = await api.acceptChallenge(challengeCode, address);
          if (!ok && ++tries < 10) setTimeout(tick, 3000);
        };
        setTimeout(tick, 3000);
      }
    }
  }, [txConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (txFailed) {
      setError("transaction failed");
      setStep("idle");
      reset();
    }
  }, [txFailed, reset]);

  const submit = () => {
    setError(null);
    if (!address) {
      login(); // the big button is the invitation — no dead "connect first" state
      return;
    }
    if (parsed === 0n) return;
    if (balance !== undefined && parsed > balance) {
      setError("insufficient USDC balance");
      return;
    }
    if (needsApproval) {
      setStep("approving");
      writeContract(
        {
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: "approve",
          args: [FLIGHT_MARKET_ADDRESS, parsed],
        },
        { onError: (e) => (setError(e.message.split("\n")[0]), setStep("idle")) },
      );
    } else {
      setStep("depositing");
      writeContract(
        {
          address: FLIGHT_MARKET_ADDRESS,
          abi: flightMarketAbi,
          functionName: "deposit",
          args: [marketId as `0x${string}`, side, parsed],
        },
        { onError: (e) => (setError(e.message.split("\n")[0]), setStep("idle")) },
      );
    }
  };

  const busy = isPending || step !== "idle";
  const label = !address
    ? "Sign in to predict"
    : step === "approving"
      ? "Approving USDC…"
      : step === "depositing"
        ? "Depositing…"
        : needsApproval && parsed > 0n
          ? `Approve ${amount} USDC`
          : minimal
            ? "Accept challenge"
            : side === 0
              ? "Predict yes"
              : "Predict no";

  return (
    <div className="board-card p-4">
      {!minimal && (
        <div className="mb-4 text-center text-lg text-white">
          {deadline ? <>Will it land by <b className="text-board-amber">{hhmm(deadline)}</b>?</> : "Make your prediction"}
        </div>
      )}
      {!minimal && (
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`btn-green !py-3 !text-lg !normal-case !tracking-normal ${side === 0 ? "ring-2 ring-board-green" : "opacity-50"}`}
            onClick={() => !lockSide && setSide(0)}
            disabled={lockSide && side !== 0}
          >
            Yes
          </button>
          <button
            className={`btn-red !py-3 !text-lg !normal-case !tracking-normal ${side === 1 ? "ring-2 ring-board-red" : "opacity-50"}`}
            onClick={() => !lockSide && setSide(1)}
            disabled={lockSide && side !== 1}
          >
            No
          </button>
        </div>
      )}
      <div className={`${minimal ? "" : "mt-3 "}flex items-center gap-2`}>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          inputMode="decimal"
          className="w-full rounded-lg border border-board-line bg-board-bg px-4 py-3 text-right text-2xl"
        />
        <span className="text-sm text-board-dim">USDC</span>
      </div>
      {balance !== undefined && (
        <div className="mt-1 text-right text-xs text-board-dim">
          balance ${fmtUsdc(balance, 2)}
        </div>
      )}
      <button
        className="btn-amber mt-3 w-full !py-3.5 !text-base !normal-case !tracking-normal"
        onClick={submit}
        disabled={busy || (!!address && parsed === 0n)}
      >
        {label}
      </button>
      {needsApproval && parsed > 0n && !busy && address && (
        <div className="mt-2 text-center text-xs text-board-dim">
          step 1 of 2 — approve, then deposit
        </div>
      )}
      {error && <div className="mt-2 text-center text-xs text-board-red">{error}</div>}
      {address && balance === 0n && (
        <a
          href="https://www.coinbase.com/how-to-buy/usdc"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-center text-xs text-board-sky underline"
        >
          No USDC yet? Buy with a card on Coinbase (choose Base network) ↗
        </a>
      )}
    </div>
  );
}
