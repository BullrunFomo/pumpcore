"use client";
import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { n: 1, label: "Token" },
  { n: 2, label: "Bundle" },
  { n: 3, label: "Launch" },
];

interface Props {
  currentStep: number;
}

export default function StepIndicator({ currentStep }: Props) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done = currentStep > s.n;
        const active = currentStep === s.n;
        return (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300",
                  done
                    ? "bg-[#4f83ff] border-0 text-white"
                    : active
                    ? "border border-[#4f83ff] text-[#4f83ff] bg-[#4f83ff]/10"
                    : "border border-zinc-800 text-zinc-600 bg-zinc-900"
                )}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : s.n}
                {active && (
                  <span className="absolute inset-0 rounded-full animate-ping border border-[#4f83ff]/30 pointer-events-none" style={{ animationDuration: "2.5s" }} />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors",
                  active
                    ? "text-[#4f83ff]"
                    : done
                    ? "text-zinc-400"
                    : "text-zinc-600"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 mx-3 mb-5 relative h-px overflow-visible">
                <div className="absolute inset-0 bg-zinc-800" />
                <div
                  className="absolute inset-0 bg-[#4f83ff] transition-all duration-500 origin-left"
                  style={{
                    transform: `scaleX(${currentStep > s.n ? 1 : 0})`,
                  }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
