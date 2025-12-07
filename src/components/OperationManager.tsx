"use client";

import { useState, useMemo, useCallback } from "react";
import { User } from "firebase/auth";
import { Trash2, Wallet, ArchiveX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import Spinner from "./Spinner";

import jsPDF from "jspdf";
import "jspdf-autotable";

// =========================
// INTERFACE
// =========================
interface Operation {
  id: string;
  date: string;
  dokter: string;
  tindakanOperasi: string;
  rumahSakit: string;
  jumlah: number | string;
  klaim: string;
  namaPerawat: string;
}

interface ManagerProps {
  operationsData: Operation[];
  isLoading: boolean;
  onDataChange: () => Promise<void>;
  user: User;
}

// =========================
// HELPERS
// =========================
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const toDateOnly = (d: Date) => d.toISOString().split("T")[0];

// =========================
// COMPONENT
// =========================
export default function OperationManager({
  operationsData,
  isLoading,
  onDataChange,
  user,
}: ManagerProps) {
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterQuery, setFilterQuery] = useState("");

  // =========================
  // PRESET FILTER
  // =========================
  const setToday = () => {
    const today = toDateOnly(new Date());
    setFilterFrom(today);
    setFilterTo(today);
  };

  const setThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setFilterFrom(toDateOnly(first));
    setFilterTo(toDateOnly(last));
  };

  const resetFilter = () => {
    setFilterFrom("");
    setFilterTo("");
    setFilterQuery("");
  };

  // =========================
  // FILTER LOGIC
  // =========================
  const filteredData = useMemo(() => {
    return operationsData
      .filter((op) => {
        const opDate = new Date(op.date).getTime();

        const fromMatch = filterFrom
          ? opDate >= new Date(filterFrom).getTime()
          : true;

        const toMatch = filterTo
          ? opDate <= new Date(filterTo).getTime()
          : true;

        const queryMatch = filterQuery
          ? [op.dokter, op.tindakanOperasi, op.rumahSakit, op.klaim]
              .join(" ")
              .toLowerCase()
              .includes(filterQuery.toLowerCase())
          : true;

        return fromMatch && toMatch && queryMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [operationsData, filterFrom, filterTo, filterQuery]);

  // =========================
  // TOTAL DARI FILTER
  // =========================
  const totalFiltered = useMemo(() => {
    return filteredData.reduce((sum, op) => sum + Number(op.jumlah), 0);
  }, [filteredData]);

  // =========================
  // DELETE
  // =========================
  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Hapus data ini?")) return;

      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/operasi/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Gagal menghapus data");

        toast.success("Data dihapus");
        await onDataChange();
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [user, onDataChange]
  );

  // =========================
  // EXPORT CSV (FILTERED)
  // =========================
  const handleExportCSV = () => {
    if (filteredData.length === 0) return toast.error("Data kosong");

    const headers = ["Tanggal", "Dokter", "Tindakan", "RS", "Jumlah", "Klaim"];

    const rows = filteredData.map((op) =>
      [
        op.date,
        op.dokter,
        op.tindakanOperasi,
        op.rumahSakit,
        op.jumlah,
        op.klaim,
      ].join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laporan-filtered.csv";
    a.click();
  };

  // =========================
  // EXPORT PDF (FILTERED)
  // =========================
  const handleExportPDF = () => {
    if (filteredData.length === 0) return toast.error("Data kosong");

    const doc = new jsPDF();

    const tableCols = ["Tanggal", "Dokter", "Tindakan", "RS", "Jumlah", "Klaim"];
    const tableRows = filteredData.map((op) => [
      op.date,
      op.dokter,
      op.tindakanOperasi,
      op.rumahSakit,
      formatCurrency(Number(op.jumlah)),
      op.klaim,
    ]);

    doc.text("Laporan Operasi (Filtered)", 14, 15);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      head: [tableCols],
      body: tableRows,
      startY: 20,
    });

    doc.save("laporan-filtered.pdf");
  };

  // =========================
  // RENDER
  // =========================
  if (isLoading) {
    return (
      <div className="text-center p-8">
        <Spinner />
      </div>
    );
  }

  return (
    <motion.div className="bg-gray-800/60 border border-white/10 rounded-lg shadow-lg p-6 text-white">
      <h2 className="text-xl font-semibold mb-4 text-cyan-400">
        Riwayat Data Operasi
      </h2>

      {/* FILTER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
        <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
        <Input
          placeholder="Cari dokter / tindakan / RS / klaim"
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
        />

        <div className="flex gap-2">
          <Button onClick={setToday} variant="outline">Hari Ini</Button>
          <Button onClick={setThisMonth} variant="outline">Bulan Ini</Button>
          <Button onClick={resetFilter} variant="secondary">Reset</Button>
        </div>
      </div>

      {/* TOTAL FILTERED */}
      <div className="mb-6 p-4 bg-gray-700/50 rounded-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-gray-400" />
          <h3 className="text-md font-semibold text-gray-300">
            Total (Hasil Filter)
          </h3>
        </div>
        <p className="text-2xl font-bold text-cyan-400">
          {formatCurrency(totalFiltered)}
        </p>
      </div>

      {/* EXPORT */}
      <div className="flex gap-3 mb-4">
        <Button onClick={handleExportCSV} className="bg-green-600 hover:bg-green-700">
          Export CSV
        </Button>
        <Button onClick={handleExportPDF} className="bg-red-600 hover:bg-red-700">
          Export PDF
        </Button>
      </div>

      {/* TABLE */}
      {filteredData.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
          <ArchiveX className="h-12 w-12 mx-auto mb-4" />
          Tidak ada data sesuai filter
        </div>
      ) : (
        <div className="overflow-auto max-h-[480px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Dokter</TableHead>
                <TableHead>Tindakan</TableHead>
                <TableHead>Rumah Sakit</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Klaim</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id} className="border-b border-gray-700">
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.dokter}</TableCell>
                  <TableCell>{item.tindakanOperasi}</TableCell>
                  <TableCell>{item.rumahSakit}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(item.jumlah))}
                  </TableCell>
                  <TableCell>{item.klaim}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </motion.div>
  );
}
