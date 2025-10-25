"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns"; 
import { Schedule } from "@/app/visit-dokter/page"; // Mengimpor tipe Schedule dari halaman induk
import { cn } from "@/lib/utils"; // Utilitas shadcn
import { Trash2, Edit } from "lucide-react"; // Import ikon aksi
import { Button } from "@/components/ui/button"; // Import Button

// Fungsi helper untuk menentukan warna status
const getStatusIndicator = (status: string) => {
    switch (status) {
        case 'Terjadwal':
        case 'Terjadwal':
            return 'bg-blue-500';
        case 'Selesai':
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
    onDelete: (scheduleId: string) => void; // Prop BARU untuk fungsi delete
}

export default function ScheduleSidebar({ schedules, onEdit, onDelete }: ScheduleSidebarProps) {
    // Urutkan berdasarkan waktu visit
    // Filter jadwal yang waktunya sudah lewat (hanya tampilkan yang akan datang)
    const upcomingSchedules = schedules
        .filter(s => new Date(s.waktuVisit) >= new Date())
        .sort((a, b) => new Date(a.waktuVisit).getTime() - new Date(b.waktuVisit).getTime());

    // Handler untuk konfirmasi delete
    const handleDeleteClick = (e: React.MouseEvent, scheduleId: string) => {
        e.stopPropagation(); // Mencegah event klik menyebar ke div item (onEdit)
        if (window.confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) {
            onDelete(scheduleId);
        }
    };

    return (
        <Card className="h-full sticky top-4 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-2xl">
            <CardHeader className="py-4 border-b border-border/50">
                <CardTitle className="text-xl font-bold">Jadwal Mendatang ({upcomingSchedules.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {upcomingSchedules.length === 0 ? (
                    <p className="text-center text-muted-foreground p-6 text-sm">Tidak ada jadwal yang akan datang.</p>
                ) : (
                    <div className="divide-y divide-border/50">
                        {upcomingSchedules.map((schedule) => (
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
                                
                                {/* Tombol Aksi (Delete) */}
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                                        onClick={(e) => handleDeleteClick(e, schedule.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    
                                    {/* Tombol Edit Visual (Opsional, karena klik item sudah edit) */}
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
