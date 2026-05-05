"use client"

import { useState, useEffect } from "react"
import { getStoredAccessKey } from "@/lib/auth"
import AccessKeyModal from "./AccessKeyModal"

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (res.ok) {
          setStatus("authenticated")
        } else {
          // No valid cookie — try to silently restore from localStorage
          const stored = getStoredAccessKey()
          if (stored) {
            fetch("/api/auth/validate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: stored }),
            }).then((r) => {
              if (r.ok) {
                // Cookie now set; reload so Zustand re-initializes with correct store name
                window.location.reload()
              } else {
                // Stored key is no longer valid
                setStatus("unauthenticated")
              }
            }).catch(() => setStatus("unauthenticated"))
          } else {
            setStatus("unauthenticated")
          }
        }
      })
      .catch(() => setStatus("unauthenticated"))
  }, [])

  if (status === "loading") {
    return <div className="fixed inset-0" style={{ background: "#07090f" }} />
  }

  if (status === "unauthenticated") {
    return (
      <>
        <div className="fixed inset-0 overflow-hidden" style={{ filter: "blur(8px)", pointerEvents: "none", userSelect: "none" }}>
          {children}
        </div>
        <AccessKeyModal onAuthenticated={() => setStatus("authenticated")} />
      </>
    )
  }

  return <>{children}</>
}
