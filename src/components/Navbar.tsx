"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Rocket, Rss } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
{ href: "/xfeed", label: "Feed", icon: Rss },
  { href: "/launch", label: "Launch", icon: Rocket },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur">
      <div className="w-full px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
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

        {/* Nav links */}
        <div className="flex items-center h-14">
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

      </div>
    </nav>
  );
}
