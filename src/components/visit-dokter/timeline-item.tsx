"use client";

import { motion } from 'framer-motion';
import { cn } from "@/lib/utils"; // Utilitas shadcn
import { format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from 'lucide-react';
// Import Schedule dari lokasi yang benar
import { Schedule } from '@/app/visit-dokter/page'; 

interface TimelineItemProps {
    schedule: Schedule;
    isFocused?: boolean;
    onClick: (schedule: Schedule) => void; // Tambahkan prop onClick BARU
}

const getStatusStyles = (status: string) => {
    // Mewarnai card berdasarkan status (warna cerah yang kontras di Dark Mode)
    switch (status) {
        case 'In Progress':
        case 'Terjadwal':
            // Biru cerah (Seperti di gambar contoh)
            return 'bg-blue-600 text-white shadow-xl border-blue-700 dark:bg-blue-700/80';
        case 'Done':
        case 'Selesai':
            // Hijau (Completed)
            return 'bg-green-500 text-white shadow-lg border-green-600 dark:bg-green-600/80';
        case 'To Do':
        case 'Dibatalkan':
        default:
            // Kuning/Oranye (Pending/To Do)
            return 'bg-amber-500 text-white shadow-lg border-amber-600 dark:bg-amber-600/80';
    }
};

export function TimelineItem({ schedule, isFocused = false, onClick }: TimelineItemProps) {
    const time = format(new Date(schedule.waktuVisit), 'h:mm a');
    const styles = getStatusStyles(schedule.status);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, zIndex: 30 }} 
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={() => onClick(schedule)} // Event klik memicu edit
            className={cn(
                "w-full p-1.5 rounded-2xl border-0 cursor-pointer transition-all duration-300 relative",
                styles,
                isFocused ? 'scale-[1.03] ring-4 ring-white/20' : 'hover:shadow-2xl', 
                schedule.status === 'Terjadwal' ? 'min-h-[60px]' : 'min-h-[30px]' 
            )}
        >
            <div className="flex justify-between items-start">
                
                {/* PERBAIKAN: Batasi lebar kontainer nama dokter agar "truncate" bekerja 
                   dengan baik di lingkungan flex. */}
                <div className="flex-1 min-w-0 pr-2"> 
                    <h3 className="text-base md:text-sm font-extrabold truncate text-white">
                        {schedule.namaDokter}
                    </h3>
                    <p className="text-xs md:text-xs mt-0.5 text-white/90 truncate">
                        {schedule.rumahSakit}
                    </p>
                </div>
                
                {/* Waktu: Diberi flex-shrink-0 agar tidak dikecilkan */}
                <span className="font-semibold text-lg pr-1 md:text-sm text-white flex-shrink-0">
                    {time}
                </span>
            </div>

            {/* Konten Tambahan (Hanya muncul saat event penting) */}
            {schedule.status === 'Terjadwal' && (
                <div className="flex justify-between items-end mt-2 pt-1 border-t border-white/30">
                    <div className="flex -space-x-2">
                        {/* Placeholder Avatars */}
                        <Avatar className="border-2 border-white w-7 h-7"><AvatarFallback className="text-xs">DS</AvatarFallback></Avatar>
                    </div>
                    <div className="p-1.5 bg-white/20 rounded-full">
                        <Star className="w-3 h-3 text-white" />
                    </div>
                </div>
            )}
        </motion.div>
    );
}
