"use client"

import { SessionProvider, useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import { saveUserId, getStoredUserId } from "@/lib/auth"
import LoginModal from "./LoginModal"

function AuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const reloading = useRef(false)
  const [accessKeyAuthed, setAccessKeyAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    if (!session?.user?.id || reloading.current) return
    const stored = getStoredUserId()
    if (stored !== session.user.id) {
      reloading.current = true
      saveUserId(session.user.id)
      window.location.reload()
    }
  }, [session])

  // Check access key cookie when NextAuth says unauthenticated
  useEffect(() => {
    if (status !== "unauthenticated") return
    fetch("/api/auth/me")
      .then((r) => setAccessKeyAuthed(r.ok))
      .catch(() => setAccessKeyAuthed(false))
  }, [status])

  if (status === "loading" || (status === "unauthenticated" && accessKeyAuthed === null)) {
    return <div className="fixed inset-0" style={{ background: "#07090f" }} />
  }

  if (status === "unauthenticated" && !accessKeyAuthed) {
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
