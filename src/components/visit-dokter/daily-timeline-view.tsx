"use client";

import { useState } from 'react';
import { Schedule } from '@/app/visit-dokter/page'; // Mengganti ke schedules/page untuk konsistensi tipe
import { TimelineItem } from '@/components/visit-dokter/timeline-item';
import { format, isSameDay, startOfWeek, addDays, setHours, setMinutes, differenceInMinutes, addMinutes } from 'date-fns'; 
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyTimelineViewProps {
    schedulesData: Schedule[];
    onDataChange: () => void; // Untuk refresh data jika diperlukan
    onEditSchedule: (schedule: Schedule) => void; // Fungsi untuk memicu edit di komponen induk
}

const HOURS_START = 8;
const HOURS_END = 20;
const totalHours = HOURS_END - HOURS_START;

// Konfigurasi Slotting/Overlap
const OVERLAP_TOLERANCE_MINUTES = 30; // Jika event berjarak kurang dari 30 menit, dianggap tumpang tindih
const MAX_SLOTS = 2; // Maksimal dua event yang tumpang tindih akan ditampilkan berdampingan

// --- Logic Collision Detection ---
interface ScheduledEvent extends Schedule {
    startTime: Date;
    endTime: Date;
    eventSlot: number; // 0 (default), 1 (offset)
    slotWidth: number; // Lebar event (persentase)
    slotOffset: number; // Offset dari kiri (persentase)
}

function assignSlotsToSchedules(schedules: Schedule[]): ScheduledEvent[] {
    if (!schedules.length) return [];

    const processedEvents: ScheduledEvent[] = schedules.map(s => {
        const startTime = new Date(s.waktuVisit);
        // Durasi default 60 menit
        const endTime = addMinutes(startTime, 60); 
        return {
            ...s,
            startTime,
            endTime,
            eventSlot: 0,
            slotWidth: 100,
            slotOffset: 0,
        };
    });

    // Reset slots and assign initial width/offset (assuming no conflict)
    processedEvents.forEach(event => {
        event.eventSlot = 0;
        event.slotWidth = 100;
        event.slotOffset = 0;
    });

    for (let i = 0; i < processedEvents.length; i++) {
        const current = processedEvents[i];
        const conflicts = [current];

        for (let j = i + 1; j < processedEvents.length; j++) {
            const next = processedEvents[j];
            
            // Cek apakah event tumpang tindih (atau sangat berdekatan)
            const diffStart = differenceInMinutes(current.startTime, next.startTime);

            if (
                // Event saat ini dimulai sebelum event berikutnya selesai, DAN
                current.startTime < next.endTime && 
                // Event saat ini selesai setelah event berikutnya dimulai
                current.endTime > next.startTime
            ) {
                conflicts.push(next);
            } else if (Math.abs(diffStart) < OVERLAP_TOLERANCE_MINUTES) {
                 // Kasus event yang sangat berdekatan (mis. jam 10:00 dan 10:15)
                conflicts.push(next);
            }
        }

        // Jika ada bentrokan, tetapkan slot dan lebar baru
        if (conflicts.length > 1) {
            const numSlots = Math.min(conflicts.length, MAX_SLOTS);
            const slotWidth = 100 / numSlots;

            conflicts.forEach((event, index) => {
                if (index < MAX_SLOTS) {
                    event.eventSlot = index;
                    event.slotWidth = slotWidth;
                    event.slotOffset = index * slotWidth;
                }
            });
        }
    }

    return processedEvents;
}


// --- Komponen Utama ---
export default function DailyTimelineView({ schedulesData, onEditSchedule }: DailyTimelineViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Hitung tanggal untuk 7 hari (Mon - Sun)
    const startOfThisWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfThisWeek, i));

    // Filter jadwal dan tetapkan slot (BARU)
    const todaySchedules = assignSlotsToSchedules(
        schedulesData.filter(s => isSameDay(new Date(s.waktuVisit), currentDate))
    ).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());


    const goToPreviousDay = () => setCurrentDate(addDays(currentDate, -1));
    const goToNextDay = () => setCurrentDate(addDays(currentDate, 1));
    const goToToday = () => setCurrentDate(new Date());

    // --- Layout Waktu dan Posisi ---

    const hourLabels = Array.from({ length: totalHours + 1 }, (_, i) => {
        const hour = HOURS_START + i;
        // PERBAIKAN: Menggunakan format 'H:00' untuk format 24 jam (8:00, 14:00, 17:00)
        return format(setMinutes(setHours(new Date(), hour), 0), 'H:00'); 
    });

    const PIXELS_PER_HOUR = 60; 
    const timelineHeight = totalHours * PIXELS_PER_HOUR;

    const getTopPosition = (date: Date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        
        if (hours < HOURS_START || hours > HOURS_END) return -999; 

        const totalMinutesFromStart = (hours - HOURS_START) * 60 + minutes;
        
        return (totalMinutesFromStart / (totalHours * 60)) * timelineHeight;
    };

    return (
        <div className="bg-slate-200/20 rounded-xl p-1.5 shadow-xl">
            
            {/* Header Kalender Mini dan Navigasi */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-7">
                
                {/* Tanggal Utama */}
                <div className="mb-4 md:mb-0">
                    <p className="text-sm text-muted-foreground">{format(currentDate, 'EEEE, d MMMM yyyy', { locale: id })}</p>
                    <h2 className="text-3xl font-extrabold text-foreground">
                        {isSameDay(currentDate, new Date()) ? "Today" : format(currentDate, 'EEEE', { locale: id })}
                    </h2>
                </div>
                
                {/* Navigasi Hari */}
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToPreviousDay}>
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button variant="outline" onClick={goToToday} disabled={isSameDay(currentDate, new Date())}>
                        Hari Ini
                    </Button>
                    <Button variant="outline" size="icon" onClick={goToNextDay}>
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Header Hari-Hari (Mon, Tue,...) - PENYESUAIAN FONT */}
            <div className="flex justify-around items-center mb-8 text-center border-b border-border/50 pb-4">
                {weekDays.map(day => (
                    <div 
                        key={day.toISOString()} 
                        className="flex flex-col items-center flex-1 cursor-pointer mx-1"
                        onClick={() => setCurrentDate(day)}
                    >
                        <span className="text-xs font-medium uppercase text-muted-foreground">{format(day, 'E', { locale: id })}</span>
                        <span className={cn(
                            "text-lg font-bold mt-1 h-7 w-7 flex items-center justify-center rounded-full transition-colors", 
                            isSameDay(day, currentDate) && "bg-primary text-primary-foreground",
                            isSameDay(day, new Date()) && !isSameDay(day, currentDate) && "text-primary border border-primary/50"
                        )}>
                            {format(day, 'd')}
                        </span>
                    </div>
                ))}
            </div>


            {/* Konten Timeline */}
            <div className="relative flex">
                
                {/* Kolom Label Jam (w-16 untuk ruang ekstra) */}
                <div className="w-10 flex-shrink-0 text-right pr-16">
                    {hourLabels.map((label) => (
                        <div 
                            key={label} 
                            className="text-[12px] text-muted-foreground pt-5 relative" 
                            style={{ height: `${PIXELS_PER_HOUR}px`, top: `-${PIXELS_PER_HOUR / 2}px` }} 
                        >
                            {label}
                        </div>
                    ))}
                </div>

                {/* Kolom Jadwal */}
                <div 
                    className="flex-1 relative border-l border-border/50 bg-slate-100/20" // Border vertikal di sini
                    style={{ minHeight: `${timelineHeight}px` }}
                >
                    {/* Garis Jam Horisontal */}
                    {Array.from({ length: totalHours }, (_, i) => (
                        <div 
                            key={i} 
                            className="absolute left-0 w-full border-t border-border/20" 
                            style={{ top: `${(i + 1) * PIXELS_PER_HOUR}px` }}
                        >
                        </div>
                    ))}

                    {/* Marker Waktu Saat Ini */}
                    {isSameDay(currentDate, new Date()) && (
                        <div 
                            className="absolute left-0 w-full h-0.5 bg-red-500 z-20 transition-all duration-1000"
                            style={{ top: `${getTopPosition(new Date())}px` }}
                        >
                            <div className="absolute left-[-6px] top-[-3px] w-3 h-3 rounded-full bg-red-500"></div>
                        </div>
                    )}
                    
                    {/* Event Items */}
                    {todaySchedules.map((schedule) => {
                        const startTime = schedule.startTime; // Mengambil dari object yang sudah di-preprocess
                        const durationMinutes = differenceInMinutes(schedule.endTime, schedule.startTime); 
                        
                        const eventTop = getTopPosition(startTime);
                        if (eventTop < 0 || eventTop > timelineHeight) return null;

                        const heightPx = (durationMinutes / 60) * PIXELS_PER_HOUR;
                        
                        const isFocused = schedule.status === 'Terjadwal'; 
                        
                        return (
                            <div
                                key={schedule.id}
                                // Menerapkan offset dan lebar berdasarkan slot
                                className="absolute z-10" 
                                style={{
                                    top: `${eventTop}px`,
                                    height: `${heightPx}px`,
                                    // Menerapkan lebar dan offset yang diperhitungkan
                                    left: `${schedule.slotOffset}%`, 
                                    width: `${schedule.slotWidth}%`,
                                    padding: '2px', // Padding agar kartu tidak menyentuh garis
                                }}
                            >
                                <TimelineItem schedule={schedule} isFocused={isFocused} onClick={onEditSchedule} /> 
                            </div>
                        );
                    })}

                    {todaySchedules.length === 0 && (
                        <div className="text-center text-muted-foreground p-10 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            Tidak ada jadwal visit pada tanggal ini.
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
