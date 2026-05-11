"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Rocket, Rss, User, LogIn } from "lucide-react";
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
      <div className="w-full pl-4 sm:pl-6 pr-4 sm:pr-6 h-14 flex items-center justify-between">
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
            href="/login"
            className="group flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold tracking-widest uppercase transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, rgba(79,131,255,0.15) 0%, rgba(79,131,255,0.08) 100%)",
              border: "1px solid rgba(79,131,255,0.4)",
              color: "#93b4ff",
              boxShadow: "0 0 14px rgba(79,131,255,0.18), inset 0 1px 0 rgba(79,131,255,0.12)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "linear-gradient(135deg, rgba(79,131,255,0.26) 0%, rgba(79,131,255,0.14) 100%)";
              el.style.boxShadow = "0 0 22px rgba(79,131,255,0.35), inset 0 1px 0 rgba(79,131,255,0.2)";
              el.style.borderColor = "rgba(79,131,255,0.65)";
              el.style.color = "#b8ceff";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = "linear-gradient(135deg, rgba(79,131,255,0.15) 0%, rgba(79,131,255,0.08) 100%)";
              el.style.boxShadow = "0 0 14px rgba(79,131,255,0.18), inset 0 1px 0 rgba(79,131,255,0.12)";
              el.style.borderColor = "rgba(79,131,255,0.4)";
              el.style.color = "#93b4ff";
            }}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
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
