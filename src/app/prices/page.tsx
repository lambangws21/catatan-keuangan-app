"use client";

import { useEffect, useMemo, useState } from "react";
import StepCard from "@/components/prices/new-step";
import type { PriceItem } from "@/app/api/price-list/route";

export default function StepsPage() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ FILTER BY TYPE
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/price-list", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        setItems(json.data);
        setLoading(false);
      });
  }, []);

  // ✅ UNIQUE TYPE UNTUK DROPDOWN
  const uniqueTypes = useMemo(() => {
    const types = items.map((i) => i.type);
    return ["All", ...Array.from(new Set(types))];
  }, [items]);

  // ✅ FILTER + SEARCH LOGIC
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchType =
        typeFilter === "All" || item.type === typeFilter;

      const matchSearch =
        item.product.toLowerCase().includes(search.toLowerCase()) ||
        item.system.toLowerCase().includes(search.toLowerCase()) ||
        item.type.toLowerCase().includes(search.toLowerCase());

      return matchType && matchSearch;
    });
  }, [items, typeFilter, search]);

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* ======================= */}
      {/* ✅ HEADER */}
      {/* ======================= */}
      <h1 className="text-3xl font-bold text-blue-700 mb-6">
        Zimmer Biomet • Implant Steps
      </h1>

      {/* ======================= */}
      {/* ✅ FILTER BAR */}
      {/* ======================= */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        {/* SEARCH */}
        <input
          type="text"
          placeholder="Cari product / system / type..."
          className="w-full md:w-1/2 px-4 py-2 border rounded-xl shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* TYPE FILTER */}
        <select
          className="px-4 py-2 border rounded-xl shadow-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          {uniqueTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* ======================= */}
      {/* ✅ STEP CARDS */}
      {/* ======================= */}
      <div className="flex flex-col gap-6">
        {filteredItems.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            Data tidak ditemukan
          </div>
        )}

        {filteredItems.map((item) => (
          <StepCard key={item.no} item={item} />
        ))}
      </div>
    </div>
  );
}
