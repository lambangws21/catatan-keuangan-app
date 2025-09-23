"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import SaldoForm from "@/components/FormSaldo";
import SaldoManager from "@/components/ManajerSaldo";

// Definisikan tipe data untuk konsistensi
interface Saldo {
  id: string;
  tanggal: string;
  keterangan: string;
  jumlah: number;
}

export default function SaldoPage() {
  // State untuk menyimpan data saldo khusus untuk halaman ini
  const { user } = useAuth();
  const [saldoData, setSaldoData] = useState<Saldo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fungsi untuk mengambil data saldo dari API
  const fetchSaldo = useCallback(async () => {
    if (!user) return; // Jangan lakukan fetch jika user belum login
    
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/saldo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Gagal mengambil data saldo.');
      const data = await response.json();
      setSaldoData(data);
    } catch (error) {
      console.error(error);
      setSaldoData([]); // Set ke array kosong jika gagal untuk menghindari error
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Ambil data saat komponen pertama kali dimuat atau saat user berubah
  useEffect(() => {
    fetchSaldo();
  }, [fetchSaldo]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-white">Manajemen Saldo</h1>
            <p className="text-gray-400">Lacak semua pemasukan dan deposit Anda di sini.</p>
        </div>
        {/* Tombol untuk menambah saldo baru, akan me-refresh data di halaman ini */}
        <SaldoForm onSaldoAdded={fetchSaldo} />
      </header>

      {/* Komponen SaldoManager sekarang menampilkan data yang diambil oleh halaman ini */}
      <SaldoManager
        saldoData={saldoData}
        isLoading={isLoading}
        onDataChange={fetchSaldo}
      />
    </div>
  );
}
