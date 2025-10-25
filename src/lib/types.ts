// lib/types.ts
export type VisitStatus = 'To Do' | 'In Progress' | 'Done';

export interface VisitDokter {
  id: string; 
  namaDokter: string;
  rumahSakit: string;
  status: VisitStatus;
  waktuVisit: string; // ISO string, cth: "2025-10-27T09:00:00.000Z"
  durasiMenit?: number; // Default 60 menit
}