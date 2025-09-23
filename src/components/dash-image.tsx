"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuth } from "@/components/AuthProvider";
import { Loader2, X, Calendar, DollarSign, FileText } from 'lucide-react';

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
    if (!user) return;
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
      console.error(error);
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

  return (
    <div className="space-y-8 text-white">
      <header>
        <h1 className="text-3xl font-bold">Galeri Berkas</h1>
        <p className="text-gray-400">Semua berkas gambar dari transaksi Anda.</p>
      </header>
      
      {galleryItems.length === 0 ? (
        <div className="text-center text-gray-400 py-16 bg-gray-800/50 rounded-lg">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-500" />
          <p>Tidak ada berkas gambar yang ditemukan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {galleryItems.map((item, index) => (
            <motion.div
              key={item.id}
              className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setSelectedItem(item)}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
              layoutId={`card-container-${item.id}`}
            >
              <Image
                src={item.fileUrl!}
                alt={item.keterangan}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                style={{ objectFit: 'cover' }}
                priority={index < 12}
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
        {/* PERBAIKAN: Lebar maksimum modal diperbesar dari 4xl menjadi 6xl */}
        <DialogContent className="sm:max-w-6xl w-auto bg-gray-900/50 backdrop-blur-lg border-gray-700 text-white p-">
          <DialogHeader className="sr-only">
            <DialogTitle>Pratinjau Berkas: {selectedItem?.keterangan}</DialogTitle>
            <DialogDescription>Detail transaksi dan gambar berkas yang diperbesar.</DialogDescription>
          </DialogHeader>
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" layoutId={`card-container-${selectedItem?.id}`}>
            {/* Kolom Gambar */}
            <div className="md:col-span-2 relative flex justify-center items-center">
              {selectedItem?.fileUrl && (
                <Image
                  src={selectedItem.fileUrl}
                  alt={selectedItem.keterangan}
                  width={1920}
                  height={1080}
                  // PERBAIKAN: Tinggi maksimum gambar diperbesar dari 80vh menjadi 90vh
                  style={{ width: 'auto', height: 'auto', maxWidth: '110%', maxHeight: '90vh', objectFit: 'contain' }}
                  className="rounded-lg shadow-2xl"
                />
              )}
            </div>
            {/* Kolom Data Transaksi */}
            <div className="bg-gray-800 p-2 rounded-lg space-y-2 flex flex-col">
              <h3 className="text-lg font-bold text-cyan-400">{selectedItem?.keterangan}</h3>
              <div className="space-y-3 text-sm flex-grow">
                <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-gray-400" /><span>{selectedItem?.tanggal}</span></div>
                <div className="flex items-center gap-3"><DollarSign className="h-4 w-4 text-gray-400" /><span>{formatCurrency(selectedItem?.jumlah || 0)}</span></div>
              </div>
              <a href={selectedItem?.fileUrl || '#'} download target="_blank" rel="noopener noreferrer" className="w-full">
                <Button className="w-full bg-cyan-600 hover:bg-cyan-700">Unduh Berkas</Button>
              </a>
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

