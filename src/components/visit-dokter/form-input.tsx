"use client";

import { useState, FormEvent, useEffect } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Edit,
  Stethoscope,
  Hospital,
  Clock,
  ListChecks,
  Notebook,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Tipe data dokter (dari list dokter)
interface Doctor {
  id: string;
  namaDokter: string;
  rumahSakit: string;
}

export interface ScheduleData {
  namaDokter: string;
  rumahSakit: string;
  waktuVisit: string;
  note: string;
  status: string;
  repeat: string;
}

// Definisikan props
interface ScheduleFormProps {
  onFormSubmit: () => Promise<void>;
  initialData?: ScheduleData & { id: string };
  doctorsList?: Doctor[];
}

/**
 * Mengubah ISO string menjadi format YYYY-MM-DDTHH:MM yang diperlukan
 * oleh input type="datetime-local" (format 24 jam).
 * @param isoString String tanggal dan waktu (misal: "2025-10-26T05:29:38.000Z")
 * @returns String format lokal yang dibutuhkan input (misal: "2025-10-26T12:29")
 */
const formatDateTimeForInput = (isoString: string) => {
  if (!isoString) return "";

  try {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    // Ini adalah format YYYY-MM-DDTHH:MM yang dibutuhkan input
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return isoString.slice(0, 16); // Fallback
  }
};

const initialFormData: ScheduleData = {
  namaDokter: "",
  rumahSakit: "",
  note: "",
  waktuVisit: formatDateTimeForInput(new Date().toISOString()),
  status: "Terjadwal",
  repeat: "once",
};

export default function ScheduleForm({
  onFormSubmit,
  initialData,
  doctorsList = [],
}: ScheduleFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<ScheduleData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (isEditMode && initialData && isOpen) {
      setFormData({
        ...initialData,
        // Penting: Mengubah ISO String dari backend ke format input datetime-local
        waktuVisit: formatDateTimeForInput(initialData.waktuVisit),
      });
    } else if (!isEditMode && isOpen) {
      // Mengatur ulang ke waktu saat ini saat membuat baru
      setFormData({
        ...initialFormData,
        waktuVisit: formatDateTimeForInput(new Date().toISOString()),
      });
    }
  }, [initialData, isEditMode, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value }));
  };

  // Handler untuk auto-fill saat dokter dipilih
  const handleDoctorChange = (doctorName: string) => {
    const selectedDoctor = doctorsList.find(
      (doc) => doc.namaDokter === doctorName
    );
    if (selectedDoctor) {
      setFormData((prev) => ({
        ...prev,
        namaDokter: selectedDoctor.namaDokter,
        rumahSakit: selectedDoctor.rumahSakit,
      }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    const dataToSend = { ...formData };
    try {
      const localDate = new Date(formData.waktuVisit);

      if (isNaN(localDate.getTime())) {
        throw new Error("Format waktu tidak valid.");
      }

      // Hasilnya adalah format 24 jam universal (UTC) yang ideal untuk database.
      dataToSend.waktuVisit = localDate.toISOString();
    } catch (error) {
      toast.error(`Kesalahan Waktu: ${(error as Error).message}`);
      setIsSubmitting(false);
      return; // Hentikan submit jika ada error waktu
    }
    // 🌟 AKHIR PERUBAHAN UTAMA 🌟

    try {
      const url = isEditMode
        ? `/api/visit-dokter/${initialData?.id}`
        : "/api/visit-dokter";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menyimpan data");
      }

      await onFormSubmit();
      toast.success(
        `Jadwal berhasil ${isEditMode ? "diperbarui" : "disimpan"}!`
      );
      setIsOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const TriggerButton = isEditMode ? (
    <Button variant="ghost" size="icon" aria-label="Edit Jadwal">
      <Edit className="h-4 w-4 text-yellow-500" />
    </Button>
  ) : (
    <Button className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold md:rounded-lg rounded-full p-3 md:px-4 md:py-2 transition-all">
      <Plus className="h-5 w-5 md:mr-2" />
      <span className="hidden md:inline">Jadwal Baru</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] overflow-hidden bg-gray-800/80 backdrop-blur-md border-gray-700 text-white p-8">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">
            {isEditMode ? "Edit" : "Input"} Jadwal Visit
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 overflow-auto">
          <div className="space-y-2">
            <Label htmlFor="namaDokter">Pilih Dokter</Label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Select
                onValueChange={handleDoctorChange}
                value={formData.namaDokter}
              >
                <SelectTrigger className="w-full pl-10">
                  <SelectValue placeholder="Pilih dari daftar dokter..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 text-white border-gray-600">
                  {doctorsList.map((doc) => (
                    <SelectItem key={doc.id} value={doc.namaDokter}>
                      {doc.namaDokter} ({doc.rumahSakit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rumahSakit">Rumah Sakit</Label>
            <div className="relative">
              <Hospital className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="rumahSakit"
                name="rumahSakit"
                value={formData.rumahSakit}
                onChange={handleChange}
                placeholder="Akan terisi otomatis"
                required
                className="pl-10"
                readOnly
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="waktuVisit">Waktu Visit (Format 24 Jam)</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="waktuVisit"
                name="waktuVisit"
                type="datetime-local"
                value={formData.waktuVisit}
                onChange={handleChange}
                required
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Catatan / Note</Label>

            <div className="relative">
              <Notebook className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

              <Textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="Tulis catatan visit dokter secara lengkap..."
                rows={6}
                maxLength={3000} // ✅ Bisa sampai 3000 karakter atau lebih
                className="pl-10 resize-none bg-gray-900/50 border-gray-600 text-white focus:ring-cyan-500 focus:border-cyan-500"
                required
              />
            </div>

            {/* Counter karakter */}
            <div className="text-right text-xs text-gray-400">
              {formData.note.length} / 3000 karakter
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <div className="relative">
              <ListChecks className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Select
                value={formData.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="w-full pl-10">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700/90 text-white border-gray-600">
                  <SelectItem value="Terjadwal">Terjadwal</SelectItem>
                  <SelectItem value="Selesai">Selesai</SelectItem>
                  <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Pengulangan Jadwal</Label>
            <Select
              value={formData.repeat ?? "once"}
              onValueChange={(val) =>
                setFormData((p) => ({
                  ...p,
                  repeat: val as "once" | "monthly",
                }))
              }
            >
              <SelectTrigger className="pl-10 bg-card border-border">
                <SelectValue />
              </SelectTrigger>

              <SelectContent className="bg-popover border-border bg-white">
                <SelectItem value="once">Sekali saja</SelectItem>
                <SelectItem value="monthly">Ulang Setiap Bulan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
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
