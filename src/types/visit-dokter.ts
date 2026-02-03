export interface Schedule {
  id: string;
  namaDokter?: string;
  rumahSakit?: string;
  waktuVisit: string;
  note?: string;
  status?: string;
  dokter?: string;
  pasien?: string;
  repeat?: "once" | "monthly";
  perawat?: string;
  /** id schedule asli saat item ini adalah hasil generate repeat */
  sourceId?: string;
  /** true jika ini hasil generate repeat (virtual occurrence) */
  isVirtual?: boolean;
}

export interface TimelineItem {
  id: string;
  title: string;
  subtitle?: string;
  time: string;
  date: string;
  icon?: string;
  members?: string[]; // avatar atau emoji
  highlight?: boolean; // card biru seperti "Meeting"
}
