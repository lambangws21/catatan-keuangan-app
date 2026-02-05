"use client";

import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { storage } from "@/lib/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera, Loader2 } from "lucide-react";
import Image from "next/image";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurencyInput";

interface ExpenseFormProps {
    onTransactionAdded: () => Promise<void>;
}

export default function ExpenseForm({ onTransactionAdded }: ExpenseFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [jenisBiaya, setJenisBiaya] = useState("Transportasi");
  const [customJenisBiaya, setCustomJenisBiaya] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [klaim, setKlaim] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [jumlah, setJumlah] = useState<number | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const DRAFT_KEY = "draft:expense:v1";
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    // Membersihkan object URL saat komponen unmount untuk mencegah memory leak
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBerkas(file);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    } else {
      setBerkas(null);
      setPreviewUrl(null);
    }
  };

  const handleScanReceipt = () => {
    const input = document.getElementById("receipt-capture") as HTMLInputElement | null;
    input?.click();
  };

  const resetForm = () => {
    setTanggal(new Date().toISOString().split("T")[0]);
    setJenisBiaya("Transportasi");
    setCustomJenisBiaya("");
    setKeterangan("");
    setJumlah(undefined);
    setKlaim("");
    setBerkas(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    const receiptInput = document.getElementById("receipt-capture") as HTMLInputElement;
    if (receiptInput) receiptInput.value = "";
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
        jenisBiaya?: string;
        customJenisBiaya?: string;
        keterangan?: string;
        klaim?: string;
        jumlah?: number;
      };
      if (typeof parsed.tanggal === "string") setTanggal(parsed.tanggal);
      if (typeof parsed.jenisBiaya === "string") setJenisBiaya(parsed.jenisBiaya);
      if (typeof parsed.customJenisBiaya === "string") setCustomJenisBiaya(parsed.customJenisBiaya);
      if (typeof parsed.keterangan === "string") setKeterangan(parsed.keterangan);
      if (typeof parsed.klaim === "string") setKlaim(parsed.klaim);
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
          JSON.stringify({
            tanggal,
            jenisBiaya,
            customJenisBiaya,
            keterangan,
            klaim,
            jumlah,
          })
        );
      } catch {
        // ignore
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [DRAFT_KEY, draftReady, isOpen, tanggal, jenisBiaya, customJenisBiaya, keterangan, klaim, jumlah]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const finalJenisBiaya =
      jenisBiaya === "Lainnya" ? customJenisBiaya.trim() : jenisBiaya;
    if (jenisBiaya === "Lainnya" && !finalJenisBiaya) {
      setIsSubmitting(false);
      setMessage("Mohon isi Jenis Biaya lainnya.");
      return;
    }

    let fileUrl = "";

    try {
      if (berkas) {
        const storageRef = ref(storage, `berkas/${Date.now()}_${berkas.name}`);
        const snapshot = await uploadBytes(storageRef, berkas);
        fileUrl = await getDownloadURL(snapshot.ref);
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal,
          jenisBiaya: finalJenisBiaya,
          keterangan,
          jumlah,
          klaim,
          fileUrl,
        }),
      });

      if (!response.ok) throw new Error("Gagal menyimpan data");
      
      await onTransactionAdded();
      toast.success("Data berhasil disimpan!");
      setMessage("Data berhasil disimpan!");
      resetForm();
      setDraftReady(false);

      setTimeout(() => setMessage(null), 1500);

    } catch (error) {
      console.error(error);
      setMessage("Terjadi error saat menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setDraftReady(false);
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400">
          Input Biaya Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-none max-h-[calc(100dvh-1rem)] overflow-y-auto border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-cyan-700 dark:text-cyan-300">
            Input Biaya Baru
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tanggal">Tanggal</Label>
              <Input
                id="tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="jenisBiaya">Jenis Biaya</Label>
              <Select value={jenisBiaya} onValueChange={setJenisBiaya}>
                <SelectTrigger className="w-full bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10">
                  <SelectValue placeholder="Pilih jenis biaya" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-white/10">
                  <SelectItem value="Transportasi">Transportasi</SelectItem>
                  <SelectItem value="Cargo">Cargo</SelectItem>
                  <SelectItem value="Meals Metting">Meals Metting</SelectItem>
                  <SelectItem value="Lainnya">Lainnya...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {jenisBiaya === "Lainnya" ? (
            <div className="grid gap-2">
              <Label htmlFor="customJenisBiaya">Jenis Biaya Lainnya</Label>
              <Input
                id="customJenisBiaya"
                value={customJenisBiaya}
                onChange={(e) => setCustomJenisBiaya(e.target.value)}
                placeholder="Contoh: Parkir, Tol, Hotel, dll."
                required
                className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
              />
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea
              id="keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              required
              placeholder="Detail pengeluaran..."
              className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="jumlah">Jumlah (Rp)</Label>
              <CurrencyInput 
                id="jumlah" 
                placeholder="1.000.000"
                required
                value={jumlah || ''}
                onValueChange={handleJumlahChange}
                className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
            />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="klaim">Nama Klaim</Label>
              <Input
                id="klaim"
                value={klaim}
                onChange={(e) => setKlaim(e.target.value)}
                required
                placeholder="Contoh: Proyek A"
                className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="file-input">Upload Berkas (Opsional)</Label>
              <Button
                type="button"
                variant="secondary"
                onClick={handleScanReceipt}
                className="h-8 rounded-full border border-slate-200 bg-slate-100 px-3 text-xs text-slate-900 hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
              >
                <Camera className="mr-2 h-4 w-4" />
                Scan Struk
              </Button>
            </div>
            <Input
              id="file-input"
              type="file"
              onChange={handleFileChange}
              className="text-slate-500 file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-1 file:text-white hover:file:bg-cyan-700 dark:text-slate-400 dark:file:bg-cyan-500 dark:hover:file:bg-cyan-400"
            />
            <Input
              id="receipt-capture"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {previewUrl && (
            <div className="grid gap-2">
              <Label>Preview Berkas</Label>
              <div className="mt-1 relative aspect-video w-full max-w-sm mx-auto p-2 border-2 border-dashed border-slate-300 rounded-lg dark:border-white/15">
                <Image 
                  src={previewUrl} 
                  alt="Preview Berkas" 
                  fill
                  
                  style={{ objectFit: 'contain' }}
                  className="rounded-md"
                />
              </div>
            </div>
          )}

          {message && (
            <p
              className={`mt-2 text-center text-sm ${
                message.toLowerCase().includes("error")
                  ? "text-rose-600 dark:text-rose-300"
                  : "text-emerald-600 dark:text-emerald-300"
              }`}
            >
              {message}
            </p>
          )}
          
          <DialogFooter className="sticky bottom-0 bg-white/90 pt-4 -mx-6 px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur dark:bg-slate-950/80">
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleScanReceipt}
                className="w-full border border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
              >
                <Camera className="mr-2 h-4 w-4" />
                Scan
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400"
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
