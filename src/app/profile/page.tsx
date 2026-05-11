"use client";

import { useRef, useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Pencil, Check, X, Camera, Users, Zap } from "lucide-react";
import { clearUserId } from "@/lib/auth";
import { useStore } from "@/store";

export default function ProfilePage() {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const profile = useStore((s) => s.profile);
  const setProfile = useStore((s) => s.setProfile);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  async function handleLogout() {
    clearUserId()
    await signOut({ callbackUrl: "/" })
  }

  function startEditName() {
    setNameInput(profile.name);
    setEditingName(true);
  }

  function saveName() {
    setProfile({ name: nameInput.trim() });
    setEditingName(false);
  }

  function cancelName() {
    setEditingName(false);
  }

  function handlePfpChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setProfile({ pfpUrl: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const displayName = profile.name || session?.user?.name || "Account";

  return (
    <main className="h-full overflow-y-auto pt-8 pb-6 px-4" style={{ background: "#07090f" }}>
      {/* Glow backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(79,131,255,0.07) 0%, transparent 70%)" }} />
      </div>

      <div className="relative max-w-lg mx-auto flex flex-col gap-6">

        {/* ── Hero card ─────────────────────────────────────────────────────── */}
        <div className="rounded-md overflow-hidden" style={{ border: "1px solid rgba(79,131,255,0.15)", background: "linear-gradient(145deg, rgba(79,131,255,0.06) 0%, rgba(7,9,15,0.9) 60%)" }}>
          {/* Banner */}
          <div className="h-24 w-full relative" style={{ background: "linear-gradient(135deg, rgba(79,131,255,0.25) 0%, rgba(139,92,246,0.15) 50%, rgba(7,9,15,0) 100%)" }}>
            <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, rgba(79,131,255,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(139,92,246,0.08) 0%, transparent 50%)" }} />
          </div>

          {/* Avatar row */}
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative group rounded-full focus:outline-none"
                style={{ filter: "drop-shadow(0 0 16px rgba(79,131,255,0.35))" }}
                title="Change profile picture"
              >
                <Avatar pfpUrl={profile.pfpUrl} name={displayName} size={80} />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePfpChange} />

            </div>

            {/* Name */}
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  ref={nameInputRef}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") cancelName(); }}
                  className="flex-1 rounded-lg px-3 py-1.5 text-lg font-bold text-zinc-100 focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(79,131,255,0.4)" }}
                  maxLength={24}
                  placeholder="Enter a name..."
                />
                <button onClick={saveName} className="p-1.5 rounded-lg text-green-400 hover:text-green-300 transition-colors" style={{ background: "rgba(34,197,94,0.1)" }}>
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={cancelName} className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button onClick={startEditName} className="group flex items-center gap-2 focus:outline-none">
                <span className="text-xl font-bold text-white">{displayName}</span>
                <Pencil className="h-3.5 w-3.5 text-zinc-600 group-hover:text-[#4f83ff] transition-colors" />
              </button>
            )}
            <p className="text-xs text-zinc-600 mt-0.5 uppercase tracking-wider">BundleX Member</p>
          </div>
        </div>

{/* ── Account info ─────────────────────────────────────────────────── */}
        <div className="rounded-md p-5 relative overflow-hidden" style={{ background: "linear-gradient(160deg, rgba(15,22,45,0.98) 0%, rgba(18,18,24,0.95) 100%)", border: "1px solid rgba(79,131,255,0.25)", boxShadow: "0 0 20px rgba(79,131,255,0.06), inset 0 1px 0 rgba(79,131,255,0.08)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% -10%, rgba(79,131,255,0.14) 0%, transparent 60%)" }} />
          <div className="relative flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "rgba(79,131,255,0.6)" }}>Signed in as</p>
            <div className="flex items-center gap-3 rounded-md px-4 py-3" style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(79,131,255,0.12)" }}>
              {session?.user?.image && (
                <img src={session.user.image} alt="" width={28} height={28} className="rounded-full shrink-0" />
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-zinc-100 truncate">{session?.user?.name ?? "—"}</span>
                {session?.user?.email && (
                  <span className="text-xs text-zinc-500 truncate">{session.user.email}</span>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* ── Referral ──────────────────────────────────────────────────────── */}
        <div className="rounded-md p-3 relative overflow-hidden" style={{ background: "linear-gradient(160deg, rgba(15,22,45,0.98) 0%, rgba(18,18,24,0.95) 100%)", border: "1px solid rgba(79,131,255,0.4)", boxShadow: "0 0 40px rgba(79,131,255,0.1), 0 0 80px rgba(79,131,255,0.04), inset 0 1px 0 rgba(79,131,255,0.12)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% -5%, rgba(79,131,255,0.28) 0%, transparent 60%)" }} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(79,131,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,131,255,1) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: "1px", background: "linear-gradient(90deg, transparent 10%, rgba(79,131,255,0.5) 50%, transparent 90%)" }} />

          {/* Coming soon overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="flex items-center gap-2 px-4 py-1.5 rounded-sm text-[10px] font-bold tracking-widest uppercase" style={{ border: "1px solid rgba(79,131,255,0.45)", background: "rgba(15,22,45,0.92)", color: "#4f83ff", boxShadow: "0 0 12px rgba(79,131,255,0.2)" }}>
              <Zap className="h-3 w-3" />
              Coming Soon
            </span>
          </div>

          <div className="relative opacity-20 pointer-events-none select-none">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-3 w-3" style={{ color: "#4f83ff" }} />
              <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: "#4f83ff" }}>Referral Program</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="rounded-md p-2 text-center" style={{ background: "rgba(79,131,255,0.06)", border: "1px solid rgba(79,131,255,0.15)" }}>
                <p className="text-lg font-bold text-white">0</p>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(79,131,255,0.6)" }}>Referred</p>
              </div>
              <div className="rounded-md p-2 text-center" style={{ background: "rgba(79,131,255,0.06)", border: "1px solid rgba(79,131,255,0.15)" }}>
                <p className="text-lg font-bold text-white">0 SOL</p>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(79,131,255,0.6)" }}>Earned</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-md px-3 py-1.5" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(79,131,255,0.12)" }}>
              <span className="flex-1 font-mono text-xs truncate" style={{ color: "rgba(161,161,170,0.4)" }}>bundlex.pro/r/••••••••</span>
              <div className="shrink-0" style={{ color: "rgba(79,131,255,0.4)" }}>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* ── Logout ────────────────────────────────────────────────────────── */}
        <div className="flex justify-end">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-sm px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors"
            style={{ border: "1px solid rgba(239,68,68,0.5)", background: "rgba(239,68,68,0.12)", color: "rgb(239,68,68)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.22)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 16px rgba(239,68,68,0.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.12)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Log out
          </button>
        </div>

      </div>
    </main>
  );
}

function Avatar({ pfpUrl, name, size }: { pfpUrl: string; name: string; size: number }) {
  const initials = name.slice(0, 2).toUpperCase();
  if (pfpUrl) {
    return (
      <img
        src={pfpUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, border: "3px solid rgba(79,131,255,0.4)" }}
      />
    );
  }
  return (
    <span
      className="rounded-full flex items-center justify-center shrink-0 font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35, background: "linear-gradient(135deg, rgba(79,131,255,0.2), rgba(139,92,246,0.15))", border: "3px solid rgba(79,131,255,0.4)", color: "#4f83ff" }}
    >
      {initials}
    </span>
  );
}
