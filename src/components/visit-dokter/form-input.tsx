"use client";

import { useMemo, useState, FormEvent, useEffect } from "react";
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
  User2,
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
import type { Schedule } from "@/types/visit-dokter";

// Tipe data dokter (dari list dokter)
interface Doctor {
  id: string;
  namaDokter: string;
  rumahSakit: string[];
}

export interface ScheduleData {
  namaDokter: string;
  rumahSakit: string;
  waktuVisit: string;
  note: string;
  status: string;
  repeat: string;
  perawat: string;
}

// Definisikan props
interface ScheduleFormProps {
  onFormSubmit: () => Promise<void>;
  initialData?: ScheduleData & { id: string };
  doctorsList?: Doctor[];
  schedulesList?: Schedule[];
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

const nurseSuggestions = [
  "Perawat Intan",
  "Perawat Rini",
  "Perawat Sabila",
  "Perawat Bayu",
  "Perawat Gita",
  "Perawat Arif",
];

const initialFormData: ScheduleData = {
  namaDokter: "",
  rumahSakit: "",
  note: "",
  waktuVisit: formatDateTimeForInput(new Date().toISOString()),
  status: "Terjadwal",
  repeat: "once",
  perawat: "",
};

export default function ScheduleForm({
  onFormSubmit,
  initialData,
  doctorsList = [],
  schedulesList = [],
}: ScheduleFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<ScheduleData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ignoreConflicts, setIgnoreConflicts] = useState(false);
  const DRAFT_KEY = "draft:visit-dokter:v1";
  const [draftReady, setDraftReady] = useState(false);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (isEditMode && initialData && isOpen) {
      setFormData({
        ...initialData,
        // Penting: Mengubah ISO String dari backend ke format input datetime-local
        waktuVisit: formatDateTimeForInput(initialData.waktuVisit),
        perawat: initialData.perawat ?? "",
      });
    } else if (!isEditMode && isOpen) {
      // Mengatur ulang / restore draft saat membuat baru
      let restored = false;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ScheduleData>;
          setFormData((prev) => ({
            ...prev,
            ...initialFormData,
            ...parsed,
            waktuVisit:
              typeof parsed.waktuVisit === "string" && parsed.waktuVisit
                ? parsed.waktuVisit
                : formatDateTimeForInput(new Date().toISOString()),
          }));
          restored = true;
        }
      } catch {
        // ignore
      }
      if (!restored) {
        setFormData({
          ...initialFormData,
          waktuVisit: formatDateTimeForInput(new Date().toISOString()),
        });
      }
    }
    setIgnoreConflicts(false);
    if (isOpen) setDraftReady(true);
  }, [initialData, isEditMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!draftReady) return;
    if (isEditMode) return;

    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
      } catch {
        // ignore
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [DRAFT_KEY, draftReady, formData, isEditMode, isOpen]);

  const VISIT_DURATION_MINUTES = 60;

  const clampMonthlyOccurrence = (base: Date, year: number, monthIndex: number) => {
    const day = base.getDate();
    const hours = base.getHours();
    const minutes = base.getMinutes();
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const d = new Date(base);
    d.setFullYear(year);
    d.setMonth(monthIndex, Math.min(day, lastDay));
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const conflictItems = useMemo(() => {
    if (!Array.isArray(schedulesList) || schedulesList.length === 0) return [];
    if (!formData.waktuVisit) return [];
    if (formData.status !== "Terjadwal") return [];

    const candidate = new Date(formData.waktuVisit);
    if (Number.isNaN(candidate.getTime())) return [];
    const candidateStart = candidate.getTime();
    const candidateEnd = candidateStart + VISIT_DURATION_MINUTES * 60_000;

    return schedulesList
      .filter((s) => {
        if (!s) return false;
        if (s.status && s.status !== "Terjadwal") return false;
        if ((s as unknown as { isVirtual?: boolean }).isVirtual) return false;
        if (initialData?.id && s.id === initialData.id) return false;
        if (!s.waktuVisit) return false;
        return true;
      })
      .map((s) => {
        const base = new Date(s.waktuVisit);
        if (Number.isNaN(base.getTime())) return null;

        const repeat = s.repeat || "once";
        const occ =
          repeat === "monthly"
            ? clampMonthlyOccurrence(base, candidate.getFullYear(), candidate.getMonth())
            : base;

        const start = occ.getTime();
        const end = start + VISIT_DURATION_MINUTES * 60_000;

        const overlaps = candidateStart < end && start < candidateEnd;
        if (!overlaps) return null;

        return {
          id: s.id,
          namaDokter: s.namaDokter || s.dokter || "-",
          rumahSakit: s.rumahSakit || "-",
          perawat: s.perawat || "-",
          waktuVisit: occ.toISOString(),
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      namaDokter: string;
      rumahSakit: string;
      perawat: string;
      waktuVisit: string;
    }>;
  }, [schedulesList, formData.waktuVisit, formData.status, initialData?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value }));
  };

  const selectedDoctor = useMemo(() => {
    return doctorsList.find((doc) => doc.namaDokter === formData.namaDokter);
  }, [doctorsList, formData.namaDokter]);

  const rumahSakitSuggestions = useMemo(() => {
    return selectedDoctor?.rumahSakit?.map((s) => String(s ?? "").trim()).filter(Boolean).slice(0, 3) ?? [];
  }, [selectedDoctor]);

  // Handler untuk auto-fill saat dokter dipilih
  const handleDoctorTextChange = (doctorName: string) => {
    setFormData((prev) => {
      const next = { ...prev, namaDokter: doctorName };
      const matched = doctorsList.find((doc) => doc.namaDokter === doctorName);

      if (matched && prev.namaDokter !== doctorName) {
        next.rumahSakit = matched.rumahSakit?.[0] ?? "";
      }

      return next;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (conflictItems.length && !ignoreConflicts) {
      toast.error("Ada bentrok jadwal. Centang 'Tetap simpan' untuk lanjut.");
      return;
    }

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
      if (!isEditMode) {
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          // ignore
        }
        setDraftReady(false);
      }
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
      <DialogContent className="w-[calc(100vw-1rem)] max-w-none max-h-[calc(100dvh-1rem)] overflow-hidden bg-gray-800/80 backdrop-blur-md border-gray-700 text-white p-8 sm:max-w-[425px]">
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
              <Input
                id="namaDokter"
                name="namaDokter"
                value={formData.namaDokter}
                onChange={(e) => handleDoctorTextChange(e.target.value)}
                placeholder="Pilih dari daftar atau ketik manual..."
                required
                list="dokter-options"
                className="pl-10"
              />
              <datalist id="dokter-options">
                {doctorsList.map((doc) => (
                  <option
                    key={doc.id}
                    value={doc.namaDokter}
                    label={(doc.rumahSakit ?? []).join(" • ")}
                  />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="perawat">Perawat Pendamping</Label>
            <div className="relative">
              <User2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="perawat"
                name="perawat"
                value={formData.perawat}
                onChange={handleChange}
                placeholder="Contoh: Perawat Intan"
                list="perawat-options"
                className="pl-10"
              />
              <datalist id="perawat-options">
                {nurseSuggestions.map((nurse) => (
                  <option key={nurse} value={nurse} />
                ))}
              </datalist>
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
                placeholder={
                  rumahSakitSuggestions.length
                    ? "Pilih dari daftar (boleh ketik manual)"
                    : "Pilih dokter dulu"
                }
                required
                className="pl-10"
                list="rumahSakit-options"
              />
              <datalist id="rumahSakit-options">
                {rumahSakitSuggestions.map((rs) => (
                  <option key={rs} value={rs} />
                ))}
              </datalist>
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
            {conflictItems.length ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <p className="font-semibold text-amber-200">
                  Bentrok jadwal terdeteksi ({conflictItems.length})
                </p>
                <ul className="mt-2 space-y-1 text-xs text-amber-100/90">
                  {conflictItems.slice(0, 5).map((c) => (
                    <li key={c.id} className="flex flex-wrap gap-x-2">
                      <span className="font-semibold">
                        {new Date(c.waktuVisit).toLocaleString("id-ID")}
                      </span>
                      <span>• {c.namaDokter}</span>
                      <span>• {c.rumahSakit}</span>
                      <span>• {c.perawat}</span>
                    </li>
                  ))}
                </ul>
                {conflictItems.length > 5 ? (
                  <p className="mt-2 text-xs text-amber-100/70">
                    (+{conflictItems.length - 5} lainnya)
                  </p>
                ) : null}
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-amber-100">
                  <input
                    type="checkbox"
                    checked={ignoreConflicts}
                    onChange={(e) => setIgnoreConflicts(e.target.checked)}
                  />
                  Tetap simpan (abaikan bentrok)
                </label>
              </div>
            ) : null}
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

          <DialogFooter className="pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
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
