"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuth } from "@/components/AuthProvider";
import { Loader2, X, Search, Calendar, Download, ChevronLeft, ChevronRight, FileText, Tag, CheckCircle2, Wallet } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null);
  const itemsPerPage = 6; // 2 baris x 3 kolom

  // Fungsi untuk mengambil semua data transaksi
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

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Saring transaksi untuk hanya menampilkan yang memiliki gambar
  const galleryItems = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter(tx => tx.fileUrl && tx.fileUrl.trim() !== '');
  }, [transactions]);

  // Terapkan filter pencarian dan tanggal
  const filteredImages = useMemo(() => {
    return galleryItems.filter((item) => {
      const matchSearch = item.keterangan.toLowerCase().includes(search.toLowerCase());
      const matchDate = filterDate ? item.tanggal >= filterDate : true;
      return matchSearch && matchDate;
    });
  }, [galleryItems, search, filterDate]);

  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);

  // Dapatkan gambar untuk halaman saat ini
  const currentImages = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredImages.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredImages, currentPage]);

  const exportToPDF = async () => {
    setIsDownloading(true);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageCount = Math.ceil(filteredImages.length / itemsPerPage);
    const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    try {
      for (let i = 0; i < pageCount; i++) {
        const startIndex = i * itemsPerPage;
        const pageImages = filteredImages.slice(startIndex, startIndex + itemsPerPage);

        const container = document.createElement('div');
        container.style.width = '210mm';
        container.style.height = '297mm';
        container.style.background = 'white';
        container.style.padding = '10mm';
        container.style.boxSizing = 'border-box';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';

        // Header
        const headerHtml = `
          <h2 style="text-align: center; font-size: 14pt; font-weight: bold; margin-bottom: 8mm; color: black;">Laporan Dokumentasi Foto</h2>
          <p style="text-align: right; font-size: 9pt; margin-bottom: 5mm; color: #333;">Tanggal Cetak: ${today}</p>
        `;

        // Image Grid
        const gridHtml = `
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; flex-grow: 1;">
            ${pageImages.map(item => `
              <div style="display: flex; flex-direction: column; border: 1px solid #eee; border-radius: 4px; overflow: hidden; height: auto;">
                <img src="${item.fileUrl}" crossorigin="anonymous" style="width: 100%; height: 80%; object-fit: cover; aspect-ratio: 1 / 1.33;" />
                <p style="font-size: 7pt; text-align: center; padding: 4px; color: black; margin-top: auto;">${item.keterangan}</p>
              </div>
            `).join('')}
          </div>
        `;
        
        container.innerHTML = headerHtml + gridHtml;
        document.body.appendChild(container);

        // Tunggu semua gambar termuat
        const images = Array.from(container.getElementsByTagName('img'));
        await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
                img.onload = resolve;
                img.onerror = resolve; // Resolve even on error to prevent infinite waiting
            });
        }));
        
        const canvas = await html2canvas(container, { scale: 2, useCORS: true });
        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/png');
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }
      
      pdf.save(`Laporan_Dokumentasi_${today}.pdf`);
      toast.success("PDF berhasil diunduh!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal membuat PDF. Silakan coba lagi.");
    } finally {
      setIsDownloading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white relative">
        {isDownloading && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50 rounded-lg">
            <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mb-4"/>
            <p className="text-lg font-semibold">Sedang membuat PDF...</p>
            <p className="text-sm text-gray-400">Ini mungkin memakan waktu beberapa saat.</p>
          </div>
        )}
        <header>
            <h1 className="text-3xl font-bold">Galeri Laporan</h1>
            <p className="text-gray-400">Pratinjau dan ekspor dokumentasi foto ke dalam format A4.</p>
        </header>

        <Card className="bg-gray-800/60 backdrop-blur-xl border border-white/10 p-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input type="search" placeholder="Cari berdasarkan keterangan..." value={search} onChange={(e) => {setSearch(e.target.value); setCurrentPage(1);}} className="pl-10"/>
                </div>
                <Input type="date" value={filterDate} onChange={(e) => {setFilterDate(e.target.value); setCurrentPage(1);}} className="w-full md:w-auto"/>
                <Button onClick={exportToPDF} disabled={isDownloading || filteredImages.length === 0} className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-700">
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                </Button>
            </div>
        </Card>
      
        {filteredImages.length === 0 ? (
            <div className="text-center text-gray-400 py-16 bg-gray-800/50 rounded-lg">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                <p>Tidak ada berkas yang cocok dengan filter Anda.</p>
            </div>
        ) : (
            <div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-4">
                    {currentImages.map((item) => (
                        <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group shadow-lg hover:shadow-xl transition-shadow" onClick={() => setSelectedItem(item)}>
                          <Image src={item.fileUrl!} alt={item.keterangan} fill sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw" style={{ objectFit: 'cover' }} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <p className="text-white text-xs font-semibold truncate">{item.keterangan}</p>
                          </div>
                        </div>
                    ))}
                </div>

                 <div className="flex justify-center items-center gap-4 mt-4">
                    <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm font-medium">Halaman {currentPage} dari {totalPages}</span>
                    <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
        )}

        {/* Modal untuk Preview Gambar Beserta Datanya (diperbarui) */}
      <Dialog open={!!selectedItem} onOpenChange={(isOpen) => !isOpen && setSelectedItem(null)}>
        {/* Mengubah max-width untuk modal yang lebih besar */}
        <DialogContent className="sm:max-w-xl md:max-w-xl lg:max-w-screen-xl w-auto bg-gray-800/80 backdrop-blur-lg border-gray-700 text-white p-4">
          <DialogHeader className="sr-only">
            <DialogTitle>Pratinjau Berkas: {selectedItem?.keterangan}</DialogTitle>
            <DialogDescription>Detail transaksi dan gambar berkas yang diperbesar.</DialogDescription>
          </DialogHeader>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-5 gap-6"
            layoutId={`card-container-${selectedItem?.id}`}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Kolom Gambar: Menempati 3 kolom dari total 5 kolom */}
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
            {/* Kolom Data Transaksi: Menempati 2 kolom dari total 5 kolom */}
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