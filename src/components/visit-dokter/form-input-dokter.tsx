"use client";

import { useState, FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Stethoscope, Hospital } from "lucide-react";
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
  const [rumahSakit, setRumahSakit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/list-dokter', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namaDokter, rumahSakit }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menyimpan data");
      }
      
      await onDoctorAdded();
      toast.success("Dokter baru berhasil ditambahkan!");
      setNamaDokter("");
      setRumahSakit("");
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
                <Label htmlFor="rumahSakit">Rumah Sakit</Label>
                <div className="relative"><Hospital className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input id="rumahSakit" value={rumahSakit} onChange={(e) => setRumahSakit(e.target.value)} placeholder="RS. Harapan" required className="pl-10"/></div>
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
