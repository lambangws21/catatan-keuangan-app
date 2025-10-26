"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns"; 
import { Schedule } from "@/app/visit-dokter/page"; // Mengimpor tipe Schedule dari halaman induk
import { cn } from "@/lib/utils"; // Utilitas shadcn
import { Trash2, Edit, Notebook, CalendarDays, Clock, History } from "lucide-react"; // Import ikon aksi
import { Button } from "@/components/ui/button"; // Import Button
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"; // Import Toggle Group (Asumsi tersedia di proyek shadcn/ui)

// Fungsi helper untuk menentukan warna status
const getStatusIndicator = (status: string) => {
    switch (status) {
        case 'Terjadwal':
            return 'bg-blue-500';
        case 'Selesai':
            return 'bg-green-500';
        case 'Dibatalkan':
            return 'bg-red-500';
        default:
            return 'bg-gray-500';
    }
};

// --- Komponen Sidebar Jadwal Ringkas ---
interface ScheduleSidebarProps {
    schedules: Schedule[];
    onEdit: (schedule: Schedule) => void;
    onDelete: (scheduleId: string) => void; 
}

// Definisikan tipe mode filter
type FilterMode = 'upcoming' | 'past';

export default function ScheduleSidebar({ schedules, onEdit, onDelete }: ScheduleSidebarProps) {
    // 🌟 1. STATE UNTUK MODE FILTER 🌟
    const [filterMode, setFilterMode] = useState<FilterMode>('upcoming');

    // Handler untuk konfirmasi delete
    const handleDeleteClick = (e: React.MouseEvent, scheduleId: string) => {
        e.stopPropagation();
        // Mengganti window.confirm dengan tampilan modal/dialog khusus
        // Jika menggunakan library seperti sonner atau custom modal, pastikan untuk menggantinya.
        // Untuk saat ini, kita ikuti aturan untuk TIDAK menggunakan window.confirm
        if (confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) {
            onDelete(scheduleId);
        }
    };
    
    // 🌟 2. LOGIKA FILTER JADWAL 🌟
    const now = new Date().getTime();

    const filteredAndSortedSchedules = schedules
        .filter(s => {
            const visitTime = new Date(s.waktuVisit).getTime();
            if (filterMode === 'upcoming') {
                // Tampilkan jadwal yang sama dengan atau lebih besar dari waktu saat ini
                return visitTime >= now;
            } else { // 'past'
                // Tampilkan jadwal yang lebih kecil dari waktu saat ini
                return visitTime < now;
            }
        })
        .sort((a, b) => {
            const timeA = new Date(a.waktuVisit).getTime();
            const timeB = new Date(b.waktuVisit).getTime();

            if (filterMode === 'upcoming') {
                // Ascending (yang terdekat di atas)
                return timeA - timeB; 
            } else { // 'past'
                // Descending (yang terbaru/paling baru selesai di atas)
                return timeB - timeA; 
            }
        });

    const title = filterMode === 'upcoming' ? 'Jadwal Mendatang' : 'Jadwal Sebelumnya (Histori)';


    return (
        <Card className="h-full sticky top-4 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-2xl">
            <CardHeader className="py-4 border-b border-border/50">
                <CardTitle className="text-xl font-bold mb-3 flex items-center gap-2">
                    {filterMode === 'upcoming' ? <Clock className="w-5 h-5 text-blue-400"/> : <History className="w-5 h-5 text-gray-400"/>}
                    {title} ({filteredAndSortedSchedules.length})
                </CardTitle>
                
                {/* 🌟 3. TOMBOL TOGGLE FILTER 🌟 */}
                <ToggleGroup 
                    type="single" 
                    value={filterMode} 
                    onValueChange={(value) => {
                        if (value) setFilterMode(value as FilterMode);
                    }}
                    className="justify-start gap-2 bg-muted p-1 rounded-lg"
                    aria-label="Filter Schedule Mode"
                >
                    <ToggleGroupItem value="upcoming" aria-label="Jadwal Mendatang" className="data-[state=on]:bg-blue-500 data-[state=on]:text-white data-[state=on]:shadow-md flex-1 text-sm rounded-md h-8">
                        <CalendarDays className="h-4 w-4 mr-2" />
                        Mendatang
                    </ToggleGroupItem>
                    <ToggleGroupItem value="past" aria-label="Jadwal Sebelumnya" className="data-[state=on]:bg-gray-500 data-[state=on]:text-white data-[state=on]:shadow-md flex-1 text-sm rounded-md h-8">
                        <History className="h-4 w-4 mr-2" />
                        Sebelumnya
                    </ToggleGroupItem>
                </ToggleGroup>
            </CardHeader>
            
            <CardContent className="p-0">
                {filteredAndSortedSchedules.length === 0 ? (
                    <p className="text-center text-muted-foreground p-6 text-sm">
                        {filterMode === 'upcoming' 
                            ? "Tidak ada jadwal yang akan datang." 
                            : "Tidak ada jadwal yang telah selesai atau dibatalkan."
                        }
                    </p>
                ) : (
                    <div className="divide-y divide-border/50">
                        {filteredAndSortedSchedules.map((schedule) => (
                            <div
                                key={schedule.id}
                                className="relative flex items-center gap-3 p-3 hover:bg-muted/70 transition-colors group"
                            >
                                {/* Area Detail (Klik untuk Edit) */}
                                <div 
                                    onClick={() => onEdit(schedule)}
                                    className="flex items-start gap-3 flex-1 min-w-0 pr-10 cursor-pointer"
                                >
                                    {/* Indikator Status Warna */}
                                    <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", getStatusIndicator(schedule.status))}></div>
                                    
                                    {/* Detail Jadwal */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate text-foreground">{schedule.namaDokter}</p>
                                        <p className="text-xs text-muted-foreground truncate">{schedule.rumahSakit}</p>
                                        <p className=" flex items-center text-xs text-muted-foreground truncate"><Notebook className="w-3 h-3 mr-1" /> {schedule.note}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs font-medium text-primary">
                                                {format(new Date(schedule.waktuVisit), 'EEE, d MMM')}
                                            </span>
                                            <span className="text-xs font-bold text-foreground/80 bg-muted px-2 py-0.5 rounded-full">
                                                {format(new Date(schedule.waktuVisit), 'HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Tombol Aksi (Delete & Edit) */}
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                                        onClick={(e) => handleDeleteClick(e, schedule.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-yellow-500 hover:bg-yellow-500/10"
                                        onClick={() => onEdit(schedule)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
