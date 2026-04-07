"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useStore } from "@/store";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ImportWalletsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ImportWalletsModal({ open, onClose }: ImportWalletsModalProps) {
  const addWallets = useStore((s) => s.addWallets);
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleImport = async () => {
    if (!raw.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privateKeys: raw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      addWallets(data.wallets);
      setSuccess(`Imported ${data.wallets.length} wallet(s) successfully.`);
      setRaw("");
      setTimeout(onClose, 1200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-lg"
        style={{
          background: "rgba(9,9,11,0.97)",
          border: "1px solid rgba(63,63,70,0.5)",
          boxShadow: "0 0 0 1px rgba(79,131,255,0.08), 0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        {/* Top glow line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(79,131,255,0.5) 50%, transparent 100%)" }}
        />

        <DialogHeader>
          <DialogTitle className="text-zinc-100 text-base font-bold tracking-tight">
            Import Wallets
          </DialogTitle>
          <p className="text-sm text-zinc-500 mt-0.5">
            Paste private keys below — one per line (base58) or as a JSON array.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            className="font-mono text-xs h-48 resize-none"
            style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(79,131,255,0.25)",
              color: "#a1a1aa",
              boxShadow: "inset 0 0 20px rgba(79,131,255,0.03)",
            }}
            placeholder={"5KtX...abc\n3mYZ...def\n\n// or as JSON array:\n[\"5KtX...abc\", \"3mYZ...def\"]"}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />

          {error && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-400"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-green-400"
              style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            style={{
              background: "transparent",
              border: "1px solid rgba(63,63,70,0.6)",
              color: "#71717a",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={loading || !raw.trim()}
            style={{
              background: "rgba(79,131,255,0.15)",
              border: "1px solid rgba(79,131,255,0.4)",
              color: "#4f83ff",
              boxShadow: "0 0 16px rgba(79,131,255,0.15)",
            }}
          >
            {loading ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
