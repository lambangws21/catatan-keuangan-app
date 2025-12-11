"use client";

import { useEffect, useMemo, useState } from "react";
import StepCard from "@/components/prices/new-step";
import type { PriceItem } from "@/app/api/price-list/route";

export default function StepsPage() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ FILTER STATE
  const [selectedSheet, setSelectedSheet] = useState("Sheet1");
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");

  // ✅ FETCH DATA BY SHEET
  useEffect(() => {
    setLoading(true);

    fetch(`/api/price-list?sheet=${selectedSheet}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        setItems(json.data);
        setSheets(json.sheets || []);
        setLoading(false);
      });
  }, [selectedSheet]);

  // ✅ UNIQUE TYPE
  const uniqueTypes = useMemo(() => {
    const types = items.map((i) => i.type);
    return ["All", ...Array.from(new Set(types))];
  }, [items]);

  // ✅ FILTERED ITEMS
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

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* ✅ HEADER */}
      <h1 className="text-3xl font-bold text-blue-700 mb-6">
        Zimmer Biomet • Price List
      </h1>

      {/* ✅ FILTER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">

        {/* ✅ FILTER SHEET */}
        <select
          className="px-4 py-2 border rounded-xl shadow-sm"
          value={selectedSheet}
          onChange={(e) => setSelectedSheet(e.target.value)}
        >
          {sheets.map((sheet) => (
            <option key={sheet} value={sheet}>
              {sheet}
            </option>
          ))}
        </select>

        {/* ✅ SEARCH */}
        <input
          type="text"
          placeholder="Cari product / system / type..."
          className="px-4 py-2 border rounded-xl shadow-sm md:col-span-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* ✅ TYPE FILTER */}
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

      {/* ✅ STEP CARDS */}
      <div className="flex flex-col gap-6">
        {filteredItems.length === 0 && (
          <div className="text-center text-gray-500 py-12">
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
