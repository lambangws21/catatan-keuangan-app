"use client";


import { motion } from 'framer-motion';
import { cn } from "@/lib/utils"; // Utilitas shadcn
import { format } from "date-fns";
import { NotebookPen, Star, XCircle, CheckCircle } from 'lucide-react'; // Tambahkan ikon
// Import Schedule dari lokasi yang benar
import { Schedule } from '@/app/visit-dokter/page'; 

interface TimelineItemProps {
    schedule: Schedule;
    isFocused?: boolean;
    onClick: (schedule: Schedule) => void; 
}

const getStatusStyles = (status: string) => {
    switch (status) {
        case 'Terjadwal':
            // Biru cerah
            return 'bg-blue-600 text-white shadow-xl border-blue-700 dark:bg-blue-700/80 hover:bg-blue-700';
        case 'Selesai':
            // Hijau (Completed)
            return 'bg-green-600 text-white shadow-lg border-green-700 dark:bg-green-700/80 hover:bg-green-700';
        case 'Dibatalkan':
            // Merah (Cancelled)
            return 'bg-red-600 text-white shadow-lg border-red-700 dark:bg-red-700/80 hover:bg-red-700';
        default:
            // Kuning/Oranye (Fallback)
            return 'bg-amber-500 text-white shadow-lg border-amber-600 dark:bg-amber-600/80 hover:bg-amber-600';
    }
};

export function TimelineItem({ schedule, isFocused = false, onClick }: TimelineItemProps) {
    const time = format(new Date(schedule.waktuVisit), 'HH:mm');
    const styles = getStatusStyles(schedule.status);
    
    // Tentukan apakah konten khusus (Note/Status Icon) harus ditampilkan
    const showSpecialContent = schedule.status === 'Selesai' || schedule.status === 'Dibatalkan';

    // Tentukan ikon khusus untuk status selesai/dibatalkan
    const SpecialIcon = 
        schedule.status === 'Selesai' ? CheckCircle : 
        schedule.status === 'Dibatalkan' ? XCircle : 
        Star; // Fallback icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, zIndex: 30 }} 
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={() => onClick(schedule)} // Event klik memicu edit
            className={cn(
                "w-auto p-2 rounded-xl border-0 cursor-pointer transition-all duration-300 relative group",
                styles,
                isFocused ? 'scale-[1.03] ring-1 ring-white/20' : 'hover:shadow-2xl', 
                // Sesuaikan tinggi minimal berdasarkan konten khusus
                showSpecialContent ? 'min-h-[75px]' : 'min-h-[50px]' 
            )}
        >
            
            {/* 🌟 POPUP EVENT (TOOLTIP) - Ditampilkan saat hover 🌟 */}
            <div className="absolute top-0 left-full ml-4 p-3 w-64 bg-gray-900 text-white rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 border border-gray-700 hidden sm:block">
                <h4 className="font-bold text-sm text-cyan-400 border-b border-gray-700 pb-1 mb-1">Detail Jadwal</h4>
                <p className="text-xs">
                    *Dokter:* {schedule.namaDokter} <br />
                    *RS:* {schedule.rumahSakit} <br />
                    *Waktu:* {format(new Date(schedule.waktuVisit), 'dd MMM yyyy, HH:mm')}
                </p>
                {schedule.note && (
                    <p className="text-xs mt-1 border-t border-gray-700 pt-1">
                        *Catatan:* {schedule.note}
                    </p>
                )}
                {/* Segitiga penunjuk */}
                <div className="absolute left-[-8px] top-3 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-gray-900"></div>
            </div>
            {/* 🌟 AKHIR POPUP EVENT 🌟 */}

            <div className="flex justify-between items-start">
                
                <div className="flex-1 min-w-0 pr-2"> 
                    <h3 className="text-base md:text-sm font-extrabold truncate text-white">
                        {schedule.namaDokter}
                    </h3>
                    <p className="text-xs md:text-xs mt-0.5 text-white/90 truncate">
                        {schedule.rumahSakit}
                    </p>
                </div>
                
                {/* Waktu */}
                <span className="font-semibold text-lg md:text-sm text-white flex-shrink-0">
                    {time}
                </span>
            </div>

            {/* 🌟 KONTEN KHUSUS (Selesai/Dibatalkan) 🌟 */}
            {showSpecialContent && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-between items-center mt-2 pt-1 border-t border-white/30"
                >
                    {/* Catatan/Note */}
                    <div className="flex items-center text-xs gap-1.5 font-medium text-white/90 truncate mr-2">
                        <NotebookPen className="w-3 h-3 text-white" />
                        {/* Jika note kosong, tampilkan status */}
                        {schedule.note || schedule.status} 
                    </div>
                    {/* Status Icon */}
                    <div className="p-1 bg-white/20 rounded-full flex-shrink-0">
                        <SpecialIcon className="w-3 h-3 text-white" />
                    </div>
                </motion.div>
            )}
            {/* 🌟 AKHIR KONTEN KHUSUS 🌟 */}
        </motion.div>
    );
}
