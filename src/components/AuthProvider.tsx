"use client"

import { useState, useEffect } from "react"
import { getStoredAccessKey } from "@/lib/auth"
import AccessKeyModal from "./AccessKeyModal"

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  useEffect(() => {
    const key = getStoredAccessKey()
    setStatus(key ? "authenticated" : "unauthenticated")
  }, [])

  // Blank screen while checking localStorage to avoid flash
  if (status === "loading") {
    return <div className="fixed inset-0 bg-zinc-950" />
  }

  if (status === "unauthenticated") {
    return (
      <>
        {/* Blurred app shell behind the modal */}
        <div className="fixed inset-0 overflow-hidden" style={{ filter: "blur(8px)", pointerEvents: "none", userSelect: "none" }}>
          {children}
        </div>
        <AccessKeyModal onAuthenticated={() => setStatus("authenticated")} />
      </>
    )
  }

  return <>{children}</>
}
