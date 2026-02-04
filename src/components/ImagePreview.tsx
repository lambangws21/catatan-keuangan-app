"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Loader2, X, Calendar, DollarSign, Image as ImageIcon, Tags, CheckCircle2 } from 'lucide-react';

// Import komponen dari shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Definisikan tipe data transaksi yang konsisten
interface Transaction {
  id: string;
  tanggal: string;
  jenisBiaya: string;
  keterangan: string;
  jumlah: number;
  klaim: string;
  fileUrl?: string;
}

// Definisikan props yang diterima dari komponen induk
interface ImageGalleryProps {
    transactions: Transaction[];
    isLoading: boolean;
}

// Fungsi format mata uang
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
};

export default function ImageGallery({ transactions, isLoading }: ImageGalleryProps) {
  // State lokal hanya untuk mengontrol modal preview
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null);

  // Gunakan useMemo untuk memfilter gambar secara efisien
  // Ini hanya akan berjalan kembali jika 'transactions' berubah
  const galleryItems = useMemo(() => {
    return transactions.filter(tx => tx.fileUrl && tx.fileUrl.trim() !== '');
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="premium-card space-y-6 overflow-hidden rounded-3xl border border-white/10 bg-linear-to-b from-slate-900/90 via-slate-950/80 to-slate-950 p-6 text-white shadow-[0_20px_60px_rgba(2,6,23,0.45)]">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-(--dash-muted)">
            Galeri
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-white">
            <ImageIcon className="h-5 w-5 text-cyan-300" />
            Galeri Berkas
          </h2>
          <p className="text-sm text-(--dash-muted)">
            {galleryItems.length ? `${galleryItems.length} berkas siap dicek.` : "Belum ada berkas."}
          </p>
        </div>
      </header>
      
      {galleryItems.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-(--dash-muted)">
          <ImageIcon className="mx-auto mb-3 h-10 w-10 text-white/60" />
          <p className="font-semibold text-white/90">Tidak ada berkas gambar</p>
          <p>Tambahkan transaksi dengan berkas agar muncul di galeri.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {galleryItems.map((item, index) => (
            <motion.div
              key={item.id}
              className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/5 cursor-pointer group shadow-[0_10px_25px_rgba(2,6,23,0.45)]"
              onClick={() => setSelectedItem(item)}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Image
                src={item.fileUrl!}
                alt={item.keterangan}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                style={{ objectFit: 'cover' }}
                priority={index < 6}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/10 to-transparent opacity-100">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-xs font-semibold line-clamp-2">
                    {item.keterangan}
                  </p>
                  <p className="mt-1 text-[10px] text-white/70">
                    {item.tanggal} • {formatCurrency(Number(item.jumlah))}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal untuk Preview Gambar Beserta Datanya */}
      <Dialog open={!!selectedItem} onOpenChange={(isOpen) => !isOpen && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-5xl w-auto border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Pratinjau Berkas: {selectedItem?.keterangan}</DialogTitle>
            <DialogDescription>Detail transaksi dan gambar berkas yang diperbesar.</DialogDescription>
          </DialogHeader>
          <motion.div
            className="relative grid grid-cols-1 md:grid-cols-3 gap-6 p-4 md:p-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="md:col-span-2 relative flex justify-center items-center rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-black">
              {selectedItem?.fileUrl && (
                <Image
                  src={selectedItem.fileUrl}
                  alt={selectedItem.keterangan}
                  width={1920}
                  height={1080}
                  style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                  className="rounded-lg shadow-2xl"
                />
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
                Detail
              </p>
              <h3 className="mt-2 text-lg font-bold text-cyan-700 dark:text-cyan-300">
                {selectedItem?.keterangan}
              </h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>{selectedItem?.tanggal}</span>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  <span>{formatCurrency(selectedItem?.jumlah || 0)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Tags className="h-4 w-4 text-slate-400" />
                  <span>{selectedItem?.jenisBiaya || "-"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>{selectedItem?.klaim || "-"}</span>
                </div>
              </div>
              {selectedItem?.fileUrl ? (
                <div className="mt-5 flex gap-2">
                  <Button
                    asChild
                    className="w-full bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400"
                  >
                    <a href={selectedItem.fileUrl} target="_blank" rel="noreferrer">
                      Buka
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="w-full border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
                  >
                    <a href={selectedItem.fileUrl} download>
                      Unduh
                    </a>
                  </Button>
                </div>
              ) : null}
            </div>
            <Button
              variant="ghost" size="icon"
              onClick={() => setSelectedItem(null)}
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/75 text-white rounded-full h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
