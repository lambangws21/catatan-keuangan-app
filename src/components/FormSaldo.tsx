"use client";

import { useState, FormEvent } from "react";
import { Loader2, Landmark } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";

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
import { CurrencyInput } from "@/components/CurencyInput";

// Definisikan props yang akan diterima komponen ini
interface SaldoFormProps {
    onSaldoAdded: () => Promise<void>; // Fungsi untuk me-refresh data setelah penambahan
}

export default function SaldoForm({ onSaldoAdded }: SaldoFormProps) {
  const { user } = useAuth(); // Dapatkan info pengguna untuk autentikasi
  const [isOpen, setIsOpen] = useState(false);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [keterangan, setKeterangan] = useState("");
  // State 'jumlah' sekarang bertipe number untuk kompatibilitas dengan CurrencyInput
  const [jumlah, setJumlah] = useState<number | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTanggal(new Date().toISOString().split("T")[0]);
    setKeterangan("");
    setJumlah(undefined);
  };
  
  // Handler baru yang spesifik untuk CurrencyInput
  const handleJumlahChange = (value: number | undefined) => {
    setJumlah(value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
        return toast.error("Anda harus login untuk menambahkan data.");
    }
    if (!tanggal || !keterangan || !jumlah) {
        return toast.error("Semua field wajib diisi.");
    }
    
    setIsSubmitting(true);

    try {
      // Dapatkan token autentikasi dari pengguna yang login
      const token = await user.getIdToken();

      const response = await fetch("/api/saldo", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            // Sertakan token di header Authorization
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          tanggal,
          keterangan,
          jumlah: Number(jumlah),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menyimpan data saldo");
      }
      
      await onSaldoAdded();
      toast.success("Data saldo berhasil disimpan!");
      resetForm();

      setTimeout(() => {
        setIsOpen(false);
      }, 1000);

    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-bold md:rounded-lg rounded-full p-3 md:px-4 md:py-2 transition-all">
            <Landmark className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline">Input Saldo</span>
        </Button>
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
            <Textarea id="keterangan" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} required placeholder="Contoh: Saldo Awal, Pemasukan Proyek B..." className="bg-gray-700 border-gray-600"/>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="jumlah">Jumlah (Rp)</Label>
            <CurrencyInput 
                id="jumlah" 
                placeholder="1.000.000"
                required
                value={jumlah || ''}
                onValueChange={handleJumlahChange}
            />
          </div>
          
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

