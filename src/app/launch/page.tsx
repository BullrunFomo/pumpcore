"use client";
import { useStore } from "@/store";
import StepIndicator from "./StepIndicator";
import Step1TokenConfig from "./Step1TokenConfig";
import Step2BundleConfig from "./Step2BundleConfig";
import Step3OptionalSettings from "./Step3OptionalSettings";
import Step4ReviewLaunch from "./Step4ReviewLaunch";

export default function LaunchPage() {
  const step = useStore((s) => s.launch.step);

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-2xl mx-auto px-4 py-5 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 mb-4">
          <h1 className="text-xl font-bold text-white tracking-tight">Launch a Token</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Deploy and bundle-buy your PumpFun token in one flow.
          </p>
        </div>

        <div className="shrink-0">
          <StepIndicator currentStep={step} />
        </div>

        <div className="flex-1 min-h-0 mt-5 overflow-y-auto no-scrollbar pb-2">
          {step === 1 && <Step1TokenConfig />}
          {step === 2 && <Step2BundleConfig />}
          {step === 3 && <Step3OptionalSettings />}
          {step === 4 && <Step4ReviewLaunch />}
        </div>
      </div>
    </div>
  );
}
