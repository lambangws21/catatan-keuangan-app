"use client";

import { useState, FormEvent, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Stethoscope,
  Calendar,
  User,
  Hospital,
  DollarSign,
  FileSignature,
  Edit,
  HeartHandshake,
} from "lucide-react";
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
import { motion } from "framer-motion";
import { CurrencyInput } from "@/components/CurencyInput";
import { Textarea } from "./ui/textarea";

// Tipe untuk data operasi agar konsisten
interface OperationData {
  date: string;
  dokter: string;
  tindakanOperasi: string;
  rumahSakit: string;
  jumlah?: number;
  klaim: string;
  namaPerawat: string;
}

// Definisikan props baru yang akan diterima komponen ini
interface OperationFormProps {
  onFormSubmit: () => Promise<void>; // Fungsi umum untuk me-refresh data
  initialData?: OperationData & { id: string }; // Data opsional untuk mode edit
}

// Nilai awal untuk form kosong
const initialFormData: OperationData = {
  date: new Date().toISOString().split("T")[0],
  dokter: "",
  tindakanOperasi: "",
  rumahSakit: "",
  jumlah: undefined,
  klaim: "",
  namaPerawat: "",
};

export default function OperationForm({
  onFormSubmit,
  initialData,
}: OperationFormProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<OperationData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tentukan apakah ini mode edit berdasarkan keberadaan initialData
  const isEditMode = !!initialData;

  // Efek untuk mengisi form saat data untuk diedit berubah (saat modal dibuka)
  useEffect(() => {
    if (isEditMode && initialData) {
      setFormData({
        ...initialData,
        jumlah: Number(initialData.jumlah), // Pastikan jumlah adalah number
      });
    }
  }, [initialData, isEditMode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleJumlahChange = (value: number | undefined) => {
    setFormData((prev) => ({ ...prev, jumlah: value }));
  };

  const resetFormAndClose = useCallback(() => {
    setFormData(initialFormData); // Reset ke state awal yang kosong
    setIsOpen(false);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Anda harus login.");
    if (!formData.jumlah) return toast.error("Jumlah tidak boleh kosong.");

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();

      // Tentukan URL dan metode berdasarkan mode (edit atau tambah baru)
      const url = isEditMode
        ? `/api/operasi/${initialData?.id}`
        : "/api/operasi";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menyimpan data");
      }

      await onFormSubmit();
      toast.success(
        `Data operasi berhasil ${isEditMode ? "diperbarui" : "disimpan"}!`
      );
      resetFormAndClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const TriggerButton = isEditMode ? (
    <Button variant="ghost" size="icon">
      <Edit className="h-4 w-4 text-yellow-500" />
    </Button>
  ) : (
    <Button className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold md:rounded-lg rounded-full p-3 md:px-4 md:py-2 transition-all">
      <Plus className="h-5 w-5 md:mr-2" />
      <span className="hidden md:inline">Input Operasi</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px] bg-gray-800/80 backdrop-blur-md border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">
            {isEditMode ? "Edit" : "Input"} Data Operasi
          </DialogTitle>
          <p className="text-sm text-gray-400">
            Masukkan detail tindakan operasi.
          </p>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dokter">Dokter</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="dokter"
                    name="dokter"
                    value={formData.dokter}
                    onChange={handleChange}
                    placeholder="Nama Dokter"
                    required
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="space-y-2">
              <Label htmlFor="tindakanOperasi">Tindakan Operasi</Label>
              <div className="relative">
                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="tindakanOperasi"
                  name="tindakanOperasi"
                  value={formData.tindakanOperasi}
                  onChange={handleChange}
                  placeholder="Contoh: Operasi Caesar"
                  required
                  className="pl-10"
                />
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="space-y-2">
              <Label htmlFor="rumahSakit">Rumah Sakit</Label>
              <div className="relative">
                <Hospital className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="rumahSakit"
                  name="rumahSakit"
                  value={formData.rumahSakit}
                  onChange={handleChange}
                  placeholder="Nama Rumah Sakit"
                  required
                  className="pl-10"
                />
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jumlah">Jumlah (Rp)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <CurrencyInput
                    id="jumlah"
                    placeholder="5.000.000"
                    required
                    className="pl-10"
                    value={formData.jumlah || ""}
                    onValueChange={handleJumlahChange}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="klaim">Klaim</Label>
                <div className="relative">
                  <FileSignature className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="klaim"
                    name="klaim"
                    value={formData.klaim}
                    onChange={handleChange}
                    placeholder="Contoh: BPJS"
                    required
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="relative">
              <HeartHandshake className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="namaPerawat"
                name="namaPerawat"
                value={formData.namaPerawat}
                onChange={handleChange}
                placeholder="Tuliskan nama perawat, pisahkan per baris..."
                required
                className="pl-10 min-h-[90px] resize-none"
              />
            </div>
          </motion.div>
          <DialogFooter className="sticky bottom-0 bg-gray-800 pt-4 -mx-6 px-6">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting ? "Menyimpan..." : "Simpan Data"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
