"use client";

import { useEffect, useState, FormEvent, type ReactNode } from "react";
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
    floatingOffset?: "bottom" | "stacked";
    trigger?: ReactNode;
}

export default function SaldoForm({
  onSaldoAdded,
  floatingOffset = "bottom",
  trigger,
}: SaldoFormProps) {
  const { user } = useAuth(); // Dapatkan info pengguna untuk autentikasi
  const [isOpen, setIsOpen] = useState(false);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [keterangan, setKeterangan] = useState("");
  // State 'jumlah' sekarang bertipe number untuk kompatibilitas dengan CurrencyInput
  const [jumlah, setJumlah] = useState<number | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const DRAFT_KEY = "draft:saldo:v1";
  const [draftReady, setDraftReady] = useState(false);

  const resetForm = () => {
    setTanggal(new Date().toISOString().split("T")[0]);
    setKeterangan("");
    setJumlah(undefined);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
  };
  
  // Handler baru yang spesifik untuk CurrencyInput
  const handleJumlahChange = (value: number | undefined) => {
    setJumlah(value);
  };

  useEffect(() => {
    if (!isOpen) return;
    if (draftReady) return;

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        setDraftReady(true);
        return;
      }
      const parsed = JSON.parse(raw) as {
        tanggal?: string;
        keterangan?: string;
        jumlah?: number;
      };
      if (typeof parsed.tanggal === "string") setTanggal(parsed.tanggal);
      if (typeof parsed.keterangan === "string") setKeterangan(parsed.keterangan);
      if (typeof parsed.jumlah === "number") setJumlah(parsed.jumlah);
    } catch {
      // ignore
    } finally {
      setDraftReady(true);
    }
  }, [DRAFT_KEY, draftReady, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!draftReady) return;

    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ tanggal, keterangan, jumlah })
        );
      } catch {
        // ignore
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [DRAFT_KEY, draftReady, isOpen, tanggal, keterangan, jumlah]);

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
      setDraftReady(false);

    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const floatingOffsetClass =
    floatingOffset === "stacked"
      ? "bottom-[calc(env(safe-area-inset-bottom)+9.75rem)] lg:bottom-[calc(env(safe-area-inset-bottom)+5.75rem)]"
      : "bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] lg:bottom-[calc(env(safe-area-inset-bottom)+1.25rem)]";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setDraftReady(false);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className={`fixed right-4 ${floatingOffsetClass} z-40 h-14 rounded-full border border-white/30 bg-white/75 px-5 font-bold text-slate-900 shadow-[0_18px_55px_rgba(15,23,42,0.25)] shadow-cyan-500/20 backdrop-blur-2xl transition-all hover:-translate-y-0.5 hover:bg-white/90 hover:text-slate-950 hover:shadow-[0_22px_70px_rgba(6,182,212,0.28)] dark:border-white/15 dark:bg-slate-950/70 dark:text-white dark:shadow-cyan-950/40 dark:hover:bg-slate-900/85 print:hidden`}
          >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500 text-white shadow-inner shadow-white/20">
                <Landmark className="h-4 w-4" />
              </span>
              <span className="ml-2 hidden sm:inline">Input Saldo</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-none max-h-[calc(100dvh-1rem)] overflow-y-auto border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-cyan-700 dark:text-cyan-300">
            Input Saldo
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tanggal">Tanggal</Label>
            <Input
              id="tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea
              id="keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              required
              placeholder="Contoh: Saldo Awal, Pemasukan Proyek B..."
              className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="jumlah">Jumlah (Rp)</Label>
            <CurrencyInput 
                id="jumlah" 
                placeholder="1.000.000"
                required
                value={jumlah || ''}
                onValueChange={handleJumlahChange}
                className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          
          <DialogFooter className="pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
