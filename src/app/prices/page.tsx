"use client";

import { useCallback, useEffect, useMemo, useState, useDeferredValue } from "react";
import StepCard from "@/components/prices/new-step";
import type { PriceItem } from "@/app/api/price-list/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCw, X } from "lucide-react";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function uniqStrings(arr: string[]) {
  return Array.from(new Set(arr));
}

export default function StepsPage() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ FILTER STATE
  const [selectedSheet, setSelectedSheet] = useState<string>("Sheet1");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [search, setSearch] = useState<string>("");

  // Smooth search render
  const deferredSearch = useDeferredValue(search);

  // ✅ SANITIZED SHEET OPTIONS (anti value="")
  const sheetOptions = useMemo(() => {
    const cleaned = sheets.filter(isNonEmptyString).map((s) => s.trim());
    const list = uniqStrings(cleaned);
    // fallback kalau API tidak kirim sheets
    if (list.length === 0) return [selectedSheet].filter(isNonEmptyString);
    return list;
  }, [sheets, selectedSheet]);

  // ✅ FETCH DATA BY SHEET
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const sheetParam = encodeURIComponent(selectedSheet);
      const res = await fetch(`/api/price-list?sheet=${sheetParam}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("Gagal mengambil data list harga");

      const json = (await res.json()) as {
        status?: string;
        message?: string;
        data?: PriceItem[];
        sheets?: string[];
      };

      if (json.status !== "success" || !Array.isArray(json.data)) {
        throw new Error(json.message || "Response list harga tidak valid");
      }

      const incomingSheets = Array.isArray(json.sheets) ? json.sheets : [];
      const cleanedSheets = uniqStrings(
        incomingSheets.filter(isNonEmptyString).map((s) => s.trim())
      );

      setItems(json.data);
      setSheets(cleanedSheets);

      // ✅ kalau sheet aktif tidak valid, pindahkan ke sheet pertama yang valid
      if (cleanedSheets.length > 0 && !cleanedSheets.includes(selectedSheet)) {
        setSelectedSheet(cleanedSheets[0]);
      }
    } catch (e) {
      setItems([]);
      setSheets([]);
      setError((e as Error).message || "Terjadi error saat memuat data");
    } finally {
      setLoading(false);
    }
  }, [selectedSheet]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ✅ UNIQUE TYPE (anti value="")
  const uniqueTypes = useMemo(() => {
    const types = items
      .map((i) => i.type)
      .filter(isNonEmptyString)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    return ["All", ...uniqStrings(types)];
  }, [items]);

  // ✅ FILTERED ITEMS
  const filteredItems = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();

    return items.filter((item) => {
      const itemType = (item.type ?? "").toString();
      const itemProduct = (item.product ?? "").toString();
      const itemSystem = (item.system ?? "").toString();

      const matchType = typeFilter === "All" || itemType === typeFilter;

      const matchSearch =
        q.length === 0 ||
        itemProduct.toLowerCase().includes(q) ||
        itemSystem.toLowerCase().includes(q) ||
        itemType.toLowerCase().includes(q);

      return matchType && matchSearch;
    });
  }, [items, typeFilter, deferredSearch]);

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("All");
  };

  const canReset = search.trim().length > 0 || typeFilter !== "All";

  return (
    <div className="relative isolate">
      <div className="pointer-events-none absolute -top-24 right-[-10%] h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.22),transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-[-15%] h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_70%)] blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8 text-(--dash-ink)">
        {/* HEADER */}
        <header className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 sm:p-6 shadow-[0_20px_60px_rgba(2,6,23,0.45)] backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
                List Harga
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl font-semibold font-(--font-display)]">
                Zimmer Biomet • Price List
              </h1>
              <p className="mt-2 text-sm text-(--dash-muted)]">
                Cari cepat berdasarkan product, system, dan type.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={fetchItems}
                variant="secondary"
                className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>

              {canReset && (
                <Button
                  onClick={clearFilters}
                  variant="secondary"
                  className="border border-white/10 bg-white/5 text-(--dash-muted)] hover:bg-white/10"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* FILTER BAR */}
          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <label className="mb-1 block text-[11px] font-medium text-(--dash-muted)]">
                Sheet
              </label>

              <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                <SelectTrigger className="w-full rounded-2xl border-white/10 bg-white/5 text-(--dash-ink)] shadow-inner">
                  <SelectValue placeholder="Pilih sheet" />
                </SelectTrigger>

                <SelectContent className="rounded-2xl border-white/10 bg-slate-950 text-slate-100">
                  {sheetOptions
                    .filter(isNonEmptyString) // ✅ anti empty
                    .map((sheet) => (
                      <SelectItem key={sheet} value={sheet}>
                        {sheet}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-6">
              <label className="mb-1 block text-[11px] font-medium text-(--dash-muted)]">
                Search
              </label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--dash-muted)]" />
                <Input
                  type="search"
                  placeholder="Cari product / system / type…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 rounded-2xl border-white/10 bg-white/5 pl-10 text-(--dash-ink)]"
                />
              </div>
            </div>

            <div className="lg:col-span-3">
              <label className="mb-1 block text-[11px] font-medium text-(--dash-muted)]">
                Type
              </label>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full rounded-2xl border-white/10 bg-white/5 text-(--dash-ink)] shadow-inner">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>

                <SelectContent className="rounded-2xl border-white/10 bg-slate-950 text-slate-100">
                  {uniqueTypes
                    .filter(isNonEmptyString) // ✅ anti empty
                    .map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-(--dash-muted)]">
            <span>
              Hasil:{" "}
              <span className="font-semibold text-(--dash-ink)] tabular-nums">
                {filteredItems.length}
              </span>
            </span>
            <span className="text-[11px]">
              Sheet aktif:{" "}
              <span className="font-semibold text-(--dash-ink)]">
                {selectedSheet}
              </span>
            </span>
          </div>
        </header>

        {/* ERROR */}
        {error ? (
          <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 text-(--dash-ink)]">
            <p className="text-sm font-semibold">Gagal memuat list harga</p>
            <p className="mt-1 text-sm text-(--dash-muted)]">{error}</p>
            <div className="mt-4">
              <Button onClick={fetchItems} className="bg-rose-500 text-slate-950 hover:bg-rose-400">
                <RefreshCw className="mr-2 h-4 w-4" />
                Coba lagi
              </Button>
            </div>
          </div>
        ) : null}

        {/* CONTENT */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-(--dash-surface)] p-5 shadow-[0_20px_60px_rgba(2,6,23,0.35)]"
              >
                <div className="h-5 w-40 rounded bg-white/10" />
                <div className="mt-3 h-4 w-72 rounded bg-white/10" />
                <div className="mt-4 h-10 w-full rounded-2xl bg-white/10" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredItems.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-(--dash-surface)] p-10 text-center text-sm text-(--dash-muted)]">
                Data tidak ditemukan.
              </div>
            ) : (
              filteredItems.map((item) => <StepCard key={item.no} item={item} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
