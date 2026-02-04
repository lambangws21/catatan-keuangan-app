"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuth } from "@/components/AuthProvider";
import { Loader2, X, Calendar, Tag, Wallet, Download, CheckCircle2, ArchiveX } from 'lucide-react';
import { toast } from "sonner";

// Import komponen dari shadcn/ui
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


// Definisikan tipe data Transaction agar konsisten
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

export default function GalleryPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null);

  // Fungsi untuk mengambil semua data transaksi
  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal mengambil data transaksi.');
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error(error);
      toast.error("Gagal memuat galeri. Silakan coba lagi.");
      setTransactions([]);
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-16">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="space-y-8 text-white">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Galeri Berkas</h1>
          <p className="text-gray-400">Semua berkas gambar dari transaksi Anda.</p>
        </div>
      </header>
      
      {galleryItems.length === 0 ? (
        <div className="text-center text-gray-400 py-16 bg-gray-800/50 rounded-lg">
          <ArchiveX className="h-12 w-12 mx-auto mb-4 text-gray-500" />
          <p className="font-semibold">Tidak ada berkas gambar yang ditemukan.</p>
          <p className="text-sm">Berkas transaksi akan muncul di sini setelah Anda mengunggahnya.</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {galleryItems.map((item, index) => (
            <motion.div
              key={item.id}
              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group shadow-lg hover:shadow-xl transition-shadow"
              onClick={() => setSelectedItem(item)}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              layoutId={`card-container-${item.id}`}
              variants={itemVariants}
            >
              <Image
                src={item.fileUrl!}
                alt={item.keterangan}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                style={{ objectFit: 'cover' }}
                priority={index < 12}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-xs font-semibold truncate">{item.keterangan}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Modal untuk Preview Gambar Beserta Datanya (diperbarui) */}
      <Dialog open={!!selectedItem} onOpenChange={(isOpen) => !isOpen && setSelectedItem(null)}>
        {/* Mengubah max-width untuk modal yang lebih besar */}
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-7xl w-auto bg-gray-800/80 backdrop-blur-lg border-gray-700 text-white p-6">
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
            <div className="md:col-span-3 relative flex justify-center items-center h-[900px] md:h-auto min-h-[400px]">
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