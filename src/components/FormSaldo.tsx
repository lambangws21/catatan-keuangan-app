"use client";

import { useState, FormEvent } from "react";
import { Loader2 } from "lucide-react";

// Import komponen dari shadcn/ui
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Definisikan props yang akan diterima komponen ini
interface SaldoFormProps {
    onSaldoAdded: () => Promise<void>; // Fungsi untuk me-refresh data setelah penambahan
}

export default function SaldoForm({ onSaldoAdded }: SaldoFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [keterangan, setKeterangan] = useState("");
  const [jumlah, setJumlah] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resetForm = () => {
    setTanggal(new Date().toISOString().split("T")[0]);
    setKeterangan("");
    setJumlah("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tanggal || !keterangan || !jumlah) {
        setMessage("Semua field wajib diisi.");
        return;
    }
    setIsSubmitting(true);
    setMessage(null);

    try {
      // Kirim data ke API route yang baru untuk saldo
      const response = await fetch("/api/saldo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal,
          keterangan,
          jumlah: Number(jumlah),
        }),
      });

      if (!response.ok) throw new Error("Gagal menyimpan data saldo");
      
      await onSaldoAdded(); // Panggil fungsi refresh dari komponen induk

      setMessage("Data saldo berhasil disimpan!");
      resetForm();

      setTimeout(() => {
        setIsOpen(false);
        setMessage(null);
      }, 1500);

    } catch (error) {
      console.error(error);
      setMessage("Terjadi error saat menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Input Saldo</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">Input Saldo Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tanggal">Tanggal</Label>
            <Input id="tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required className="bg-gray-700 border-gray-600"/>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea id="keterangan" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} required placeholder="Contoh: Saldo Awal, Pemasukan B..." className="bg-gray-700 border-gray-600"/>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="jumlah">Jumlah (Rp)</Label>
            <Input id="jumlah" type="number" value={jumlah} onChange={(e) => setJumlah(e.target.value)} required placeholder="1000000" className="bg-gray-700 border-gray-600"/>
          </div>

          {message && <p className={`mt-2 text-center text-sm ${message.includes("error") ? "text-red-400" : "text-green-400"}`}>{message}</p>}
          
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full bg-cyan-600 hover:bg-cyan-700">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
