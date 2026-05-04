"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  text: string;
  className?: string;
  iconClassName?: string;
}

export default function CopyButton({ text, className = "", iconClassName = "h-3.5 w-3.5" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button onClick={handleCopy} className={className}>
      {copied ? (
        <Check
          className={iconClassName}
          style={{ color: "#4ade80", animation: "check-pop 0.25s ease forwards" }}
        />
      ) : (
        <Copy className={iconClassName} />
      )}
    </button>
  );
}
