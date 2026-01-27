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
