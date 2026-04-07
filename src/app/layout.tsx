import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Pumpcore.io",
  description: "Professional PumpFun token launch & bundle trading tool",
  icons: { icon: "/logo1.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100">
        <Navbar />
        {/* Global ambient glow under navbar */}
        <div
          className="fixed left-0 right-0 top-14 h-48 pointer-events-none z-0"
          style={{
            background: "radial-gradient(ellipse 70% 100% at 50% 0%, rgba(79,131,255,0.09) 0%, transparent 100%)",
          }}
        />
        <main className="fixed inset-0 top-14 bottom-9 overflow-hidden flex flex-col z-10">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
