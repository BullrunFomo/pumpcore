"use client"

import { signIn } from "next-auth/react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, string>) => void
  }
}

export default function LoginModal() {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [keyLoading, setKeyLoading] = useState(false)
  const [key, setKey] = useState("")
  const [error, setError] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME
    if (!botUsername || !containerRef.current) return

    window.onTelegramAuth = async (user) => {
      setError("")
      try {
        const result = await signIn("telegram", { ...user, redirect: false })
        if (result?.error) setError("Telegram sign-in failed. Please try again.")
      } catch {
        setError("Connection error. Please try again.")
      }
    }

    const script = document.createElement("script")
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.setAttribute("data-telegram-login", botUsername)
    script.setAttribute("data-size", "large")
    script.setAttribute("data-onauth", "onTelegramAuth(user)")
    script.setAttribute("data-request-access", "write")
    script.async = true
    containerRef.current.appendChild(script)

    return () => {
      delete window.onTelegramAuth
    }
  }, [])

  async function handleAccessKey(e: React.FormEvent) {
    e.preventDefault()
    if (!key.trim()) return
    setKeyLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      })
      if (res.ok) {
        // saveUserId so Zustand picks the right store on reload
        const { saveUserId } = await import("@/lib/auth")
        saveUserId(key.trim())
        window.location.href = "/"
      } else {
        setError("Invalid access key. Please try again.")
        setKey("")
      }
    } catch {
      setError("Connection error. Please try again.")
    } finally {
      setKeyLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    setError("")
    try {
      await signIn("google", { callbackUrl: "/", redirect: true })
    } catch {
      setError("Google sign-in failed. Please try again.")
      setGoogleLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(7,9,15,0.85)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(79,131,255,0.08) 0%, transparent 70%)",
        }}
      />

      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl border border-zinc-800 p-8 flex flex-col items-center gap-6"
        style={{
          background: "rgba(13,17,24,0.97)",
          boxShadow: "0 0 40px rgba(79,131,255,0.14), 0 20px 60px rgba(0,0,0,0.7)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative w-12 h-12 rounded-xl overflow-hidden"
            style={{ boxShadow: "0 0 20px rgba(79,131,255,0.4), 0 0 40px rgba(79,131,255,0.15)" }}
          >
            <Image src="/bundlexapp.png" alt="BundleX" fill className="object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-50">BundleX</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Sign in to continue</p>
          </div>
        </div>

        <div className="w-full h-px bg-zinc-800" />

        <div className="w-full flex flex-col gap-3">
          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-lg py-2.5 px-4 text-sm font-medium transition-all border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <svg className="animate-spin w-4 h-4 text-zinc-400" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
              </svg>
            )}
            {googleLoading ? "Signing in…" : "Continue with Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Access key */}
          <form onSubmit={handleAccessKey} className="flex flex-col gap-2">
            <input
              type="password"
              value={key}
              onChange={(e) => { setKey(e.target.value); if (error) setError("") }}
              placeholder="Enter access key"
              autoComplete="off"
              spellCheck={false}
              disabled={keyLoading}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-600 outline-none transition-all"
              style={{
                boxShadow: key ? "0 0 0 1px rgba(79,131,255,0.5), 0 0 12px rgba(79,131,255,0.1)" : undefined,
                borderColor: key ? "rgba(79,131,255,0.6)" : undefined,
              }}
            />
            <button
              type="submit"
              disabled={keyLoading || !key.trim()}
              className="w-full rounded-lg py-2.5 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #4f83ff 0%, #3b6fe8 100%)",
                boxShadow: key.trim() && !keyLoading ? "0 0 16px rgba(79,131,255,0.35)" : undefined,
              }}
            >
              {keyLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Verifying…
                </span>
              ) : "Enter"}
            </button>
          </form>

          {/* Telegram widget container */}
          <div
            ref={containerRef}
            className="w-full flex justify-center -mt-3"
            style={{ minHeight: "42px" }}
          />

        </div>

        <p
          className="text-xs text-red-400 flex items-center gap-1.5"
          style={{ visibility: error ? "visible" : "hidden" }}
        >
          <span className="inline-block w-1 h-1 rounded-full bg-red-400 shrink-0" />
          {error || " "}
        </p>
      </div>
    </div>
  )
}
