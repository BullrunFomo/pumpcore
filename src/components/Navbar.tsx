"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Rocket, Copy, Rss } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/copytrade", label: "Copytrade", icon: Copy },
  { href: "/xfeed", label: "X Feed", icon: Rss },
  { href: "/launch", label: "Launch", icon: Rocket },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/logo1.png"
            alt="BundleX"
            width={28}
            height={28}
            className="rounded-md"
            style={{ boxShadow: "0 0 6px rgba(79,131,255,1), 0 0 16px rgba(79,131,255,0.9), 0 0 32px rgba(79,131,255,0.6), 0 0 60px rgba(79,131,255,0.3), 0 0 90px rgba(79,131,255,0.12)" }}
          />
          <span className="text-base font-bold tracking-widest uppercase hidden md:block" style={{ color: "#4f83ff" }}>
            BUNDLEX
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center h-14">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "h-full flex items-center gap-1.5 px-2 sm:px-3 text-xs tracking-wider uppercase transition-all border-b-2",
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
      </div>
    </nav>
  );
}
