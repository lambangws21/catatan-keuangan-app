"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Camera } from "lucide-react";
import Scanner from "@/components/scaner/scaner";

/* ============================
   TYPES
=============================== */
interface Props {
  implant: string;
  batch: string;
  setImplant: (v: string) => void;
  setBatch: (v: string) => void;
}

interface ImplantStockItemLite {
  description: string;
  batch: string;
}

export function StockFilter({ implant, batch, setImplant, setBatch }: Props) {
  const [allImplants, setAllImplants] = useState<string[]>([]);
  const [allBatches, setAllBatches] = useState<string[]>([]);

  const [showImplantSuggest, setShowImplantSuggest] = useState(false);
  const [showBatchSuggest, setShowBatchSuggest] = useState(false);

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const implantRef = useRef<HTMLDivElement | null>(null);
  const batchRef = useRef<HTMLDivElement | null>(null);

  /* ====== MODAL CAMERA ====== */
  const [showScanner, setShowScanner] = useState(false);

  /* ============================================================
        LOAD DATA
  ============================================================ */
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/implant-stock");
      const json = await res.json();

      const raw = Array.isArray(json?.data) ? json.data : [];

      const typedData: ImplantStockItemLite[] = raw.map((row: unknown) => {
        const obj = row as Record<string, unknown>;
        return {
          description: typeof obj.description === "string" ? obj.description : "",
          batch: typeof obj.batch === "string" ? obj.batch : "",
        };
      });

      const implants = [...new Set(typedData.map((d) => d.description.toLowerCase()))];
      const batches = [...new Set(typedData.map((d) => d.batch.toLowerCase()))];

      setAllImplants(implants);
      setAllBatches(batches);
    }

    load();
  }, []);

  /* ============================================================
      AUTOSUGGEST
  ============================================================ */
  const filteredImplants = useMemo(() => {
    if (!implant.trim()) return allImplants.slice(0, 5);
    return allImplants.filter((i) => i.includes(implant.toLowerCase())).slice(0, 5);
  }, [implant, allImplants]);

  const filteredBatches = useMemo(() => {
    if (!batch.trim()) return allBatches.slice(0, 5);
    return allBatches.filter((b) => b.includes(batch.toLowerCase())).slice(0, 5);
  }, [batch, allBatches]);

  /* ============================================================
      CLOSE ON OUTSIDE CLICK
  ============================================================ */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (implantRef.current && !implantRef.current.contains(e.target as Node))
        setShowImplantSuggest(false);

      if (batchRef.current && !batchRef.current.contains(e.target as Node))
        setShowBatchSuggest(false);
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ============================================================
      HIGHLIGHT
  ============================================================ */
  const highlight = (text: string, keyword: string): string => {
    if (!keyword.trim()) return text;
    return text.replace(
      new RegExp(`(${keyword})`, "gi"),
      `<mark class="bg-yellow-300/70">$1</mark>`
    );
  };

  /* ============================================================
      KEYBOARD NAVIGATION
  ============================================================ */
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    suggestions: string[],
    setter: (v: string) => void,
    close: () => void
  ) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) {
        setter(suggestions[selectedIndex]);
        close();
      }
    }
  };

  /* ============================================================
        UI + SCANNER + AUTOSUGGEST
  ============================================================ */
  return (
    <div className="flex flex-col gap-2 mb-4 md:flex-row relative">

      {/* ================= IMPLANT FIELD ================= */}
      <div ref={implantRef} className="relative w-full md:w-64">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />

        <input
          value={implant}
          onChange={(e) => {
            setImplant(e.target.value);
            setShowImplantSuggest(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={(e) =>
            handleKeyDown(e, filteredImplants, setImplant, () =>
              setShowImplantSuggest(false)
            )
          }
          placeholder="Filter Implant / REF"
          className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
          onFocus={() => setShowImplantSuggest(true)}
        />

        {/* Autosuggest REF */}
        {showImplantSuggest && filteredImplants.length > 0 && (
          <div className="absolute z-20 bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-lg w-full mt-1 shadow-xl max-h-48 overflow-y-auto">
            {filteredImplants.map((item, i) => (
              <div
                key={item}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  selectedIndex === i
                    ? "bg-blue-100 dark:bg-blue-900/40"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                onClick={() => {
                  setImplant(item);
                  setShowImplantSuggest(false);
                }}
                dangerouslySetInnerHTML={{ __html: highlight(item, implant) }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ================= BATCH FIELD ================= */}
      <div ref={batchRef} className="relative w-full md:w-64">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />

        <input
          value={batch}
          onChange={(e) => {
            setBatch(e.target.value);
            setShowBatchSuggest(true);
            setSelectedIndex(-1);
          }}
          onKeyDown={(e) =>
            handleKeyDown(e, filteredBatches, setBatch, () =>
              setShowBatchSuggest(false)
            )
          }
          placeholder="Filter Batch / LOT"
          className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
          onFocus={() => setShowBatchSuggest(true)}
        />

        {/* Autosuggest LOT */}
        {showBatchSuggest && filteredBatches.length > 0 && (
          <div className="absolute z-20 bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-lg w-full mt-1 shadow-xl max-h-48 overflow-y-auto">
            {filteredBatches.map((item, i) => (
              <div
                key={item}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  selectedIndex === i
                    ? "bg-blue-100 dark:bg-blue-900/40"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
                onClick={() => {
                  setBatch(item);
                  setShowBatchSuggest(false);
                }}
                dangerouslySetInnerHTML={{ __html: highlight(item, batch) }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ================= CAMERA BUTTON ================= */}
      <button
        onClick={() => setShowScanner(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Camera size={18} />
        Scan
      </button>

      {/* ================= SCANNER MODAL ================= */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl w-[90%] max-w-md space-y-3 shadow-xl">
            <h2 className="text-lg font-semibold">Scan Barcode GS1</h2>

            <Scanner
              onDetected={(data) => {
                if (data.ref) setImplant(data.ref);
                if (data.lot) setBatch(data.lot);

                setShowScanner(false); // close modal after scan
              }}
            />

            <button
              onClick={() => setShowScanner(false)}
              className="mt-3 w-full py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
