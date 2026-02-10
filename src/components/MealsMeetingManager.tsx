"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  CalendarDays,
  CheckCircle2,
  FileDown,
  FileText,
  Handshake,
  Image as ImageIcon,
  MapPin,
  Pencil,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { storage } from "@/lib/firebase/client";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CurrencyInput } from "@/components/CurencyInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MEALS_TYPE,
  normalizeMealsPaymentSource,
  type MealsPaymentSource,
} from "@/lib/transactions";

interface Transaction {
  id: string;
  tanggal: string;
  jenisBiaya: string;
  keterangan: string;
  jumlah: number;
  klaim: string;
  fileUrl?: string;
  sumberBiaya?: MealsPaymentSource | string | null;
}

interface MealsMeetingManagerProps {
  transactions: Transaction[];
  isLoading: boolean;
  onDataChange: () => Promise<void>;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

const exportTag = () => new Date().toISOString().split("T")[0];

const stripMetaLines = (text: string) =>
  String(text || "")
    .split(/\r?\n/g)
    .filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.length > 0 &&
        !/^lokasi\s*:/i.test(trimmed) &&
        !/^peserta\s*:/i.test(trimmed)
      );
    })
    .join("\n")
    .trim();

const extractMeta = (text: string) => {
  const lines = String(text || "").split(/\r?\n/g).map((l) => l.trim());
  const lokasi = lines.find((l) => /^lokasi\s*:/i.test(l))?.replace(/^lokasi\s*:/i, "").trim();
  const peserta = lines.find((l) => /^peserta\s*:/i.test(l))?.replace(/^peserta\s*:/i, "").trim();
  const note = stripMetaLines(text);
  return { note, lokasi: lokasi || "", peserta: peserta || "" };
};

function buildKeterangan(note: string, lokasi: string, peserta: string) {
  const cleanNote = stripMetaLines(note);
  const parts = [
    cleanNote || "",
    lokasi.trim() ? `Lokasi: ${lokasi.trim()}` : "",
    peserta.trim() ? `Peserta: ${peserta.trim()}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

export default function MealsMeetingManager({
  transactions,
  isLoading,
  onDataChange,
}: MealsMeetingManagerProps) {
  const meals = useMemo(
    () => transactions.filter((t) => t.jenisBiaya === MEALS_TYPE),
    [transactions]
  );

  const totalMeals = useMemo(
    () => meals.reduce((sum, t) => sum + Number(t.jumlah), 0),
    [meals]
  );

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [jumlah, setJumlah] = useState<number | undefined>(350_000);
  const [klaim, setKlaim] = useState("Lambang");
  const [sumberBiaya, setSumberBiaya] = useState<MealsPaymentSource>("deposit");
  const [keterangan, setKeterangan] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [peserta, setPeserta] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetForm = () => {
    setTanggal(new Date().toISOString().split("T")[0]);
    setJumlah(350_000);
    setKlaim("Lambang");
    setSumberBiaya("deposit");
    setKeterangan("");
    setLokasi("");
    setPeserta("");
    setBerkas(null);
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setTanggal(tx.tanggal);
    setJumlah(Number(tx.jumlah));
    setKlaim(tx.klaim || "");
    setSumberBiaya(normalizeMealsPaymentSource(tx.sumberBiaya) ?? "deposit");
    const meta = extractMeta(tx.keterangan || "");
    setKeterangan(meta.note);
    setLokasi(meta.lokasi);
    setPeserta(meta.peserta);
    setBerkas(null);
    setPreviewUrl(tx.fileUrl || null);
    setIsDialogOpen(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    const file = e.target.files?.[0] ?? null;
    setBerkas(file);
    if (file && file.type.startsWith("image/")) setPreviewUrl(URL.createObjectURL(file));
    else setPreviewUrl(previewUrl && !previewUrl.startsWith("blob:") ? previewUrl : null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tanggal) return toast.error("Tanggal wajib diisi");
    if (!jumlah) return toast.error("Jumlah wajib diisi");
    if (!klaim.trim()) return toast.error("Nama klaim wajib diisi");

    setIsSubmitting(true);
    try {
      let fileUrl = editing?.fileUrl || "";

      if (berkas) {
        const storageRef = ref(storage, `berkas/meals_${Date.now()}_${berkas.name}`);
        const snapshot = await uploadBytes(storageRef, berkas);
        fileUrl = await getDownloadURL(snapshot.ref);
      }

      const payload = {
        tanggal,
        jenisBiaya: MEALS_TYPE,
        keterangan: buildKeterangan(keterangan, lokasi, peserta),
        jumlah: Number(jumlah),
        klaim: klaim.trim(),
        fileUrl,
        sumberBiaya,
      };

      const url = editing ? `/api/transactions/${editing.id}` : "/api/transactions";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Gagal menyimpan Meals Metting");
      await onDataChange();

      if (editing) {
        toast.success("Meals Metting berhasil diperbarui");
        setIsDialogOpen(false);
        setEditing(null);
      } else {
        toast.success("Meals Metting berhasil disimpan");
        resetForm();
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus data Meals Metting ini?")) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus data");
      await onDataChange();
      toast.success("Data dihapus");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleExportExcel = () => {
    if (!meals.length) return toast.error("Data kosong");
    const sorted = meals.slice().sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const dataToExport = sorted.map((tx) => {
      const meta = extractMeta(tx.keterangan || "");
      return {
        Tanggal: tx.tanggal,
        Klaim: tx.klaim,
        "Sumber Biaya": normalizeMealsPaymentSource(tx.sumberBiaya) ?? "deposit",
        Lokasi: meta.lokasi,
        Peserta: meta.peserta,
        Keterangan: meta.note,
        Jumlah: Number(tx.jumlah),
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Meals Metting");
    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 18 },
      { wch: 20 },
      { wch: 24 },
      { wch: 40 },
      { wch: 14 },
    ];
    XLSX.writeFile(workbook, `Meals_Metting_${exportTag()}.xlsx`);
  };

  const handleExportPdf = () => {
    if (!meals.length) return toast.error("Data kosong");
    const doc = new jsPDF();
    doc.text(`Laporan Meals Metting (${exportTag()})`, 14, 16);
    const sorted = meals.slice().sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    autoTable(doc, {
      head: [["Tanggal", "Klaim", "Keterangan", "Jumlah"]],
      body: sorted.map((tx) => [
        tx.tanggal,
        tx.klaim,
        stripMetaLines(tx.keterangan || ""),
        formatCurrency(Number(tx.jumlah)),
      ]),
      startY: 22,
      headStyles: { fillColor: [38, 145, 158] },
    });
    doc.save(`Meals_Metting_${exportTag()}.pdf`);
  };

  const card = "rounded-3xl border border-white/10 bg-(--dash-surface)] shadow-[0_20px_60px_rgba(2,6,23,0.45)]";

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${card} p-6 text-(--dash-ink)]`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)]">
            Kategori Khusus
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold">
            <Handshake className="h-5 w-5 text-amber-300" />
            Meals Metting
          </h2>
          <p className="mt-1 text-sm text-(--dash-muted)]">
            Simpan dan pantau pengeluaran kategori Meals Metting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleExportExcel}
            variant="secondary"
            className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button
            onClick={handleExportPdf}
            variant="secondary"
            className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
          >
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openCreate}
                className="bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                Tambah
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[720px] border-white/10 bg-slate-950 text-(--dash-ink)]">
              <DialogHeader>
                <DialogTitle className="text-(--dash-ink)]">
                  {editing ? "Edit Meals Metting" : "Input Meals Metting"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="meals-tanggal">Tanggal</Label>
                    <Input
                      id="meals-tanggal"
                      type="date"
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      className="border-white/10 bg-white/5 text-(--dash-ink)]"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="meals-jumlah">Jumlah (Rp)</Label>
                    <CurrencyInput
                      id="meals-jumlah"
                      placeholder="2.000.000"
                      value={jumlah || ""}
                      onValueChange={(v) => setJumlah(v)}
                      className="border-white/10 bg-white/5 text-(--dash-ink)]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="meals-klaim">Nama Klaim</Label>
                    <Input
                      id="meals-klaim"
                      value={klaim}
                      onChange={(e) => setKlaim(e.target.value)}
                      placeholder="Contoh: Proyek A"
                      className="border-white/10 bg-white/5 text-(--dash-ink)]"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Sumber Biaya</Label>
                    <Select value={sumberBiaya} onValueChange={(v) => setSumberBiaya(v as MealsPaymentSource)}>
                      <SelectTrigger className="border-white/10 bg-white/5 text-(--dash-ink)]">
                        <SelectValue placeholder="Pilih sumber biaya" />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-(--dash-surface-strong)] text-(--dash-ink)]">
                        <SelectItem value="deposit">Deposit</SelectItem>
                        <SelectItem value="mandiri">Mandiri</SelectItem>
                        <SelectItem value="kantor">Kantor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="meals-peserta">Peserta (opsional)</Label>
                    <Input
                      id="meals-peserta"
                      value={peserta}
                      onChange={(e) => setPeserta(e.target.value)}
                      placeholder="Contoh: Pak A, Bu B"
                      className="border-white/10 bg-white/5 text-(--dash-ink)]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="meals-lokasi">Lokasi (opsional)</Label>
                    <Input
                      id="meals-lokasi"
                      value={lokasi}
                      onChange={(e) => setLokasi(e.target.value)}
                      placeholder="Contoh: Cafe X"
                      className="border-white/10 bg-white/5 text-(--dash-ink)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="meals-file">Bukti (opsional)</Label>
                    <Input
                      id="meals-file"
                      type="file"
                      onChange={handleFileChange}
                      className="border-white/10 bg-white/5 text-(--dash-ink)] file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1 file:text-slate-950 hover:file:bg-amber-400"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-(--dash-muted)]">Info</Label>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-(--dash-muted)]">
                      {sumberBiaya === "deposit"
                        ? "Deposit: masuk hitung pengeluaran"
                        : "Mandiri/Kantor: tidak masuk pengeluaran"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="meals-keterangan">Keterangan</Label>
                  <Textarea
                    id="meals-keterangan"
                    value={keterangan}
                    onChange={(e) => setKeterangan(e.target.value)}
                    placeholder="Catatan / tujuan meeting…"
                    className="min-h-[110px] border-white/10 bg-white/5 text-(--dash-ink)]"
                    required
                  />
                </div>

                {previewUrl ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Preview Bukti</p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setBerkas(null);
                          if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
                          setPreviewUrl(editing?.fileUrl || null);
                        }}
                        className="hover:bg-white/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 relative aspect-video w-full overflow-hidden rounded-xl border border-white/10">
                      <Image
                        src={previewUrl}
                        alt="Preview bukti"
                        fill
                        className="object-contain bg-black/20"
                        sizes="(max-width: 640px) 100vw, 720px"
                      />
                    </div>
                  </div>
                ) : null}

                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                  <div className="text-xs text-(--dash-muted)]">
                    Disimpan sebagai transaksi: <span className="font-semibold">{MEALS_TYPE}</span>
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-60"
                  >
                    {isSubmitting ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan & Tambah Lagi"}
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
            Total Meals
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[11px] text-(--dash-muted)]">
              <Wallet className="h-4 w-4" />
              <span>Jumlah</span>
            </div>
            <p className="text-lg font-semibold text-amber-300 tabular-nums">
              {formatCurrency(totalMeals)}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
            Entri
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[11px] text-(--dash-muted)]">
              <Handshake className="h-4 w-4" />
              <span>Jumlah data</span>
            </div>
            <p className="text-lg font-semibold tabular-nums">{meals.length}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)]">
            Export
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-[11px] text-(--dash-muted)]">
              <FileText className="h-4 w-4" />
              <span>Nama file</span>
            </div>
            <p className="text-sm font-semibold tabular-nums">{exportTag()}</p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="mt-6">
        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-sm text-(--dash-muted)]">
            Memuat...
          </div>
        ) : meals.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-(--dash-muted)]">
            Belum ada data Meals Metting.
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {meals.slice(0, 12).map((tx) => {
                const meta = extractMeta(tx.keterangan || "");
                return (
                  <div
                    key={tx.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">
                          {formatCurrency(Number(tx.jumlah))}
                        </p>
                        <p className="mt-1 text-xs text-(--dash-muted)]">
                          {tx.klaim}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(tx)}
                          className="hover:bg-white/10"
                        >
                          <Pencil className="h-4 w-4 text-amber-300" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(tx.id)}
                          className="hover:bg-white/10"
                        >
                          <Trash2 className="h-4 w-4 text-rose-300" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-(--dash-muted)]">
                      <p className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        <span className="tabular-nums">{tx.tanggal}</span>
                      </p>
                      {meta.lokasi ? (
                        <p className="inline-flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{meta.lokasi}</span>
                        </p>
                      ) : null}
                      {meta.peserta ? (
                        <p className="inline-flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span className="truncate">{meta.peserta}</span>
                        </p>
                      ) : null}
                      <p className="inline-flex items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4" />
                        <span className="line-clamp-3 whitespace-pre-line">
                          {meta.note}
                        </span>
                      </p>
                      {tx.fileUrl ? (
                        <Button
                          variant="secondary"
                          className="mt-1 border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
                          onClick={() => window.open(tx.fileUrl, "_blank")}
                        >
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Lihat Bukti
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-auto rounded-2xl border border-white/10 bg-white/5">
              <div className="max-h-[560px] overflow-auto">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow className="bg-(--dash-surface-strong)]">
                      <TableHead className="sticky top-0 text-slate-400 z-10 bg-(--dash-surface-strong)]">
                        Tanggal
                      </TableHead>
                      <TableHead className="sticky top-0 text-slate-400 z-10 bg-(--dash-surface-strong)]">
                        Klaim
                      </TableHead>
                      <TableHead className="sticky top-0 text-slate-400 z-10 bg-(--dash-surface-strong)]">
                        Lokasi
                      </TableHead>
                      <TableHead className="sticky top-0 text-slate-400 z-10 bg-(--dash-surface-strong)]">
                        Peserta
                      </TableHead>
                      <TableHead className="sticky top-0 text-slate-400 z-10 bg-(--dash-surface-strong)]">
                        Keterangan
                      </TableHead>
                      <TableHead className="sticky top-0 text-slate-400 z-10 bg-(--dash-surface-strong)] text-right">
                        Jumlah
                      </TableHead>
                      <TableHead className="sticky top-0 text-slate-400 z-10 bg-(--dash-surface-strong)] text-center">
                        Bukti
                      </TableHead>
                      <TableHead className="sticky top-0 text-slate-400 z-10 bg-(--dash-surface-strong)] text-center">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meals.map((tx) => {
                      const meta = extractMeta(tx.keterangan || "");
                      return (
                        <TableRow key={tx.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="tabular-nums">
                            <span className="inline-flex items-center gap-2">
                              <CalendarDays className="h-4 w-4 text-(--dash-muted)]" />
                              {tx.tanggal}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {tx.klaim}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate">
                            {meta.lokasi ? (
                              <span className="inline-flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-(--dash-muted)]" />
                                <span className="truncate">{meta.lokasi}</span>
                              </span>
                            ) : (
                              <span className="text-(--dash-muted)]">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-60 truncate">
                            {meta.peserta ? (
                              <span className="inline-flex items-center gap-2">
                                <Users className="h-4 w-4 text-(--dash-muted)]" />
                                <span className="truncate">{meta.peserta}</span>
                              </span>
                            ) : (
                              <span className="text-(--dash-muted)]">-</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[360px] whitespace-normal">
                            <span className="line-clamp-2 whitespace-pre-line">
                              {meta.note}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatCurrency(Number(tx.jumlah))}
                          </TableCell>
                          <TableCell className="text-center">
                            {tx.fileUrl ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="border border-white/10 bg-white/10 text-(--dash-ink)] hover:bg-white/15"
                                onClick={() => window.open(tx.fileUrl, "_blank")}
                              >
                                <ImageIcon className="mr-2 h-4 w-4" />
                                Lihat
                              </Button>
                            ) : (
                              <span className="text-(--dash-muted)]">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(tx)}
                                className="hover:bg-white/10"
                              >
                                <Pencil className="h-4 w-4 text-amber-300" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(tx.id)}
                                className="hover:bg-white/10"
                              >
                                <Trash2 className="h-4 w-4 text-rose-300" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.section>
  );
}
