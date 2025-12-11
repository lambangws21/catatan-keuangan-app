"use client";

import { useState } from "react";
import Scanner from "@/components/scaner/scaner";

export default function ScanPage() {
  const [ref, setRef] = useState("");
  const [lot, setLot] = useState("");
  const [exp, setExp] = useState("");

  return (
    <div className="max-w-md mx-auto space-y-4 p-4">
      <h2 className="text-lg font-semibold">📷 Scan Barcode Implant</h2>

      <Scanner
        onDetected={(data) => {
          setRef(data.ref);
          setLot(data.lot);
          if (data.exp) setExp(data.exp);
        }}
      />

      <div className="bg-zinc-900 p-4 rounded-lg space-y-2 text-sm">
        <div>
          <label className="text-gray-400">REF</label>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            className="w-full p-2 rounded bg-zinc-800"
          />
        </div>

        <div>
          <label className="text-gray-400">LOT</label>
          <input
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            className="w-full p-2 rounded bg-zinc-800"
          />
        </div>

        <div>
          <label className="text-gray-400">EXP (AI 17)</label>
          <input
            value={exp}
            onChange={(e) => setExp(e.target.value)}
            className="w-full p-2 rounded bg-zinc-800"
          />
        </div>
      </div>
    </div>
  );
}
