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

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
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
            @media print {
              /* 1. Sembunyikan SEMUANYA */
              body * {
                visibility: hidden !important;
              }

              /* 2. Tampilkan HANYA #print-content dan isinya */
              #print-content, #print-content * {
                visibility: visible !important;
              }

              /* 3. Posisikan #print-content agar mengisi halaman */
              #print-content {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 1.5cm !important; /* Beri margin halaman */
                box-sizing: border-box !important;
                box-shadow: none !important;
                border: none !important;
                background-color: #ffffff !important;
                color: #000 !important;
              }

              /* 4. Sembunyikan bagian "layar" di dalam #print-content */
              #print-content .screen-only-gallery {
                display: none !important;
              }

              /* 5. Tampilkan bagian "cetak" di dalam #print-content */
              #print-content .print-only-gallery {
                display: block !important;
              }

              /* 6. Atur halaman cetak */
              @page {
                size: A4 portrait;
                margin: 0; /* Margin diatur di #print-content */
              }
              body {
                background-color: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }

              /* 7. Atur grid di dalam bagian cetak */
              #print-content .grid-print-override {
                display: grid !important;
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 10px !important;
              }
              
              /* 8. Atur setiap item foto */
              #print-content .grid-item-print-override {
                position: relative !important; 
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                border: 1px solid #ddd !important;
                border-radius: 4px !important;
                background-color: #f3f4f6 !important;
                overflow: hidden !important;
                aspect-ratio: auto !important;
                height: 40vh !important; /* 2 baris per halaman A4 */
              }
              
              /* 9. Atur gambar Next.js */
              #print-content .grid-item-print-override img {
                position: absolute !important;
                object-fit: contain !important; /* Kunci: Terlihat semua */
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                padding: 4px !important;
                box-sizing: border-box !important;
              }

              /* 10. Sembunyikan elemen lain di luar #print-content */
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
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative grow w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input type="search" placeholder="Cari berdasarkan keterangan..." value={search} onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}} className="pl-10"/>
                </div>
                <Input type="date" value={filterDate} onChange={(e) => {setFilterDate(e.target.value); setCurrentPage(1);}} className="w-full md:w-auto"/>
                <Button onClick={() => window.print()} disabled={filteredImages.length === 0} className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-700">
                    <Printer className="h-4 w-4 mr-2" />
                    Cetak Halaman
                </Button>
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
                        {currentImages.map((item) => (
                            // Kode ini adalah kode asli Anda (layar)
                            <div key={item.id} className="relative aspect-242/642 rounded-lg overflow-hidden cursor-pointer group shadow-lg bg-gray-700" onClick={() => setSelectedItem(item)}>
                              <Image 
                                src={item.fileUrl!} 
                                alt={item.keterangan} 
                                fill 
                                sizes="(max-width: 768px) 50vw, 33vw" 
                                style={{ objectFit: 'cover' }} // Sesuai kode Anda: 'cover' di layar
                              />
                              <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <p className="text-white text-xs font-semibold truncate">{item.keterangan}</p>
                              </div>
                            </div>
                        ))}
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
                    <div className="grid grid-cols-3 gap-2 grid-print-override">
                      {filteredImages.map((item) => (
                        <div key={item.id} className="relative rounded-lg overflow-hidden bg-gray-200 grid-item-print-override">
                          <Image
                            src={item.fileUrl!}
                            alt={item.keterangan}
                            fill
                            sizes="33vw"
                            // UBAH: Pastikan 'contain' untuk cetak
                            style={{ objectFit: 'contain' }} 
                          />
                        </div>
                      ))}
                    </div>
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
