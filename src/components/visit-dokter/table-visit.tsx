"use client";

import { Trash2, ArchiveX, Loader2, Hospital, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
// import { useAuth } from "@/components/AuthProvider"; // Tidak lagi diperlukan
import { toast } from 'sonner';
import { motion } from 'framer-motion';
// Komponen Tabel dihapus
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import ScheduleForm from "@/components/visit-dokter/form-input"; 

// Tipe data baru untuk dokter
interface Doctor {
  id: string;
  namaDokter: string;
  rumahSakit: string;
}

// Tipe data jadwal
interface Schedule {
  id: string;
  namaDokter: string;
  rumahSakit: string;
  waktuVisit: string;
  status: string;
}
interface ScheduleManagerProps {
    schedulesData: Schedule[];
    isLoading: boolean;
    onDataChange: () => Promise<void>;
    doctorsList: Doctor[]; // Prop baru untuk list dokter
}

// Fungsi untuk memformat waktu
const formatWaktu = (isoString: string) => {
    return new Date(isoString).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};

// Fungsi untuk styling badge status
const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
        case "Selesai": return "default";
        case "Dibatalkan": return "destructive";
        case "Terjadwal": default: return "secondary";
    }
};

export default function ScheduleManager({ schedulesData, isLoading, onDataChange, doctorsList }: ScheduleManagerProps) {
  // const { user } = useAuth(); // Tidak lagi diperlukan
  
  const handleDelete = async (id: string) => {
    // if (!user) return toast.error("Sesi tidak valid, silakan login kembali."); // Dihapus
    if (!window.confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) return;
    
    try {
      // const token = await user.getIdToken(); // Dihapus
      // PERBAIKAN: Path API dikembalikan ke /api/schedules agar konsisten
      const response = await fetch(`/api/visit-dokter/${id}`, { 
          method: "DELETE",
          // headers: { 'Authorization': `Bearer ${token}` }, // Dihapus
      });
      if (!response.ok) throw new Error("Gagal menghapus jadwal.");
      toast.success("Jadwal berhasil dihapus.");
      await onDataChange();
    } catch (error) {
        toast.error((error as Error).message);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center p-16"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>
  );
  
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="visible"
    >
        {!Array.isArray(schedulesData) || schedulesData.length === 0 ? (
            <div className="text-center text-gray-400 py-16 bg-gray-800/50 rounded-lg">
                <ArchiveX className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                <p className="font-semibold">Belum Ada Jadwal</p>
                <p className="text-sm">Jadwal yang Anda buat akan muncul di sini.</p>
            </div>
        ) : (
            // Mengganti Table dengan Grid yang responsif
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {schedulesData.map((item) => (
                <motion.div 
                  key={item.id}
                  variants={itemVariants}
                  className="bg-gray-800/70 backdrop-blur-md border border-white/10 rounded-lg shadow-lg p-5 flex flex-col justify-between"
                >
                  {/* Header Card: Status dan Tombol Aksi */}
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
                    <TooltipProvider>
                      <div className="flex items-center -mr-3 -mt-2"> {/* Margin negatif agar tombol menempel di sudut */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {/* PERUBAHAN: Meneruskan 'doctorsList' (dari props) ke form edit */}
                            <ScheduleForm 
                              onFormSubmit={onDataChange} 
                              initialData={item}
                              doctorsList={doctorsList} // Menggunakan list dokter utama
                            />
                          </TooltipTrigger>
                          <TooltipContent><p>Edit Jadwal</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Hapus Jadwal</p></TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </div>

                  {/* Body Card: Informasi Utama */}
                  <div className="flex-grow">
                    <h3 className="text-xl font-bold text-cyan-400 mb-2">{item.namaDokter}</h3>
                    <div className="flex items-center gap-2.5 text-gray-300 mb-2">
                      <Hospital className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>{item.rumahSakit}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-gray-300">
                      <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>{formatWaktu(item.waktuVisit)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
        )}
    </motion.div>
  );
}

