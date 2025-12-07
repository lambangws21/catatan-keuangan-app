"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import type { PriceItem } from "@/app/api/price-list/route";

// ===============================
// ✅ BACKGROUND BY TYPE
// ===============================
function getBackgroundByType(type: string): string {
  const t = type.toLowerCase().trim();

  if (t.includes("persona")) return "/images/backgrounds/persona.png";
  if (t.includes("uka") || t.includes("uni")) return "/images/backgrounds/uka.png";
  if (t.includes("vanguard")) return "/images/backgrounds/vanguard-bg.png";

  if (
    t.includes("ps") ||
    t.includes("cr") ||
    t.includes("mc") ||
    t.includes("uc") ||
    t.includes("knee") ||
    t.includes("tkr")
  ) {
    return "/images/backgrounds/nexgen.png";
  }

  if (t.includes("hip") || t.includes("thr"))
    return "/images/backgrounds/trilogy.png";

  return "/images/backgrounds/implant-bg.png";
}

// ===============================
// ✅ SHARE IMAGE FUNCTION (CLIENT ONLY)
// ===============================
async function shareAsImage(item: PriceItem, bg: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new window.Image();
  img.src = bg;

  await new Promise((resolve) => (img.onload = resolve));

  // BACKGROUND IMAGE
  ctx.drawImage(img, 0, 0, 1200, 630);

  // PREMIUM OVERLAY
  const grd = ctx.createLinearGradient(0, 0, 1200, 630);
  grd.addColorStop(0, "rgba(0,76,151,0.9)");
  grd.addColorStop(1, "rgba(0,115,230,0.85)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px Arial";
  ctx.fillText(item.product, 50, 120);

  ctx.font = "26px Arial";
  ctx.fillText(item.system, 50, 170);
  ctx.fillText(`Type: ${item.type}`, 50, 210);

  ctx.font = "bold 36px Arial";
  ctx.fillText(`Harga: Rp ${item.hargaNett.toLocaleString("id-ID")}`, 50, 300);

  ctx.fillStyle = "#67E8F9";
  ctx.fillText(
    `Harga + PPN: Rp ${item.hargaNettPPN.toLocaleString("id-ID")}`,
    50,
    360
  );

  ctx.font = "20px Arial";
  ctx.fillStyle = "#E5E7EB";
  ctx.fillText("Zimmer Biomet • Confidential Pricing", 50, 590);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );

  if (!blob) return;

  const file = new File([blob], `${item.product}.png`, {
    type: "image/png",
  });

  // ✅ SHARE (Mobile)
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: item.product,
      text: "Price Info - Zimmer Biomet",
      files: [file],
    });
  } else {
    // ✅ FALLBACK DOWNLOAD
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
  }
}

// ===============================
// ✅ STEP CARD COMPONENT
// ===============================
export default function StepCard({
  item,
  icon,
}: {
  item: PriceItem;
  icon?: ReactNode;
}) {
  const bg = getBackgroundByType(item.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="
        relative w-full max-w-3xl mx-auto
        rounded-3xl overflow-hidden
        shadow-[0_20px_60px_rgba(0,80,180,0.35)]
        border border-white/30
        backdrop-blur-xl
      "
    >
      {/* FULL BACKGROUND */}
      <Image src={bg} alt="Implant Background" fill className="object-cover" />

      {/* PREMIUM OVERLAY */}
      <div className="absolute inset-0 bg-linear-to-br from-[#004C97]/90 via-[#0073E6]/87 to-[#0A2540]/80" />
      <div className="absolute inset-0 ring-1 ring-cyan-400/40 rounded-3xl" />

      {/* CONTENT */}
      <div className="relative z-10 flex items-center gap-6 p-4">
        {/* LEFT BADGE */}
        <div
          className="
            relative flex flex-col items-center justify-center 
            w-40 h-32 rounded-e-full text-white font-bold
            shrink-0 overflow-hidden
            shadow-[0_0_25px_rgba(0,120,255,0.6)]
          "
        >
          <Image src={bg} alt="Badge" fill className="object-cover" />
          <div className="absolute inset-0 bg-linear-to-br from-[#0050B3]/50 to-[#0073E6]/50" />

          <div className="relative z-10 flex flex-col items-center px-2 text-center">
            <span className="text-[10px] tracking-widest uppercase">TYPE</span>
            <span className="text-sm font-extrabold mt-1">{item.type}</span>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 text-white">
          <h3 className="text-xl font-bold mb-1 drop-shadow-md">
            {item.product}
          </h3>

          <p className="text-sm opacity-95">{item.system}</p>

          <p className="mt-2 text-sm font-medium text-blue-100">
            Harga: Rp {item.hargaNett.toLocaleString("id-ID")}
          </p>

          <p className="text-sm font-extrabold text-cyan-300 drop-shadow">
            Harga + PPN: Rp {item.hargaNettPPN.toLocaleString("id-ID")}
          </p>
        </div>

        {/* ✅ SHARE BUTTON */}
        <button
          onClick={() => shareAsImage(item, bg)}
          className="
            px-4 py-2 rounded-xl
            bg-cyan-500/90 hover:bg-cyan-400
            text-white font-semibold
            shadow-[0_0_20px_rgba(34,211,238,0.7)]
            transition
          "
        >
          Share
        </button>

        {icon && (
          <div className="text-cyan-300 text-4xl opacity-90 mr-2 drop-shadow">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}
