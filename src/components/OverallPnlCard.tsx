"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OverallPnlCardProps {
  open: boolean;
  onClose: () => void;
  totalPnlSol: number;
  totalPnlUsd: number;
  investedSol: number;
  currentPositionSol: number;
  solPrice: number;
}

const W = 800;
const H = 430;

const SOLANA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 397.7 311.7">
  <defs>
    <linearGradient id="a" x1="90.914" y1="319.06" x2="235.29" y2="-49.399"
      gradientTransform="matrix(1 0 0 -1 0 314)" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#9945ff"/>
      <stop offset=".14" stop-color="#8752f3"/>
      <stop offset=".42" stop-color="#5497d5"/>
      <stop offset=".68" stop-color="#43b4ca"/>
      <stop offset=".88" stop-color="#28e0b9"/>
      <stop offset="1" stop-color="#19fb9b"/>
    </linearGradient>
  </defs>
  <path fill="url(#a)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
  <path fill="url(#a)" d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
  <path fill="url(#a)" d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>
</svg>`;

const SOL_ASPECT = 397.7 / 311.7;

function loadSolanaLogo(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([SOLANA_SVG], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });
}

function fmt(n: number, d = 2) { return n.toFixed(d); }
function fmtUsd(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(abs / 1000).toFixed(2)}K USD`;
  return `${abs.toFixed(2)} USD`;
}

let satoshiPromise: Promise<void> | null = null;

function loadSatoshi(): Promise<void> {
  if (typeof FontFace === "undefined") return Promise.resolve();
  if (!satoshiPromise) {
    satoshiPromise = (async () => {
      const url = "https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700&display=swap";
      try {
        const css = await fetch(url).then((r) => r.text());
        const srcs = [...css.matchAll(/url\(([^)]+)\)\s*format\(['"]?(woff2?)['"]?\)/g)];
        await Promise.all(
          srcs.map(async ([, src]) => {
            const face = new FontFace("Satoshi", `url(${src})`);
            await face.load();
            document.fonts.add(face);
          })
        );
        await document.fonts.ready;
      } catch {}
    })();
  }
  return satoshiPromise;
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCard(
  canvas: HTMLCanvasElement,
  props: Omit<OverallPnlCardProps, "open" | "onClose">,
  solanaLogoImg: HTMLImageElement | null,
  bgImg: HTMLImageElement | null,
  bundleLogoImg: HTMLImageElement | null,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = W;
  canvas.height = H;

  const { totalPnlSol, totalPnlUsd, investedSol, currentPositionSol, solPrice } = props;

  const pnlColor = totalPnlSol > 0 ? "#4ade80" : totalPnlSol < 0 ? "#f87171" : "#ffffff";
  const pnlSign  = totalPnlSol > 0 ? "+" : totalPnlSol < 0 ? "-" : "";
  const pnlPct   = investedSol > 0 ? (totalPnlSol / investedSol) * 100 : 0;
  const investedUsd  = investedSol * solPrice;
  const positionUsd  = currentPositionSol * solPrice;

  // Background
  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, W, H);
  } else {
    ctx.fillStyle = "#0b0f17";
    ctx.fillRect(0, 0, W, H);
  }

  ctx.strokeStyle = "rgba(28,38,56,0.9)";
  ctx.lineWidth = 1.5;
  drawRoundRect(ctx, 0.75, 0.75, W - 1.5, H - 1.5, 12);
  ctx.stroke();

  // Branding
  const brandLogoH = 22;
  let brandTextX = 36;
  if (bundleLogoImg) {
    const brandLogoW = bundleLogoImg.naturalWidth > 0
      ? (brandLogoH * bundleLogoImg.naturalWidth) / bundleLogoImg.naturalHeight
      : brandLogoH;
    ctx.drawImage(bundleLogoImg, 36, 52 - brandLogoH + 4, brandLogoW, brandLogoH);
    brandTextX = 36 + brandLogoW + 8;
  }
  ctx.fillStyle = "#4f83ff";
  ctx.font = "bold 18px Satoshi, sans-serif";
  ctx.fillText("BUNDLEX", brandTextX, 52);

  // Title
  ctx.font = "bold 50px Satoshi, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("OVERALL PNL", 36, 126);

  // PnL amount (big)
  const bigLogoH = 50;
  const bigLogoW = bigLogoH * SOL_ASPECT;
  if (solanaLogoImg) {
    ctx.drawImage(solanaLogoImg, 36, 222 - bigLogoH + 4, bigLogoW, bigLogoH);
  }
  ctx.font = "bold 72px Satoshi, sans-serif";
  ctx.fillStyle = pnlColor;
  ctx.fillText(`${pnlSign}${fmt(Math.abs(totalPnlSol), 2)}`, 36 + bigLogoW + 12, 222);

  // Divider
  ctx.strokeStyle = "rgba(28,38,56,0.9)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(36, 250);
  ctx.lineTo(W - 36, 250);
  ctx.stroke();

  // Stats row
  const statLogoH = 17;
  const statLogoW = statLogoH * SOL_ASPECT;
  const stats = [
    { label: "Invested", solVal: investedSol,        usd: investedUsd,                        useLogo: true,  color: "#cbd5e1" },
    { label: "Position", solVal: currentPositionSol, usd: positionUsd,                        useLogo: true,  color: "#cbd5e1" },
    { label: "PNL",      text: `${pnlSign}${fmt(Math.abs(pnlPct), 2)}%`, usd: Math.abs(totalPnlUsd), useLogo: false, color: pnlColor },
  ];

  const colW = (W - 72) / 3;
  stats.forEach((s, i) => {
    const x = 36 + i * colW;
    ctx.font = "12px Satoshi, sans-serif";
    ctx.fillStyle = "rgba(100,116,139,0.75)";
    ctx.fillText(s.label, x, 285);

    ctx.font = "bold 26px Satoshi, sans-serif";
    ctx.fillStyle = s.color;
    if (s.useLogo) {
      if (solanaLogoImg) ctx.drawImage(solanaLogoImg, x, 314 - statLogoH + 2, statLogoW, statLogoH);
      ctx.fillText(fmt(s.solVal!, 2), x + statLogoW + 6, 314);
    } else {
      ctx.fillText(s.text!, x, 314);
    }

    ctx.font = "12px Satoshi, sans-serif";
    ctx.fillStyle = "rgba(100,116,139,0.55)";
    ctx.fillText(`(${fmtUsd(s.usd!)})`, x, 336);
  });

  // Watermark
  ctx.font = "13px Satoshi, sans-serif";
  ctx.fillStyle = "rgba(148,163,184,0.45)";
  ctx.textAlign = "right";
  ctx.fillText("bundlex.pro", W - 36, H - 18);
  ctx.textAlign = "left";
}

export default function OverallPnlCard({ open, onClose, ...rest }: OverallPnlCardProps) {
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  const [solanaLogoImg, setSolanaLogoImg] = useState<HTMLImageElement | null>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [bundleLogoImg, setBundleLogoImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!canvasEl) return;
    loadSolanaLogo().catch(() => null).then(setSolanaLogoImg);

    const bg = new Image();
    bg.onload  = () => setBgImg(bg);
    bg.onerror = () => setBgImg(null);
    bg.src = "/pnl_bg_blur.png";

    const bl = new Image();
    bl.onload  = () => setBundleLogoImg(bl);
    bl.onerror = () => setBundleLogoImg(null);
    bl.src = "/pnglogo.png";
  }, [canvasEl]);

  useEffect(() => {
    if (!canvasEl || !solanaLogoImg) return;
    loadSatoshi().then(() =>
      drawCard(canvasEl, rest, solanaLogoImg, bgImg, bundleLogoImg)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasEl, solanaLogoImg, bgImg, bundleLogoImg,
      rest.totalPnlSol, rest.totalPnlUsd, rest.investedSol, rest.currentPositionSol, rest.solPrice]);

  const handleDownload = () => {
    if (!canvasEl) return;
    const link = document.createElement("a");
    link.download = "overall-pnl.png";
    link.href = canvasEl.toDataURL("image/png");
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="p-0 overflow-hidden"
        style={{
          maxWidth: "min(860px, 95vw)",
          background: "rgba(11,15,23,0.98)",
          border: "1px solid rgba(28,38,56,0.8)",
        }}
      >
        <DialogHeader className="px-5 pt-4 pb-0">
          <DialogTitle className="text-sm font-semibold text-zinc-300">
            Overall PnL Card
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 flex flex-col gap-4">
          <canvas
            ref={setCanvasEl}
            className="w-full rounded-lg"
            style={{ display: "block", minHeight: "200px" }}
          />
          <div className="flex justify-end">
            <button
              onClick={handleDownload}
              className="glow-btn border relative flex items-center gap-1.5 px-4 py-2 rounded text-sm font-bold overflow-hidden transition-all duration-300 active:scale-95"
            >
              <span
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(105deg, transparent 40%, rgba(79,131,255,0.12) 50%, transparent 60%)",
                  animation: "shimmer 2.5s infinite",
                }}
              />
              <span className="relative flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" style={{ filter: "drop-shadow(0 0 4px rgba(79,131,255,0.7))" }} />
                Download PNG
              </span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
