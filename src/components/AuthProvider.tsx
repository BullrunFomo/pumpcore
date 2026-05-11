"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { useEffect, useRef } from "react"
import { saveUserId, getStoredUserId } from "@/lib/auth"
import LoginModal from "./LoginModal"

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const reloading = useRef(false)

  useEffect(() => {
    if (!session?.user?.id || reloading.current) return
    const stored = getStoredUserId()
    if (stored !== session.user.id) {
      reloading.current = true
      saveUserId(session.user.id)
      window.location.reload()
    }
  }, [session])

  if (status === "loading") {
    return <div className="fixed inset-0" style={{ background: "#07090f" }} />
  }

  if (status === "unauthenticated") {
    return (
      <>
        <div
          className="fixed inset-0 overflow-hidden"
          style={{ filter: "blur(8px)", pointerEvents: "none", userSelect: "none" }}
        >
          {children}
        </div>
        <LoginModal />
      </>
    )
  }

  return <>{children}</>
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthGate>{children}</AuthGate>
    </SessionProvider>
  )
}
