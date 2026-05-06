"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  CalendarDays,
  Camera,
  ClipboardList,
  Clock3,
  Hospital,
  Pencil,
  Plus,
  Save,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TechnicalSupportSchedule {
  id: string;
  date: string;
  time?: string;
  operasi: string;
  operator: string;
  rumahSakit: string;
  status?: ScheduleStatus;
  fotoPreOpUrl?: string | null;
  fotoPostOpUrl?: string | null;
  note?: string;
}

interface FormState {
  date: string;
  time: string;
  operasi: string;
  operator: string;
  rumahSakit: string;
  status: ScheduleStatus;
  fotoPreOpUrl: string;
  fotoPostOpUrl: string;
  note: string;
}

type ScheduleStatus =
  | "Jadwal Baru"
  | "Tunda"
  | "Reschedule"
  | "Batal"
  | "Selesai";

const STATUS_OPTIONS: ScheduleStatus[] = [
  "Jadwal Baru",
  "Tunda",
  "Reschedule",
  "Batal",
  "Selesai",
];

const statusColorMap: Record<ScheduleStatus, string> = {
  "Jadwal Baru": "bg-cyan-400/15 text-cyan-200 border-cyan-300/30",
  Tunda: "bg-amber-400/15 text-amber-200 border-amber-300/30",
  Reschedule: "bg-violet-400/15 text-violet-200 border-violet-300/30",
  Batal: "bg-rose-400/15 text-rose-200 border-rose-300/30",
  Selesai: "bg-emerald-400/15 text-emerald-200 border-emerald-300/30",
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const createEmptyForm = (date: string): FormState => ({
  date,
  time: "",
  operasi: "",
  operator: "",
  rumahSakit: "",
  status: "Jadwal Baru",
  fotoPreOpUrl: "",
  fotoPostOpUrl: "",
  note: "",
});

const uploadPhoto = async (file: File, scope: "pre-op" | "post-op") => {
  const storageRef = ref(
    storage,
    `support-schedule/${scope}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`
  );
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
};

export default function TechnicalSupportScheduleManager() {
  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [schedules, setSchedules] = useState<TechnicalSupportSchedule[]>([]);
  const [form, setForm] = useState<FormState>(() => createEmptyForm(todayKey));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | ScheduleStatus>("all");
  const [preOpFile, setPreOpFile] = useState<File | null>(null);
  const [postOpFile, setPostOpFile] = useState<File | null>(null);

  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/support-schedules");
      if (!response.ok) throw new Error("Gagal mengambil data jadwal.");
      const data = (await response.json()) as TechnicalSupportSchedule[];
      setSchedules(data);
    } catch (error) {
      setSchedules([]);
      toast.error((error as Error).message || "Gagal memuat jadwal.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    if (editingId) return;
    setForm((prev) => ({ ...prev, date: selectedDateKey }));
  }, [selectedDateKey, editingId]);

  const selectedDateItemsRaw = useMemo(() => {
    return schedules
      .filter((item) => item.date === selectedDateKey)
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [schedules, selectedDateKey]);

  const selectedDateItems = useMemo(() => {
    if (statusFilter === "all") return selectedDateItemsRaw;
    return selectedDateItemsRaw.filter(
      (item) => (item.status || "Jadwal Baru") === statusFilter
    );
  }, [selectedDateItemsRaw, statusFilter]);

  const statusCounts = useMemo(() => {
    const counters: Record<ScheduleStatus, number> = {
      "Jadwal Baru": 0,
      Tunda: 0,
      Reschedule: 0,
      Batal: 0,
      Selesai: 0,
    };

    selectedDateItemsRaw.forEach((item) => {
      const status = item.status || "Jadwal Baru";
      counters[status] += 1;
    });

    return counters;
  }, [selectedDateItemsRaw]);

  const upcomingItems = useMemo(() => {
    return schedules
      .slice()
      .sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`))
      .slice(0, 5);
  }, [schedules]);

  const handleFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = useCallback(() => {
    setEditingId(null);
    setPreOpFile(null);
    setPostOpFile(null);
    setForm(createEmptyForm(selectedDateKey));
  }, [selectedDateKey]);

  const openCreateModal = () => {
    resetForm();
    setForm(createEmptyForm(selectedDateKey));
    setIsFormModalOpen(true);
  };

  const handleFormModalChange = (open: boolean) => {
    setIsFormModalOpen(open);
    if (!open && !isSaving) {
      resetForm();
    }
  };

  const handleEdit = (item: TechnicalSupportSchedule) => {
    setEditingId(item.id);
    setSelectedDateKey(item.date);
    setForm({
      date: item.date,
      time: item.time || "",
      operasi: item.operasi,
      operator: item.operator,
      rumahSakit: item.rumahSakit,
      status: item.status || "Jadwal Baru",
      fotoPreOpUrl: item.fotoPreOpUrl || "",
      fotoPostOpUrl: item.fotoPostOpUrl || "",
      note: item.note || "",
    });
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus agenda ini?")) return;
    try {
      const response = await fetch(`/api/support-schedules/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Gagal menghapus agenda.");
      toast.success("Agenda berhasil dihapus.");
      await fetchSchedules();
      if (editingId === id) resetForm();
    } catch (error) {
      toast.error((error as Error).message || "Gagal menghapus agenda.");
    }
  };

  const handleQuickStatusUpdate = async (
    item: TechnicalSupportSchedule,
    nextStatus: ScheduleStatus
  ) => {
    try {
      const response = await fetch(`/api/support-schedules/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: item.date,
          time: item.time || "",
          operasi: item.operasi,
          operator: item.operator,
          rumahSakit: item.rumahSakit,
          status: nextStatus,
          fotoPreOpUrl: item.fotoPreOpUrl || null,
          fotoPostOpUrl: item.fotoPostOpUrl || null,
          note: item.note || "",
        }),
      });

      if (!response.ok) throw new Error("Gagal mengubah status.");
      toast.success(`Status diubah menjadi "${nextStatus}".`);
      await fetchSchedules();
    } catch (error) {
      toast.error((error as Error).message || "Gagal mengubah status.");
    }
  };

  const handleSubmit = async () => {
    if (!form.date || !form.operasi || !form.operator || !form.rumahSakit) {
      toast.error("Tanggal, operasi, operator, dan lokasi rumah sakit wajib diisi.");
      return;
    }

    setIsSaving(true);
    try {
      let fotoPreOpUrl = form.fotoPreOpUrl || "";
      let fotoPostOpUrl = form.fotoPostOpUrl || "";

      if (preOpFile) {
        fotoPreOpUrl = await uploadPhoto(preOpFile, "pre-op");
      }
      if (postOpFile) {
        fotoPostOpUrl = await uploadPhoto(postOpFile, "post-op");
      }

      const payload = {
        date: form.date,
        time: form.time,
        operasi: form.operasi,
        operator: form.operator,
        rumahSakit: form.rumahSakit,
        status: form.status,
        fotoPreOpUrl: fotoPreOpUrl || null,
        fotoPostOpUrl: fotoPostOpUrl || null,
        note: form.note,
      };

      const response = await fetch(
        editingId ? `/api/support-schedules/${editingId}` : "/api/support-schedules",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorJson = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorJson?.error || "Gagal menyimpan agenda.");
      }

      toast.success(editingId ? "Agenda berhasil diperbarui." : "Agenda berhasil ditambahkan.");
      await fetchSchedules();
      setIsFormModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error((error as Error).message || "Gagal menyimpan agenda.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="border-(--dash-border) bg-(--dash-surface) text-(--dash-ink)">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarDays className="h-5 w-5 text-cyan-300" />
              Kalender Agenda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-(--dash-surface-strong) p-2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDateKey(formatDateKey(date))}
                className="mx-auto text-(--dash-ink)"
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-(--dash-surface-strong) p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-(--dash-muted)">Terpilih</p>
              <p className="mt-1 text-sm font-semibold">{selectedDateKey}</p>
              <p className="mt-2 text-xs text-(--dash-muted)">
                {selectedDateItemsRaw.length} agenda pada tanggal ini.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-(--dash-border) bg-(--dash-surface) text-(--dash-ink)">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-emerald-300" />
              Agenda Teknikal Support
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-(--dash-surface-strong) p-3">
                <p className="text-xs text-(--dash-muted)">Total Agenda</p>
                <p className="mt-1 text-xl font-semibold">{schedules.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-(--dash-surface-strong) p-3">
                <p className="text-xs text-(--dash-muted)">Agenda Tanggal Terpilih</p>
                <p className="mt-1 text-xl font-semibold">{selectedDateItemsRaw.length}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-(--dash-surface-strong) p-3">
                <p className="text-xs text-(--dash-muted)">Tanggal Fokus</p>
                <p className="mt-1 text-sm font-semibold">{selectedDateKey}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-2">
                <Label>Status Filter</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as "all" | ScheduleStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {STATUS_OPTIONS.map((status) => (
                  <div
                    key={status}
                    className={`rounded-lg border px-2 py-1.5 text-center ${statusColorMap[status]}`}
                  >
                    <p className="text-[11px] leading-tight">{status}</p>
                    <p className="text-sm font-semibold">{statusCounts[status]}</p>
                  </div>
                ))}
              </div>
            </div>
            <Button type="button" onClick={openCreateModal} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Agenda (Modal)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isFormModalOpen} onOpenChange={handleFormModalChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Agenda Teknikal Support" : "Tambah Agenda Teknikal Support"}
            </DialogTitle>
            <DialogDescription>
              Isi detail operasi, operator, lokasi rumah sakit, dokumentasi pre/post-op, dan catatan.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Tanggal</Label>
              <Input id="date" name="date" type="date" value={form.date} onChange={handleFormChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Jam Agenda</Label>
              <Input id="time" name="time" type="time" value={form.time} onChange={handleFormChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operasi">Operasi</Label>
              <Input
                id="operasi"
                name="operasi"
                placeholder="Contoh: THA Kanan"
                value={form.operasi}
                onChange={handleFormChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operator">Operator</Label>
              <Input
                id="operator"
                name="operator"
                placeholder="Nama operator"
                value={form.operator}
                onChange={handleFormChange}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="rumahSakit">Lokasi Rumah Sakit</Label>
              <Input
                id="rumahSakit"
                name="rumahSakit"
                placeholder="Nama rumah sakit"
                value={form.rumahSakit}
                onChange={handleFormChange}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Status Agenda</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, status: value as ScheduleStatus }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status agenda" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fotoPreOpUrl">Foto Pre Op (URL)</Label>
              <Input
                id="fotoPreOpUrl"
                name="fotoPreOpUrl"
                placeholder="https://..."
                value={form.fotoPreOpUrl}
                onChange={handleFormChange}
              />
              <Input type="file" accept="image/*" onChange={(e) => setPreOpFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fotoPostOpUrl">Foto Post Op (URL)</Label>
              <Input
                id="fotoPostOpUrl"
                name="fotoPostOpUrl"
                placeholder="https://..."
                value={form.fotoPostOpUrl}
                onChange={handleFormChange}
              />
              <Input type="file" accept="image/*" onChange={(e) => setPostOpFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                name="note"
                rows={4}
                placeholder="Catatan tambahan untuk tim teknikal support"
                value={form.note}
                onChange={handleFormChange}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <Button type="button" onClick={handleSubmit} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Simpan Agenda"}
              </Button>
              <Button type="button" variant="outline" onClick={() => handleFormModalChange(false)}>
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-(--dash-border) bg-(--dash-surface) text-(--dash-ink)">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Timeline Agenda • {selectedDateKey} •{" "}
            {statusFilter === "all" ? "Semua Status" : statusFilter}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-(--dash-muted)">Memuat agenda...</p>
          ) : selectedDateItems.length === 0 ? (
            <p className="text-sm text-(--dash-muted)">Belum ada agenda untuk tanggal ini.</p>
          ) : (
            <div className="relative pl-6 sm:pl-7">
              <div className="absolute bottom-0 left-2 top-0 w-px bg-white/15" />
              <div className="space-y-4">
                {selectedDateItems.map((item) => (
                  <div key={item.id} className="relative">
                    <div className="absolute -left-5 top-5 h-3 w-3 rounded-full border border-white/20 bg-cyan-300/80" />
                    <div className="rounded-xl border border-white/10 bg-(--dash-surface-strong) p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="flex items-center gap-2 text-xs text-(--dash-muted)">
                            <Clock3 className="h-3.5 w-3.5 text-cyan-300" />
                            {item.time || "Tanpa jam"}
                          </p>
                          <h4 className="mt-1 text-sm font-semibold">{item.operasi}</h4>
                          <span
                            className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[11px] ${statusColorMap[item.status || "Jadwal Baru"]}`}
                          >
                            {item.status || "Jadwal Baru"}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="icon" variant="outline" onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="destructive" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                        <p className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-fuchsia-300" />{item.operator}</p>
                        <p className="flex items-center gap-2"><Hospital className="h-3.5 w-3.5 text-amber-300" />{item.rumahSakit}</p>
                        <div className="sm:col-span-2">
                          <p className="flex items-center gap-2 text-(--dash-muted)">
                            <Camera className="h-3.5 w-3.5 text-blue-300" />
                            {item.fotoPreOpUrl || item.fotoPostOpUrl ? "Dokumentasi tersedia" : "Belum ada dokumentasi"}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs">
                            {item.fotoPreOpUrl && (
                              <a className="text-cyan-300 hover:underline" href={item.fotoPreOpUrl} target="_blank" rel="noreferrer">
                                Buka Foto Pre Op
                              </a>
                            )}
                            {item.fotoPostOpUrl && (
                              <a className="text-cyan-300 hover:underline" href={item.fotoPostOpUrl} target="_blank" rel="noreferrer">
                                Buka Foto Post Op
                              </a>
                            )}
                          </div>
                        </div>
                        <p className="sm:col-span-2 text-(--dash-muted)">
                          {item.note || "-"}
                        </p>
                        <div className="space-y-1 sm:col-span-2">
                          <p className="text-[11px] text-(--dash-muted)">Update Status Cepat</p>
                          <Select
                            value={item.status || "Jadwal Baru"}
                            onValueChange={(value) =>
                              handleQuickStatusUpdate(item, value as ScheduleStatus)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Pilih status" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-(--dash-border) bg-(--dash-surface) text-(--dash-ink)">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Timeline Mendatang</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingItems.length === 0 ? (
            <p className="text-sm text-(--dash-muted)">Belum ada agenda tersimpan.</p>
          ) : (
            <div className="relative pl-6 sm:pl-7">
              <div className="absolute bottom-0 left-2 top-0 w-px bg-white/15" />
              <div className="space-y-3">
                {upcomingItems.map((item) => (
                  <div key={item.id} className="relative">
                    <div className="absolute -left-5 top-4 h-3 w-3 rounded-full border border-white/20 bg-emerald-300/80" />
                    <div className="rounded-xl border border-white/10 bg-(--dash-surface-strong) p-3">
                      <p className="text-xs text-(--dash-muted)">
                        {item.date} {item.time ? `• ${item.time}` : ""}
                      </p>
                      <p className="mt-1 text-sm font-semibold">{item.operasi}</p>
                      <p className="mt-1 text-xs text-(--dash-muted)">
                        {item.operator} • {item.rumahSakit}
                      </p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[11px] ${statusColorMap[item.status || "Jadwal Baru"]}`}
                      >
                        {item.status || "Jadwal Baru"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
