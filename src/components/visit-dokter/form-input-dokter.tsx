"use client";

import { useState, FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Stethoscope, Hospital, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


interface DoctorFormProps {
  onDoctorAdded: () => Promise<void>; 
}

export default function DoctorForm({ onDoctorAdded }: DoctorFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [namaDokter, setNamaDokter] = useState("");
  const [rumahSakitList, setRumahSakitList] = useState<string[]>([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setHospitalAt = (index: number, value: string) => {
    setRumahSakitList((prev) =>
      prev.map((v, i) => (i === index ? value : v))
    );
  };

  const addHospital = () => {
    setRumahSakitList((prev) => (prev.length >= 3 ? prev : [...prev, ""]));
  };

  const removeHospital = (index: number) => {
    setRumahSakitList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [""];
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const hospitals = rumahSakitList
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 3);

      if (!namaDokter.trim()) throw new Error("Nama dokter wajib diisi.");
      if (hospitals.length === 0) throw new Error("Rumah sakit wajib diisi.");
      if (hospitals.length > 3) throw new Error("Maksimal 3 rumah sakit.");

      const response = await fetch('/api/list-dokter', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namaDokter, rumahSakit: hospitals }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menyimpan data");
      }
      
      await onDoctorAdded();
      toast.success("Dokter baru berhasil ditambahkan!");
      setNamaDokter("");
      setRumahSakitList([""]);
      setIsOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold md:rounded-lg rounded-full p-3 md:px-4 md:py-2 transition-all">
          <Plus className="h-5 w-5 md:mr-2" />
          <span className="hidden md:inline">Tambah Dokter</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">Tambah Dokter Baru</DialogTitle>
          <p className="text-sm text-gray-400">Tambah dokter ke daftar utama.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="namaDokter">Nama Dokter</Label>
                <div className="relative"><Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input id="namaDokter" value={namaDokter} onChange={(e) => setNamaDokter(e.target.value)} placeholder="Dr. Siapa" required className="pl-10"/></div>
            </div>
            <div className="space-y-2">
              <Label>Rumah Sakit (maksimal 3)</Label>
              <div className="space-y-2">
                {rumahSakitList.map((value, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Hospital className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={value}
                        onChange={(e) => setHospitalAt(idx, e.target.value)}
                        placeholder={idx === 0 ? "RS. Harapan" : `Rumah Sakit ${idx + 1}`}
                        required={idx === 0}
                        className="pl-10"
                      />
                    </div>
                    {rumahSakitList.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHospital(idx)}
                        aria-label="Hapus rumah sakit"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addHospital}
                  disabled={rumahSakitList.length >= 3}
                  className="border border-white/10 bg-white/10 text-white hover:bg-white/15"
                >
                  Tambah Rumah Sakit
                </Button>
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
