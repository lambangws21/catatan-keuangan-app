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

// 🔥 Import tipe global Schedule
import type { Schedule } from "@/types/visit-dokter";

// Tipe dokter
interface Doctor {
  id: string;
  namaDokter: string;
  rumahSakit: string;
}

// Form menggunakan Schedule dari global types
export type ScheduleData = Schedule;

interface ScheduleFormProps {
  onFormSubmit: () => Promise<void>;
  initialData?: Schedule; // langsung pakai Schedule, tidak perlu & { id: string }
  doctorsList?: Doctor[];
}

// Convert ISO -> datetime-local
const formatDateTimeForInput = (isoString: string) => {
  if (!isoString) return "";

  try {
    const date = new Date(isoString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return isoString.slice(0, 16);
  }
};

// 🟦 FIX: initialFormData harus memuat semua field minimal string
const initialFormData: ScheduleData = {
  id: "",
  namaDokter: "",
  rumahSakit: "",
  waktuVisit: formatDateTimeForInput(new Date().toISOString()),
  note: "",
  status: "Terjadwal",
  dokter: "",
  pasien: "",
};

export default function ScheduleForm({
  onFormSubmit,
  initialData,
  doctorsList = [],
}: ScheduleFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 🟦 hilangkan undefined → selalu string
  const [formData, setFormData] = useState<ScheduleData>({
    ...initialFormData,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!initialData;

  // Reset atau load initialData
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialData) {
        setFormData({
          id: initialData.id ?? "",
          namaDokter: initialData.namaDokter ?? "",
          rumahSakit: initialData.rumahSakit ?? "",
          note: initialData.note ?? "",
          status: initialData.status ?? "Terjadwal",
          waktuVisit: formatDateTimeForInput(initialData.waktuVisit),
          dokter: initialData.dokter ?? "",
          pasien: initialData.pasien ?? "",
        });
      } else {
        setFormData({
          ...initialFormData,
          waktuVisit: formatDateTimeForInput(new Date().toISOString()),
        });
      }
    }
  }, [initialData, isEditMode, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value ?? "",
    }));
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value }));
  };

  const handleDoctorChange = (value: string) => {
    const selected = doctorsList.find((d) => d.namaDokter === value);

    if (selected) {
      setFormData((prev) => ({
        ...prev,
        namaDokter: selected.namaDokter,
        rumahSakit: selected.rumahSakit,
      }));
    } else {
      setFormData((prev) => ({ ...prev, namaDokter: value }));
    }
  };

  // Submit handler
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const dataToSend: Schedule = {
      ...formData,
      waktuVisit: new Date(formData.waktuVisit).toISOString(),
    };

    try {
      const url = isEditMode
        ? `/api/visit-dokter/${formData.id}`
        : "/api/visit-dokter";

      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (!res.ok) throw new Error("Gagal menyimpan data");

      await onFormSubmit();
      toast.success(isEditMode ? "Jadwal diperbarui!" : "Jadwal disimpan!");
      setIsOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const TriggerButton = isEditMode ? (
    <Button variant="ghost" size="icon">
      <Edit className="h-4 w-4 text-yellow-500" />
    </Button>
  ) : (
    <Button className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-full p-3 md:px-4 md:py-2">
      <Plus className="h-5 w-5 md:mr-2" />
      <span className="hidden md:inline">Jadwal Baru</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>

      <DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border-gray-700 text-white p-8">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">
            {isEditMode ? "Edit Jadwal Visit" : "Input Jadwal Visit"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Dokter */}
          <div className="space-y-2">
            <Label>Pilih Dokter</Label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

              <Select
                onValueChange={handleDoctorChange}
                value={formData.namaDokter ?? ""}
              >
                <SelectTrigger className="w-full pl-10">
                  <SelectValue placeholder="Pilih dokter" />
                </SelectTrigger>
                <SelectContent>
                  {doctorsList.map((doc) => (
                    <SelectItem key={doc.id} value={doc.namaDokter}>
                      {doc.namaDokter} ({doc.rumahSakit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Rumah Sakit */}
          <div className="space-y-2">
            <Label>Rumah Sakit</Label>
            <div className="relative">
              <Hospital className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                name="rumahSakit"
                value={formData.rumahSakit ?? ""}
                readOnly
                className="pl-10"
              />
            </div>
          </div>

          {/* Waktu Visit */}
          <div className="space-y-2">
            <Label>Waktu Visit</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="datetime-local"
                name="waktuVisit"
                value={formData.waktuVisit ?? ""}
                onChange={handleChange}
                required
                className="pl-10"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label>Catatan</Label>
            <div className="relative">
              <Notebook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                name="note"
                value={formData.note ?? ""}
                onChange={handleChange}
                required
                className="pl-10"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="relative">
              <ListChecks className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

              <Select
                value={formData.status ?? "Terjadwal"}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="pl-10">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="Terjadwal">Terjadwal</SelectItem>
                  <SelectItem value="Selesai">Selesai</SelectItem>
                  <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
