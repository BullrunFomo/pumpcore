"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { saveAccessKey } from "@/lib/auth"

interface Props {
  onAuthenticated: () => void
}

export default function AccessKeyModal({ onAuthenticated }: Props) {
  const [key, setKey] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!key.trim()) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key.trim() }),
      })

      if (res.ok) {
        saveAccessKey(key.trim())
        // Reload so the Zustand store reinitializes with the account-scoped name
        window.location.reload()
      } else {
        setError("Invalid access key. Please try again.")
        setKey("")
        inputRef.current?.focus()
      }
    } catch {
      setError("Connection error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(7,9,15,0.8)" }}
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
        style={{ background: "rgba(13,17,24,0.97)", boxShadow: "0 0 40px rgba(79,131,255,0.14), 0 20px 60px rgba(0,0,0,0.7)" }}
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
            <p className="text-xs text-zinc-500 mt-0.5">Private access required</p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-zinc-800" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Access Key
            </label>
            <input
              ref={inputRef}
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value)
                if (error) setError("")
              }}
              placeholder="Enter your access key"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg px-3.5 py-2.5 text-sm bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-600 outline-none transition-all"
              style={{
                boxShadow: key ? "0 0 0 1px rgba(79,131,255,0.5), 0 0 12px rgba(79,131,255,0.1)" : undefined,
                borderColor: error ? "rgb(239,68,68)" : key ? "rgba(79,131,255,0.6)" : undefined,
              }}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full mt-1 rounded-lg py-2.5 text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #4f83ff 0%, #3b6fe8 100%)",
              boxShadow: key.trim() && !loading ? "0 0 16px rgba(79,131,255,0.35)" : undefined,
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Verifying…
              </span>
            ) : (
              "Enter"
            )}
          </button>
        </form>

        <p className="text-xs text-zinc-600 text-center">
          Each access key grants access to a private account.
          <br />
          Contact the admin to get your key.
        </p>
      </div>
    </div>
  )
}
