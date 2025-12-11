"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImplantStockItem } from "@/types/implant-stock";

import { Pencil, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, FileSpreadsheet, RefreshCcw } from "lucide-react";

import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import { EditStockModal } from "./EditStockModal";
import { StockFilter } from "./StockFilter";

interface StockTableProps {
  reloadKey?: number;
}

type SortField = keyof ImplantStockItem | null;
type SortOrder = "asc" | "desc";

export default function StockTableAdvanced({ reloadKey }: StockTableProps) {
  const [data, setData] = useState<ImplantStockItem[]>([]);
  const [, setLoading] = useState<boolean>(true);

  const [search, setSearch] = useState<string>("");
  const [batchValue, setBatchValue] = useState<string>("");

  const [editingItem, setEditingItem] = useState<ImplantStockItem | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  /* --------------------------------------------
     LOAD DATA
  --------------------------------------------- */
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const res = await fetch("/api/implant-stock");
      const json = await res.json();

      const safeData: ImplantStockItem[] = Array.isArray(json?.data) ? json.data : [];
      setData(safeData);
    } catch (err) {
      console.error("Gagal load data:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, reloadKey]);


  /* --------------------------------------------
     DELETE HANDLER
  --------------------------------------------- */
  const handleDelete = async (id: string) => {
    await fetch(`/api/implant-stock/${id}`, { method: "DELETE" });
    loadData();
  };


  /* --------------------------------------------
     EDIT HANDLER
  --------------------------------------------- */
  const handleEditClick = (item: ImplantStockItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };


  /* --------------------------------------------
     EXPORT EXCEL
  --------------------------------------------- */
  const exportToExcel = () => {
    const sheetData = data.map((i) => ({
      NO: i.no,
      "No Stok": i.stockNo,
      Deskripsi: i.description,
      Batch: i.batch,
      Qty: i.qty,
      TotalQty: i.totalQty,
      Terpakai: i.used,
      Refill: i.refill,
      Keterangan: i.note,
      CreatedAt: i.createdAt,
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock");

    XLSX.writeFile(wb, "ImplantStock-Advanced.xlsx");
  };


  /* --------------------------------------------
     FILTER + SEARCH
  --------------------------------------------- */
  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        item.description.toLowerCase().includes(search.toLowerCase()) &&
        item.batch.toLowerCase().includes(batchValue.toLowerCase())
    );
  }, [data, search, batchValue]);


  /* --------------------------------------------
     SORTING
  --------------------------------------------- */
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }

      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredData, sortField, sortOrder]);


  /* --------------------------------------------
     PAGINATION
  --------------------------------------------- */
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginated = sortedData.slice((page - 1) * rowsPerPage, page * rowsPerPage);


  /* --------------------------------------------
     UI COMPONENT
  --------------------------------------------- */
  const renderSortIcon = (field: SortField) => (
    <ArrowUpDown
      size={16}
      className={`inline ml-1 ${sortField === field ? "text-blue-600" : "text-zinc-400"}`}
    />
  );


  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow space-y-4 relative">

      {/* ACTION BAR */}
      <div className="flex flex-col md:flex-row justify-between gap-3 items-center">
        <div>
          <h2 className="text-lg font-semibold">📦 Advanced Stock Manager</h2>
          <p className="text-xs text-zinc-500">Sorting • Pagination • Export • Mobile Premium</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            <FileSpreadsheet size={16} /> Export
          </button>

          <button
            onClick={loadData}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <RefreshCcw size={16} /> Reload
          </button>
        </div>
      </div>

      {/* SEARCH + FILTER */}
      <StockFilter
        implant={search}
        batch={batchValue}
        setImplant={setSearch}
        setBatch={setBatchValue}
      />

      {/* TABLE — Desktop */}
      <div className="hidden md:block overflow-x-auto rounded-lg border dark:border-zinc-700">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-800 sticky top-0 z-10">
            <tr>
              {[
                ["stockNo", "No Stok"],
                ["description", "Deskripsi"],
                ["batch", "Batch"],
                ["qty", "Qty"],
                ["totalQty", "TotalQty"],
                ["used", "Terpakai"],
                ["refill", "Refill"],
                ["note", "Ket."],
              ].map(([field, label]) => (
                <th
                  key={field}
                  className="px-3 py-2 cursor-pointer"
                  onClick={() => {
                    setSortField(field as SortField);
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  }}
                >
                  {label} {renderSortIcon(field as SortField)}
                </th>
              ))}

              <th className="px-3 py-2 text-center">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((item) => (
              <tr key={item.id} className="border-b dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                <td className="px-3 py-2">{item.stockNo}</td>
                <td className="px-3 py-2">{item.description}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded text-xs">
                    {item.batch}
                  </span>
                </td>
                <td className="px-3 py-2">{item.qty}</td>
                <td className="px-3 py-2">{item.totalQty}</td>
                <td className="px-3 py-2">{item.used}</td>
                <td className="px-3 py-2">{item.refill}</td>
                <td className="px-3 py-2">{item.note}</td>

                <td className="px-3 py-2 text-center flex gap-3 justify-center">
                  <button onClick={() => handleEditClick(item)} className="text-blue-600 hover:text-blue-700">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-3">
        {paginated.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="p-4 rounded-lg border dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
          >
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-semibold">{item.description}</p>
                <p className="text-xs text-zinc-500">Batch: {item.batch}</p>
              </div>

              <div className="flex gap-2">
                <button className="text-blue-600" onClick={() => handleEditClick(item)}>
                  <Pencil size={16} />
                </button>
                <button className="text-red-600" onClick={() => handleDelete(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 mt-3 text-xs">
              <p>Qty: {item.qty}</p>
              <p>Total: {item.totalQty}</p>
              <p>Used: {item.used}</p>
              <p>Refill: {item.refill}</p>
              <p className="col-span-2">Ket: {item.note}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center pt-2">
        <div className="flex gap-1">
          <select
            className="px-2 py-1 rounded border text-sm dark:bg-zinc-800 dark:border-zinc-700"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10 baris</option>
            <option value={25}>25 baris</option>
            <option value={50}>50 baris</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-2 disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-sm">
            {page} / {totalPages || 1}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="p-2 disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* EDIT MODAL */}
      <EditStockModal open={modalOpen} item={editingItem} onClose={() => setModalOpen(false)} onSaved={loadData} />
    </div>
  );
}
