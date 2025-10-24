"use client";

import { useState, FormEvent, useEffect } from "react";
// import { useAuth } from "@/components/AuthProvider"; // Tidak diperlukan lagi
import { toast } from "sonner";
import { Loader2, Plus, Edit, Stethoscope, Hospital, Clock, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    status: string;
}

// Definisikan props
interface ScheduleFormProps {
  onFormSubmit: () => Promise<void>; 
  initialData?: ScheduleData & { id: string }; 
  doctorsList?: Doctor[]; // PERBAIKAN: Menggunakan 'doctorsList'
}

const formatDateTimeForInput = (isoString: string) => {
    if (!isoString) return "";
    return isoString.slice(0, 16);
};

const initialFormData: ScheduleData = {
    namaDokter: "",
    rumahSakit: "",
    waktuVisit: formatDateTimeForInput(new Date().toISOString()),
    status: "Terjadwal"
};

export default function ScheduleForm({ onFormSubmit, initialData, doctorsList = [] }: ScheduleFormProps) {
  // const { user } = useAuth(); // Tidak diperlukan lagi
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<ScheduleData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!initialData;

  // Logika 'uniqueDoctors' dan 'useMemo' dihapus
  // Kita akan langsung menggunakan 'doctorsList' dari props

  useEffect(() => {
    if (isEditMode && initialData && isOpen) {
      setFormData({
        ...initialData,
        waktuVisit: formatDateTimeForInput(initialData.waktuVisit),
      });
    } else if (!isEditMode && isOpen) {
      setFormData(initialFormData);
    }
  }, [initialData, isEditMode, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleStatusChange = (value: string) => {
    setFormData(prev => ({ ...prev, status: value }));
  };

  // Handler untuk auto-fill saat dokter dipilih
  const handleDoctorChange = (doctorName: string) => {
    // Cari dokter di 'doctorsList' (prop baru)
    const selectedDoctor = doctorsList.find(doc => doc.namaDokter === doctorName);
    if (selectedDoctor) {
        setFormData(prev => ({
            ...prev,
            namaDokter: selectedDoctor.namaDokter,
            rumahSakit: selectedDoctor.rumahSakit,
        }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      // PERBAIKAN: Path API dikembalikan ke /api/schedules agar konsisten
      const url = isEditMode ? `/api/visit-dokter/${initialData?.id}` : "/api/visit-dokter";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menyimpan data");
      }
      
      await onFormSubmit();
      toast.success(`Jadwal berhasil ${isEditMode ? 'diperbarui' : 'disimpan'}!`);
      setIsOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const TriggerButton = isEditMode ? (
    <Button variant="ghost" size="icon"><Edit className="h-4 w-4 text-yellow-500" /></Button>
  ) : (
    <Button className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold md:rounded-lg rounded-full p-3 md:px-4 md:py-2 transition-all">
      <Plus className="h-5 w-5 md:mr-2" />
      <span className="hidden md:inline">Jadwal Baru</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{TriggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">{isEditMode ? 'Edit' : 'Input'} Jadwal Visit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="namaDokter">Pilih Dokter</Label>
                <div className="relative"><Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    {/* PERBAIKAN: Gunakan 'value' dari state untuk 'Select' */}
                    <Select onValueChange={handleDoctorChange} value={formData.namaDokter}>
                        <SelectTrigger className="w-full pl-10">
                            <SelectValue placeholder="Pilih dari daftar dokter..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 text-white border-gray-600">
                            {/* PERBAIKAN: Iterasi 'doctorsList' (prop baru) */}
                            {doctorsList.map(doc => (
                                <SelectItem key={doc.id} value={doc.namaDokter}>
                                    {doc.namaDokter} ({doc.rumahSakit})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            {/* Input manual untuk 'namaDokter' dihapus karena sudah di-handle 'Select' */}

            <div className="space-y-2">
                <Label htmlFor="rumahSakit">Rumah Sakit</Label>
                <div className="relative"><Hospital className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                    id="rumahSakit" 
                    name="rumahSakit" 
                    value={formData.rumahSakit} 
                    onChange={handleChange} 
                    placeholder="Akan terisi otomatis" 
                    required 
                    className="pl-10"
                    readOnly // Dibuat read-only karena diisi oleh dropdown
                /></div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="waktuVisit">Waktu Visit</Label>
                <div className="relative"><Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input id="waktuVisit" name="waktuVisit" type="datetime-local" value={formData.waktuVisit} onChange={handleChange} required className="pl-10"/></div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <div className="relative"><ListChecks className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Select value={formData.status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-full pl-10"><SelectValue placeholder="Pilih status" /></SelectTrigger>
                        <SelectContent className="bg-gray-700 text-white border-gray-600">
                            <SelectItem value="Terjadwal">Terjadwal</SelectItem>
                            <SelectItem value="Selesai">Selesai</SelectItem>
                            <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
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

