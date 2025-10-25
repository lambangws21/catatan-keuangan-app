'use client';

import React from 'react';

// --- Tipe Data untuk Kalender Manual ---

/**
 * Format event baru yang disederhanakan untuk komponen manual kita.
 * 'dayOfWeek' adalah 0 (Senin) sampai 5 (Sabtu).
 * 'startHour' dan 'endHour' adalah jam (misal: 9, 10.5, 14).
 */
export interface ManualEvent {
  id: string;
  title: string;
  dayOfWeek: number; // 0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri, 5 = Sat
  startHour: number; // Jam mulai (misal: 9, 10.5 untuk 10:30)
  endHour: number; // Jam selesai (misal: 10, 11)
  color: string; // Tailwind bg color class (misal: 'bg-blue-500')
}

interface CalendarProps {
  events: ManualEvent[];
}

// --- Konstanta & Helper ---

// Daftar jam yang akan ditampilkan di sidebar (8 AM - 5 PM)
// Total 10 jam, masing-masing 1 jam.
const timeSlots = Array.from({ length: 10 }, (_, i) => 8 + i); // [8, 9, ..., 17]

// Daftar hari
const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Helper untuk mengkalkulasi posisi grid CSS.
 * Kita memiliki 2 slot per jam (slot 30 menit).
 * 8:00 -> row 1
 * 8:30 -> row 2
 * 9:00 -> row 3
 * Jam 8 PAGI (slotMinTime) adalah offset kita.
 */
const calculateGridRow = (hour: number) => {
  const slotMinTime = 8;
  // (jam - jam_mulai) * 2 slot per jam + 1 (karena grid row 1-based)
  return (hour - slotMinTime) * 2 + 1;
};

// --- Komponen ---

/**
 * Komponen Kalender Kustom
 * Menggunakan CSS Grid untuk layout yang bersih.
 */
export function CalendarWeekView({ events }: CalendarProps) {
  // Total baris grid = 10 jam * 2 slot/jam = 20 baris
  const totalGridRows = timeSlots.length * 2;

  return (
    <div className="flex">
      {/* Kolom 1: Slot Waktu (8 AM, 9 AM...) */}
      <div className="flex flex-col">
        <div className="h-10"></div> {/* Spacer untuk header hari */}
        {timeSlots.map((hour) => (
          <div
            key={hour}
            // Tinggi 1 jam = 2 * tinggi slot 30 menit (h-8 * 2 = h-16)
            className="h-16 flex-shrink-0 text-right pr-2"
            style={{
              // Tempatkan label di tengah-tengah slot 1 jamnya
              // sedikit ke atas
              transform: 'translateY(-0.5rem)',
            }}
          >
            <span className="text-xs text-gray-500">
              {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
            </span>
          </div>
        ))}
      </div>

      {/* Kolom 2: Grid Kalender Utama */}
      <div className="flex-1 grid grid-cols-6 border-l border-gray-200">
        {/* Header Hari (Mon, Tue...) */}
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="h-10 text-center text-sm font-semibold text-gray-600 border-b border-r border-gray-200 py-2"
          >
            {day}
          </div>
        ))}

        {/* Latar Belakang Grid (Garis-garis) */}
        {daysOfWeek.map((day, dayIndex) => (
          <div
            key={dayIndex}
            className="relative grid border-r border-gray-200"
            // Definisikan 20 baris grid (10 jam * 2 slot/jam)
            style={{ gridTemplateRows: `repeat(${totalGridRows}, minmax(0, 1fr))` }}
          >
            {/* Garis-garis horizontal per jam (setiap 2 baris grid) */}
            {Array.from({ length: timeSlots.length }).map((_, i) => (
              <div
                key={i}
                className="col-start-1 col-span-1 border-b border-gray-200"
                // --- PERBAIKAN ---
                // 'gridRowSpan' bukan properti style yang valid di React.
                // Kita gunakan string 'gridRow'
                style={{ gridRow: `${i * 2 + 1} / span 2` }} // Span 2 baris
              ></div>
            ))}

            {/* Render Event untuk hari ini */}
            {events
              .filter((event) => event.dayOfWeek === dayIndex)
              .map((event) => {
                const rowStart = calculateGridRow(event.startHour);
                const rowEnd = calculateGridRow(event.endHour);
                
                return (
                  <div
                    key={event.id}
                    // --- PERBAIKAN (Clean Code) ---
                    // Hapus 'absolute', 'top', 'height'.
                    // Biarkan grid menempatkannya secara otomatis.
                    className={`relative p-2 rounded text-white text-sm font-medium z-10 m-px ${event.color}`}
                    style={{
                      // Tentukan posisi event HANYA menggunakan grid properties
                      gridColumn: '1 / -1', // Gunakan seluruh kolom (hanya ada 1)
                      gridRow: `${rowStart} / ${rowEnd}`, // Tentukan baris awal dan akhir
                    }}
                  >
                    {event.title}
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}

