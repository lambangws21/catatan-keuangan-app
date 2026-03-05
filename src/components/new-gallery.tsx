"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image'; // Tetap menggunakan Next/Image
import { motion } from 'framer-motion';
import { useAuth } from "@/components/AuthProvider";
import { Loader2, X, Search, Calendar, ChevronLeft, ChevronRight, FileText, Tag, CheckCircle2, Wallet, Printer, Download } from 'lucide-react';
import { toast } from "sonner";

// Import komponen dari shadcn/ui
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Definisikan tipe data Transaction
interface Transaction {
  id: string;
  tanggal: string;
  jenisBiaya: string;
  keterangan: string;
  jumlah: number;
  klaim: string;
  fileUrl?: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
};

export default function ImageGallery() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null);
  const itemsPerPage = 6; // 2 baris x 3 kolom
  const [monthFilter, setMonthFilter] = useState("");
  const [deleteMonth, setDeleteMonth] = useState("");
  const [isDeletingMonth, setIsDeletingMonth] = useState(false);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [printTemplate, setPrintTemplate] = useState<2 | 4 | 6>(6);
  const [reportTitle, setReportTitle] = useState("");
  const [watermarkText, setWatermarkText] = useState("");

  // ... (Fungsi fetchTransactions tetap sama) ...
  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal mengambil data transaksi.');
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
      toast.error("Gagal memuat data. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleMonthFilterClick = useCallback((key: string) => {
    setMonthFilter((prev) => (prev === key ? "" : key));
    setCurrentPage(1);
  }, []);

  const handleDeletePhotosByMonth = useCallback(async () => {
    if (!user || !deleteMonth) return;
    setIsDeletingMonth(true);
    try {
      const token = await user.getIdToken();
      const [year, month] = deleteMonth.split("-");
      const response = await fetch("/api/transactions/photos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          year: Number(year),
          month: Number(month) - 1,
        }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Gagal menghapus foto");

      toast.success(
        `${json.deletedCount || 0} foto bulan ${deleteMonth} berhasil dihapus.`
      );
      setDeleteMonth("");
      fetchTransactions();
    } catch (error) {
      console.error("Error deleting month photos:", error);
      toast.error("Gagal menghapus foto. Coba lagi.");
    } finally {
      setIsDeletingMonth(false);
    }
  }, [deleteMonth, fetchTransactions, user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ... (useMemo galleryItems dan filteredImages tetap sama) ...
  const galleryItems = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter(tx => tx.fileUrl && tx.fileUrl.trim() !== '');
  }, [transactions]);

  const monthGroups = useMemo(() => {
    const map = new Map<
      string,
      { label: string; count: number }
    >();
    const formatter = new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    });
    galleryItems.forEach((item) => {
      if (!item.tanggal) return;
      const parsed = new Date(item.tanggal);
      if (Number.isNaN(parsed.getTime())) return;
      const key = `${parsed.getFullYear()}-${String(
        parsed.getMonth() + 1
      ).padStart(2, "0")}`;
      const current = map.get(key);
      map.set(key, {
        label: formatter.format(parsed),
        count: current ? current.count + 1 : 1,
      });
    });

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({
        key,
        label: data.label,
        count: data.count,
      }));
  }, [galleryItems]);

  const monthFilteredItems = useMemo(() => {
    if (!monthFilter) return galleryItems;
    return galleryItems.filter((item) => item.tanggal.startsWith(monthFilter));
  }, [galleryItems, monthFilter]);

  const filteredImages = useMemo(() => {
    return monthFilteredItems.filter((item) => {
      const matchSearch = item.keterangan.toLowerCase().includes(search.toLowerCase());
      const matchDate = filterDate ? item.tanggal >= filterDate : true;
      return matchSearch && matchDate;
    });
  }, [monthFilteredItems, search, filterDate]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    const validIds = new Set(galleryItems.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [galleryItems]);

  const toggleImageSelection = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }, []);

  const isAllFilteredSelected = useMemo(() => {
    if (filteredImages.length === 0) return false;
    return filteredImages.every((item) => selectedIdSet.has(item.id));
  }, [filteredImages, selectedIdSet]);

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      if (isAllFilteredSelected) {
        const filteredSet = new Set(filteredImages.map((item) => item.id));
        return prev.filter((id) => !filteredSet.has(id));
      }

      const merged = new Set(prev);
      filteredImages.forEach((item) => merged.add(item.id));
      return Array.from(merged);
    });
  }, [filteredImages, isAllFilteredSelected]);

  const printableImages = useMemo(() => {
    if (selectedIds.length === 0) return filteredImages;
    return filteredImages.filter((item) => selectedIdSet.has(item.id));
  }, [filteredImages, selectedIdSet, selectedIds.length]);

  const printPages = useMemo(() => {
    const pages: Transaction[][] = [];
    for (let index = 0; index < printableImages.length; index += printTemplate) {
      pages.push(printableImages.slice(index, index + printTemplate));
    }
    return pages;
  }, [printTemplate, printableImages]);

  const preloadSingleImage = useCallback((url: string) => {
    return new Promise<void>((resolve) => {
      const image = new window.Image();
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve();
      };

      const timeoutId = window.setTimeout(finish, 12000);
      image.onload = finish;
      image.onerror = finish;
      image.src = url;

      if (image.complete) {
        finish();
        return;
      }

      if (typeof image.decode === "function") {
        image.decode().then(finish).catch(() => undefined);
      }
    });
  }, []);

  const handlePrint = useCallback(async () => {
    if (printableImages.length === 0 || isPreparingPrint) return;

    const imageUrls = Array.from(
      new Set(
        printableImages
          .map((item) => item.fileUrl)
          .filter((url): url is string => Boolean(url && url.trim()))
      )
    );

    if (imageUrls.length === 0) {
      toast.error("Tidak ada foto valid untuk dicetak.");
      return;
    }

    try {
      setIsPreparingPrint(true);
      await Promise.all(imageUrls.map((url) => preloadSingleImage(url)));
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      window.print();
    } catch (error) {
      console.error("Print preparation failed:", error);
      toast.error("Gagal menyiapkan foto untuk dicetak.");
    } finally {
      setIsPreparingPrint(false);
    }
  }, [isPreparingPrint, preloadSingleImage, printableImages]);

  const printGeneratedAt = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date()),
    [filterDate, monthFilter, printTemplate, search, selectedIds.length]
  );

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
  const isTemplateSix = printTemplate === 6;
  const showDetailedHeader = reportTitle.trim().length > 0 && !isTemplateSix;
  const compactHeaderTitle = reportTitle.trim() || "Laporan Dokumentasi Transaksi";
  const totalGalleryCount = galleryItems.length;
  const activeMonthLabel =
    monthGroups.find((group) => group.key === monthFilter)?.label || "";
  const monthSummaryText = monthFilter
    ? `Menampilkan ${filteredImages.length} foto dari bulan ${activeMonthLabel || monthFilter}`
    : `Menampilkan ${filteredImages.length} foto dari seluruh bulan`;

  const currentImages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredImages.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredImages, currentPage]);

  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white relative">
        {/* UBAH: <style> di-upgrade total dengan metode 'visibility' yang aman */}
        <style>
          {`
            .print-only-gallery {
              display: none;
            }

            @media print {
              body * {
                visibility: hidden !important;
              }

              #print-content, #print-content * {
                visibility: visible !important;
              }

              #print-content {
                position: static !important;
                width: auto !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                box-shadow: none !important;
                border: none !important;
                background-color: #ffffff !important;
                color: #000 !important;
              }

              #print-content .screen-only-gallery {
                display: none !important;
              }

              #print-content .print-only-gallery {
                display: block !important;
              }

              @page {
                size: A4 portrait;
                margin: 10mm;
              }

              html,
              body {
                background-color: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              #print-content .print-page {
                position: relative !important;
                min-height: calc(277mm - 2mm) !important;
                break-after: page !important;
                page-break-after: always !important;
                padding-bottom: 8mm !important;
              }

              #print-content .print-page-template-6 {
                min-height: auto !important;
                padding-bottom: 0 !important;
              }

              #print-content .print-page:last-child {
                break-after: auto !important;
                page-break-after: auto !important;
              }

              #print-content .print-page-inner {
                position: relative !important;
                z-index: 2 !important;
              }

              #print-content .print-header {
                border-bottom: 1px solid #d4d4d8 !important;
                padding-bottom: 8px !important;
                margin-bottom: 10px !important;
              }

              #print-content .print-meta {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 8px !important;
                font-size: 11px !important;
                color: #475569 !important;
              }

              #print-content .print-watermark {
                position: absolute !important;
                inset: 0 !important;
                z-index: 1 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-size: 44px !important;
                letter-spacing: 0.08em !important;
                text-transform: uppercase !important;
                color: rgba(15, 23, 42, 0.08) !important;
                font-weight: 700 !important;
                transform: rotate(-24deg) !important;
                pointer-events: none !important;
                user-select: none !important;
              }

              #print-content .grid-print-override {
                display: grid !important;
                gap: 8px !important;
              }

              #print-content .grid-print-template-2 {
                grid-template-columns: repeat(2, 1fr) !important;
              }

              #print-content .grid-print-template-4 {
                grid-template-columns: repeat(2, 1fr) !important;
              }

              #print-content .grid-print-template-6 {
                grid-template-columns: repeat(3, 1fr) !important;
              }

              #print-content .grid-item-print-override {
                position: relative !important; 
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                border: 1px solid #d4d4d8 !important;
                border-radius: 4px !important;
                background-color: #f3f4f6 !important;
                overflow: hidden !important;
                aspect-ratio: auto !important;
                min-height: 220px !important;
              }

              #print-content .grid-item-print-template-2 {
                height: 138mm !important;
              }

              #print-content .grid-item-print-template-4 {
                height: 90mm !important;
              }

              #print-content .grid-item-print-template-6 {
                height: 116mm !important;
              }

              #print-content .grid-item-print-override img {
                position: absolute !important;
                object-fit: contain !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                padding: 6px !important;
                box-sizing: border-box !important;
              }

              #print-content .print-footer {
                margin-top: 8px !important;
                text-align: right !important;
                font-size: 11px !important;
                color: #334155 !important;
              }

              .print-hide {
                display: none !important;
              }
            }
          `}
        </style>
        
        {/* UBAH: Menambahkan kelas 'print-hide' */}
        <header className="print-hide">
            <h1 className="text-3xl font-bold">Galeri Laporan</h1>
            <p className="text-gray-400">Pratinjau dan cetak dokumentasi foto.</p>
        </header>

        {/* UBAH: Menambahkan kelas 'print-hide' */}
        <Card className="bg-gray-800/60 backdrop-blur-xl border border-white/10 p-4 print-hide">
            <div className="space-y-3">
                <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <div className="relative grow w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input type="search" placeholder="Cari berdasarkan keterangan..." value={search} onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}} className="pl-10"/>
                    </div>
                    <Input type="date" value={filterDate} onChange={(e) => {setFilterDate(e.target.value); setCurrentPage(1);}} className="w-full md:w-auto"/>
                    <Button onClick={handlePrint} disabled={printableImages.length === 0 || isPreparingPrint} className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-700">
                        <Printer className="h-4 w-4 mr-2" />
                        {isPreparingPrint ? "Menyiapkan foto..." : selectedIds.length > 0 ? "Cetak Batch" : "Cetak Semua"}
                    </Button>
                </div>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-300">Template:</span>
                        <Button
                          type="button"
                          size="sm"
                          variant={printTemplate === 6 ? "default" : "outline"}
                          onClick={() => setPrintTemplate(6)}
                          className={printTemplate === 6 ? "bg-cyan-600 hover:bg-cyan-700" : "border-white/20 text-gray-200"}
                        >
                          6 foto / halaman
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={printTemplate === 2 ? "default" : "outline"}
                          onClick={() => setPrintTemplate(2)}
                          className={printTemplate === 2 ? "bg-cyan-600 hover:bg-cyan-700" : "border-white/20 text-gray-200"}
                        >
                          2 foto / halaman
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={printTemplate === 4 ? "default" : "outline"}
                          onClick={() => setPrintTemplate(4)}
                          className={printTemplate === 4 ? "bg-cyan-600 hover:bg-cyan-700" : "border-white/20 text-gray-200"}
                        >
                          4 foto / halaman
                        </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={toggleSelectAllFiltered}
                          disabled={filteredImages.length === 0}
                          className="border-white/20 text-gray-200"
                        >
                          {isAllFilteredSelected ? "Batalkan pilih hasil filter" : "Pilih semua hasil filter"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedIds([])}
                          disabled={selectedIds.length === 0}
                          className="text-gray-200 hover:text-white"
                        >
                          Reset batch
                        </Button>
                        <span className="text-xs text-gray-300">
                          Terpilih {selectedIds.length} foto
                        </span>
                    </div>
                </div>
            </div>
        </Card>

        <Card className="bg-gray-800/60 backdrop-blur-xl border border-white/10 p-4 print-hide">
            <div className="space-y-4">
                <div>
                    <p className="text-xs uppercase tracking-wider text-gray-400">Foto per bulan</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                        <button
                            type="button"
                            onClick={() => handleMonthFilterClick("")}
                            className={`rounded-full px-4 py-1 text-xs font-semibold transition ${
                                !monthFilter
                                    ? "bg-cyan-500 text-white shadow-lg"
                                    : "bg-white/10 text-gray-200 hover:bg-white/20"
                            }`}
                            aria-pressed={!monthFilter}
                        >
                            Semua bulan ({totalGalleryCount})
                        </button>
                        {monthGroups.map((month) => {
                            const isActive = monthFilter === month.key;
                            return (
                                <button
                                    key={month.key}
                                    type="button"
                                    onClick={() => handleMonthFilterClick(month.key)}
                                    className={`flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold transition ${
                                        isActive
                                            ? "bg-cyan-500 text-white shadow-lg"
                                            : "bg-white/10 text-gray-200 hover:bg-white/20"
                                    }`}
                                    aria-pressed={isActive}
                                >
                                    <span>{month.label}</span>
                                    <span className="text-[10px] text-gray-300">
                                        ({month.count})
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="text-xs text-gray-300">{monthSummaryText}</p>
                    <div className="flex flex-wrap gap-2 items-center">
                        <Input
                            type="month"
                            value={deleteMonth}
                            onChange={(e) => setDeleteMonth(e.target.value)}
                            className="bg-white/5 text-white min-w-[190px]"
                        />
                        <Button
                            onClick={handleDeletePhotosByMonth}
                            disabled={!deleteMonth || isDeletingMonth}
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {isDeletingMonth ? "Menghapus..." : "Hapus foto per bulan"}
                        </Button>
                    </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Judul Header</p>
                        <Input
                          value={reportTitle}
                          onChange={(e) => setReportTitle(e.target.value)}
                          className="bg-white/5 text-white"
                          placeholder="Kosongkan untuk mode cetak simple"
                        />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Watermark</p>
                        <Input
                          value={watermarkText}
                          onChange={(e) => setWatermarkText(e.target.value)}
                          className="bg-white/5 text-white"
                          placeholder="Opsional"
                        />
                    </div>
                </div>
                <p className="text-[11px] text-gray-400">
                  Template 6 foto dibuat memanjang vertikal seperti contoh PDF kamu.
                </p>
            </div>
        </Card>
      
        {/* ID 'print-content' SANGAT PENTING untuk CSS di atas */}
        <div id="print-content" className="bg-white text-gray-900 rounded-md shadow-2xl p-2 md:p-9 lg:p-12 max-w-6xl mx-auto print:max-w-none print:shadow-none print:p-0 print:m-0">
          {filteredImages.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>Tidak ada berkas yang cocok dengan filter Anda.</p>
              </div>
          ) : (
              <div>
                  {/* --- BAGIAN 1: HANYA TAMPIL DI LAYAR --- */}
                  {/* UBAH: Mengganti 'print:hidden' dengan 'screen-only-gallery' */}
                  <div className="screen-only-gallery">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-5">
                        {currentImages.map((item, index) => {
                          const isSelected = selectedIdSet.has(item.id);
                          return (
                            <div
                              key={item.id}
                              className={`relative aspect-242/642 rounded-lg overflow-hidden cursor-pointer group shadow-lg bg-gray-700 ${
                                isSelected ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-white" : ""
                              }`}
                              onClick={() => setSelectedItem(item)}
                            >
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  toggleImageSelection(item.id);
                                }}
                                className={`absolute left-2 top-2 z-20 rounded-md border px-2 py-1 text-[10px] font-semibold ${
                                  isSelected
                                    ? "border-cyan-300 bg-cyan-600 text-white"
                                    : "border-white/60 bg-black/60 text-white"
                                }`}
                              >
                                {isSelected ? "Terpilih" : "Pilih"}
                              </button>
                              <Image
                                src={item.fileUrl!}
                                alt={item.keterangan}
                                fill
                                sizes="(max-width: 768px) 50vw, 33vw"
                                loading={index === 0 ? "eager" : "lazy"}
                                style={{ objectFit: 'cover' }}
                              />
                              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <p className="text-white text-xs font-semibold truncate">{item.keterangan}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="flex justify-center items-center gap-4 mt-4">
                        <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4 text-white" /></Button>
                        <span className="text-sm font-medium text-gray-900">Halaman {currentPage} dari {totalPages}</span>
                        <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4 text-white"  /></Button>
                    </div>
                  </div>

                  {/* --- BAGIAN 2: HANYA TAMPIL SAAT PRINT (SEMUA FOTO) --- */}
                  {/* UBAH: Mengganti 'hidden print:block' dengan 'print-only-gallery' */}
                  <div className="print-only-gallery">
                    {printPages.length === 0 ? (
                      <div className="py-10 text-center text-sm text-gray-500">
                        Tidak ada foto yang dipilih untuk dicetak.
                      </div>
                    ) : (
                      printPages.map((pageItems, pageIndex) => (
                        <section
                          key={`page-${pageIndex}`}
                          className={`print-page ${isTemplateSix ? "print-page-template-6" : ""}`}
                        >
                          {!isTemplateSix && watermarkText.trim() ? (
                            <div className="print-watermark">{watermarkText}</div>
                          ) : null}
                          <div className="print-page-inner">
                            {isTemplateSix ? (
                              <header className="print-header">
                                <h2 className="text-base font-bold">{compactHeaderTitle}</h2>
                                <p className="text-[11px] text-slate-600">
                                  {activeMonthLabel || "Semua bulan"} • Total {printableImages.length} foto
                                </p>
                              </header>
                            ) : null}
                            {showDetailedHeader ? (
                              <header className="print-header">
                                <h2 className="text-base font-bold">{reportTitle}</h2>
                                <div className="print-meta">
                                  <span>Tanggal cetak: {printGeneratedAt}</span>
                                  <span>Bulan: {activeMonthLabel || "Semua bulan"}</span>
                                  <span>Template: {printTemplate} foto/halaman</span>
                                  <span>Sumber: {selectedIds.length > 0 ? `${selectedIds.length} foto terpilih` : "Semua hasil filter"}</span>
                                  <span>Total cetak: {printableImages.length} foto</span>
                                </div>
                              </header>
                            ) : null}

                            <div
                              className={`grid-print-override ${
                                printTemplate === 6
                                  ? "grid-print-template-6"
                                  : printTemplate === 2
                                    ? "grid-print-template-2"
                                    : "grid-print-template-4"
                              }`}
                            >
                              {pageItems.map((item) => (
                                <div
                                  key={item.id}
                                  className={`relative rounded-lg overflow-hidden bg-gray-200 grid-item-print-override ${
                                    printTemplate === 6
                                      ? "grid-item-print-template-6"
                                      : printTemplate === 2
                                        ? "grid-item-print-template-2"
                                        : "grid-item-print-template-4"
                                  }`}
                                >
                                  <Image
                                    src={item.fileUrl!}
                                    alt={item.keterangan}
                                    fill
                                    sizes={printTemplate === 6 ? "33vw" : printTemplate === 2 ? "90vw" : "45vw"}
                                    loading="eager"
                                    style={{ objectFit: 'contain' }}
                                  />
                                  {printTemplate !== 6 ? (
                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-white text-[10px]">
                                      <p className="truncate font-semibold">{item.keterangan}</p>
                                      <p className="truncate">
                                        {item.tanggal} • {item.jenisBiaya} • {formatCurrency(item.jumlah)}
                                      </p>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>

                            {showDetailedHeader ? (
                              <footer className="print-footer">
                                Halaman {pageIndex + 1} / {printPages.length}
                              </footer>
                            ) : null}
                          </div>
                        </section>
                      ))
                    )}
                  </div>
              </div>
          )}
        </div>

        {/* UBAH: Menambahkan kelas 'print-hide' */}
        <Dialog open={!!selectedItem} onOpenChange={(isOpen) => !isOpen && setSelectedItem(null)} >
            <DialogContent className="sm:max-w-xl md:max-w-xl lg:max-w-xl w-auto bg-gray-800/80 backdrop-blur-lg border-gray-700 text-white p-4 print-hide">
              <DialogHeader className="sr-only">
                <DialogTitle>Pratinjau Berkas: {selectedItem?.keterangan}</DialogTitle>
                <DialogDescription>Detail transaksi dan gambar berkas yang diperbesar.</DialogDescription>
              </DialogHeader>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-5 gap-6"
                layoutId={`card-container-${selectedItem?.id}`}
                style={{ width: '100%', height: '100%' }}
              >
                <div className="md:col-span-3 relative flex justify-center items-center h-[600px] md:h-auto min-h-[400px]">
                  {selectedItem?.fileUrl && (
                    <Image
                      src={selectedItem.fileUrl}
                      alt={selectedItem.keterangan}
                      fill
                      sizes="(max-width: 768px) 100vw, 60vw"
                      style={{ objectFit: 'contain' }}
                      className="rounded-lg shadow-2xl"
                    />
                  )}
                </div>
                <div className="md:col-span-2 bg-gray-700/50 p-6 rounded-lg space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-cyan-400 mb-2">{selectedItem?.keterangan}</h3>
                    <div className="space-y-3 text-sm text-gray-300">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{selectedItem?.tanggal}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Tag className="h-4 w-4 text-gray-400" />
                        <span>{selectedItem?.jenisBiaya}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Wallet className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold text-white">{formatCurrency(selectedItem?.jumlah || 0)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-gray-400" />
                        <span>{selectedItem?.klaim}</span>
                      </div>
                    </div>
                  </div>
                  <a href={selectedItem?.fileUrl || '#'} download target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button className="w-full bg-cyan-600 hover:bg-cyan-700">
                      <Download className="h-4 w-4 mr-2" />
                      Unduh Berkas
                    </Button>
                  </a>
                </div>
              </motion.div>
              <Button
                variant="ghost" size="icon"
                onClick={() => setSelectedItem(null)}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/75 text-white rounded-full h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogContent>
        </Dialog>
    </div>
  );
}
