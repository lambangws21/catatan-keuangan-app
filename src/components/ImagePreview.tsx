"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Loader2, X, Calendar, DollarSign } from 'lucide-react';

// Import komponen dari shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from './ui/button';

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
    <div className="bg-gray-800 rounded-lg shadow-md p-6 text-white">
      <h2 className="text-xl font-semibold mb-4 text-cyan-400">Galeri Berkas</h2>
      
      {galleryItems.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Tidak ada berkas gambar yang ditemukan.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {galleryItems.map((item, index) => (
            <motion.div
              key={item.id}
              className="relative aspect-square rounded-md overflow-hidden cursor-pointer group"
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-xs font-semibold truncate">{item.keterangan}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal untuk Preview Gambar Beserta Datanya */}
      <Dialog open={!!selectedItem} onOpenChange={(isOpen) => !isOpen && setSelectedItem(null)}>
        <DialogContent className="sm:max-w-4xl w-auto bg-gray-900/50 backdrop-blur-lg border-gray-700 text-white p-4">
          <DialogHeader className="sr-only">
            <DialogTitle>Pratinjau Berkas: {selectedItem?.keterangan}</DialogTitle>
            <DialogDescription>Detail transaksi dan gambar berkas yang diperbesar.</DialogDescription>
          </DialogHeader>
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="md:col-span-2 relative flex justify-center items-center">
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
            <div className="bg-gray-800 p-6 rounded-lg space-y-4">
              <h3 className="text-lg font-bold text-cyan-400">{selectedItem?.keterangan}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-gray-400" /><span>{selectedItem?.tanggal}</span></div>
                <div className="flex items-center gap-3"><DollarSign className="h-4 w-4 text-gray-400" /><span>{formatCurrency(selectedItem?.jumlah || 0)}</span></div>
              </div>
            </div>
            <Button
              variant="ghost" size="icon"
              onClick={() => setSelectedItem(null)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/75 text-white rounded-full h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}