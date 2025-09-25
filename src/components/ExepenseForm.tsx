"use client";

import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { storage } from "@/lib/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2 } from "lucide-react";
import Image from "next/image";

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
    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

    // Handler baru yang spesifik untuk CurrencyInput
    const handleJumlahChange = (value: number | undefined) => {
      setJumlah(value);
    };
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const finalJenisBiaya = jenisBiaya === "Lain-lain" ? customJenisBiaya : jenisBiaya;
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
      setMessage("Data berhasil disimpan!");
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
        <Button className="bg-cyan-600 hover:bg-cyan-700">Input Biaya Baru</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">Input Biaya Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tanggal">Tanggal</Label>
              <Input id="tanggal" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required className="bg-gray-700 border-gray-600"/>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="jenisBiaya">Jenis Biaya</Label>
              <Select value={jenisBiaya} onValueChange={setJenisBiaya}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Pilih jenis biaya" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 text-white border-gray-600">
                  <SelectItem value="Transportasi">Transportasi</SelectItem>
                  <SelectItem value="Konsumsi">Konsumsi</SelectItem>
                  <SelectItem value="Akomodasi">Akomodasi</SelectItem>
                  <SelectItem value="Lain-lain">Lain-lain...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {jenisBiaya === 'Lain-lain' && (
            <div className="grid gap-2">
              <Label htmlFor="customJenisBiaya">Tulis Jenis Biaya</Label>
              <Input id="customJenisBiaya" value={customJenisBiaya} onChange={(e) => setCustomJenisBiaya(e.target.value)} placeholder="Contoh: Biaya Internet" required className="bg-gray-700 border-gray-600"/>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea id="keterangan" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} required placeholder="Detail pengeluaran..." className="bg-gray-700 border-gray-600"/>
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
            />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="klaim">Nama Klaim</Label>
              <Input id="klaim" value={klaim} onChange={(e) => setKlaim(e.target.value)} required placeholder="Contoh: Proyek A" className="bg-gray-700 border-gray-600"/>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="file-input">Upload Berkas (Opsional)</Label>
            <Input id="file-input" type="file" onChange={handleFileChange} className="text-gray-400 file:text-white file:bg-cyan-600 hover:file:bg-cyan-700"/>
          </div>

          {previewUrl && (
            <div className="grid gap-2">
              <Label>Preview Berkas</Label>
              <div className="mt-1 relative aspect-video w-full max-w-sm mx-auto p-2 border-2 border-dashed border-gray-600 rounded-lg">
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

          {message && <p className={`mt-2 text-center text-sm ${message.includes("error") ? "text-red-400" : "text-green-400"}`}>{message}</p>}
          
          <DialogFooter className="sticky bottom-0 bg-gray-800 pt-4 -mx-6 px-6">
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

