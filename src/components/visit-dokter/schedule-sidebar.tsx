"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns"; 
import { Schedule } from "@/app/visit-dokter/page"; // Mengimpor tipe Schedule dari halaman induk

// --- Komponen Sidebar Jadwal Ringkas ---
interface ScheduleSidebarProps {
    schedules: Schedule[];
    onEdit: (schedule: Schedule) => void;
}

export default function ScheduleSidebar({ schedules, onEdit }: ScheduleSidebarProps) {
    // Urutkan berdasarkan waktu visit
    const sortedSchedules = schedules
        .sort((a, b) => new Date(a.waktuVisit).getTime() - new Date(b.waktuVisit).getTime());

    return (
        <Card className="h-full sticky top-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <CardHeader className="py-4">
                <CardTitle className="text-lg">Jadwal Mendatang ({sortedSchedules.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {sortedSchedules.length === 0 ? (
                    <p className="text-center text-muted-foreground p-4 text-sm">Belum ada jadwal yang dibuat.</p>
                ) : (
                    <div className="space-y-2">
                        {sortedSchedules.map((schedule) => (
                            <div
                                key={schedule.id}
                                onClick={() => onEdit(schedule)}
                                className="border-b border-border/50 p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                                <p className="text-sm font-semibold truncate">{schedule.namaDokter} ({schedule.status})</p>
                                <p className="text-xs text-muted-foreground">{schedule.rumahSakit}</p>
                                <p className="text-xs font-medium mt-1">
                                    {format(new Date(schedule.waktuVisit), 'EEE, d MMM, hh:mm a')}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
