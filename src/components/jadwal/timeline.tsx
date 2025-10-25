// components/jadwal/timeline.tsx
import { VisitDokter } from '@/lib/types';
import { VisitEvent } from './visit-event';
import { getDay, getHours } from 'date-fns';

interface TimelineProps {
  visits: VisitDokter[];
  onVisitClick: (visit: VisitDokter) => void;
}

const START_HOUR = 8; 
const END_HOUR = 15; 
const totalHours = END_HOUR - START_HOUR + 1;

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hours = Array.from({ length: totalHours }, (_, i) => {
  const hour = START_HOUR + i;
  return hour > 12 ? `${hour - 12} PM` : (hour === 12 ? "12 PM" : `${hour} AM`);
});

export function Timeline({ visits, onVisitClick }: TimelineProps) {
  return (
    <div className="relative border rounded-lg overflow-hidden bg-card text-card-foreground shadow-lg">
      
      {/* Container Grid Utama */}
      <div 
        className="grid"
        style={{
          gridTemplateColumns: '60px repeat(6, 1fr)',
          gridTemplateRows: `40px repeat(${totalHours}, 1fr)`,
          minHeight: `${totalHours * 80}px` 
        }}
      >
        {/* Header Hari */}
        <div className="col-start-1 row-start-1"></div>
        {days.map((day, i) => (
          <div 
            key={day} 
            className="col-start-2-end row-start-1 text-center font-medium p-2 border-b border-r last:border-r-0 border-border" 
            style={{ gridColumnStart: i + 2 }}
          >
            {day}
          </div>
        ))}

        {/* Label Jam (Kolom Samping) */}
        {hours.map((hour, i) => (
          <div 
            key={hour} 
            className="col-start-1 row-start-auto text-xs text-right pr-2 text-muted-foreground pt-1" 
            style={{ gridRowStart: i + 2, gridRowEnd: i + 3 }}
          >
            {hour}
          </div>
        ))}

        {/* Garis Grid Latar Belakang */}
        {days.map((_, dayIndex) => (
          hours.map((_, hourIndex) => (
            <div 
              key={`${dayIndex}-${hourIndex}`}
              className="border-r border-b border-border/50" // Garis lebih halus
              style={{
                gridColumnStart: dayIndex + 2,
                gridRowStart: hourIndex + 2,
              }}
            ></div>
          ))
        ))}

        {/* Render Events/Visits */}
        {visits.map(visit => {
          const visitTime = new Date(visit.waktuVisit);
          const dayOfWeek = getDay(visitTime); 
          const hour = getHours(visitTime);
          
          if (dayOfWeek < 1 || dayOfWeek > 6 || hour < START_HOUR || hour > END_HOUR) {
            return null;
          }

          const colStart = dayOfWeek + 1; 
          const rowStart = (hour - START_HOUR) + 2; 
          const durasiJam = Math.max(1, Math.ceil((visit.durasiMenit || 60) / 60));

          return (
            <div
              key={visit.id}
              className="p-1 z-10"
              style={{
                gridColumnStart: colStart,
                gridRowStart: rowStart,
                gridRowEnd: `span ${durasiJam}`,
              }}
              onClick={() => onVisitClick(visit)}
            >
              <VisitEvent visit={visit} />
            </div>
          );
        })}
      </div>
    </div>
  );
}