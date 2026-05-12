"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Rocket, Rss, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/xfeed", label: "Feed", icon: Rss },
  { href: "/launch", label: "Launch", icon: Rocket },
  { href: "/profile", label: "Profile", icon: User },
];

export default function Navbar() {
  const pathname = usePathname();
  const isLanding = pathname === "/landing";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
      <div className="w-full pl-4 sm:pl-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/landing" className="flex items-center gap-2 shrink-0">
          <img
            src="/bundlexapp.png"
            alt="BundleX"
            width={24}
            height={24}
            className="rounded-md"
          />
          <span className="text-base font-bold tracking-widest uppercase hidden md:block" style={{ color: "#4f83ff" }}>
            BUNDLEX
          </span>
          <span
            className="hidden md:block text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: "rgba(79,131,255,0.12)", border: "1px solid rgba(79,131,255,0.35)", color: "#4f83ff" }}
          >
            v1.0
          </span>
        </Link>

        {isLanding ? (
          /* Landing page: sign in button only */
          <Link
            href="/"
            className="relative flex items-center gap-2 px-5 py-2 rounded-md text-xs font-bold tracking-widest uppercase overflow-hidden transition-all duration-300"
            style={{
              background: "linear-gradient(135deg, #3b6fd4 0%, #4f83ff 50%, #6fa0ff 100%)",
              border: "1px solid rgba(111,160,255,0.6)",
              color: "#fff",
              boxShadow: "0 0 20px rgba(79,131,255,0.45), 0 0 50px rgba(79,131,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.boxShadow = "0 0 32px rgba(79,131,255,0.65), 0 0 70px rgba(79,131,255,0.25), inset 0 1px 0 rgba(255,255,255,0.2)";
              el.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.boxShadow = "0 0 20px rgba(79,131,255,0.45), 0 0 50px rgba(79,131,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15)";
              el.style.transform = "translateY(0)";
            }}
          >
            <span className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 60%)" }} />
            <Rocket className="w-3.5 h-3.5 relative z-10" style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.5))" }} />
            <span className="relative z-10">Open App</span>
          </Link>
        ) : (
          /* App pages: full nav links */
          <div className="flex items-center h-14 ml-8">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "h-full flex items-center gap-1.5 px-4 sm:px-5 text-xs font-bold tracking-wider uppercase transition-all border-b-2",
                    active
                      ? "border-b-[#4f83ff] text-[#4f83ff]"
                      : "border-b-transparent text-zinc-500 hover:text-zinc-200"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden md:block">{label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
