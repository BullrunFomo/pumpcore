import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatSol(amount: number, decimals = 4): string {
  return amount.toFixed(decimals);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 2): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`;
  return n.toFixed(decimals);
}

export function pnlColor(pnl: number): string {
  if (pnl > 0) return "text-green-400";
  if (pnl < 0) return "text-red-400";
  return "text-gray-400";
}

const VIRAL_OPENERS = [
  "this meme is going extremely viral on tiktok/x",
  "this meme is going insanely viral on x",
  "this is going insanely viral",
  "this meme is taking over the internet",
  "this is insane right now",
  "this is absolutely crazy",
  "this meme is everywhere right now",
  "this is going crazy viral",
];

export function buildTokenDescription(name: string): string {
  const useOpener = Math.random() < 0.6;
  if (!useOpener) return `${name} on PumpFun.`;
  const opener = VIRAL_OPENERS[Math.floor(Math.random() * VIRAL_OPENERS.length)];
  return `${opener}. ${name} on PumpFun.`;
}

