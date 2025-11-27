// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { Loader2, ClipboardList } from "lucide-react";
// import Link from "next/link";
// import { Button } from "@/components/ui/button";
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { toast } from "sonner";

// import ScheduleForm from "@/components/visit-dokter/form-input";
// import DailyTimelineView from "@/components/visit-dokter/daily-timeline-view";
// import ScheduleSidebar from "@/components/visit-dokter/schedule-sidebar";
// import MobileTimeline from "@/components/timeline/mobile-view";

// import type { Schedule } from "@/types/visit-dokter";

// export interface Doctor {
//   id: string;
//   namaDokter: string;
//   rumahSakit: string;
// }

// export default function SchedulesPage() {
//   const [schedules, setSchedules] = useState<Schedule[]>([]);
//   const [doctors, setDoctors] = useState<Doctor[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
//   const [isMobile, setIsMobile] = useState(false);

//   useEffect(() => {
//     setIsMobile(window.innerWidth < 768);
//   }, []);

//   // ========================
//   // ✅ GENERATE REPEAT EVENT
//   // ========================
//   const generateRecurringEvents = (events: Schedule[]): Schedule[] => {
//     const result: Schedule[] = [];

//     events.forEach(event => {
//       result.push(event);

//       if (event.repeat === "monthly") {
//         for (let i = 1; i <= 6; i++) {
//           const date = new Date(event.waktuVisit);
//           date.setMonth(date.getMonth() + i);

//           result.push({
//             ...event,
//             id: `${event.id}-r${i}`,
//             waktuVisit: date.toISOString(),
//           });
//         }
//       }
//     });

//     return result;
//   };

//   // ========================
//   // ✅ FETCH DATA
//   // ========================
//   const fetchData = useCallback(async () => {
//     setIsLoading(true);
//     try {
//       const [scheduleRes, doctorRes] = await Promise.all([
//         fetch("/api/visit-dokter"),
//         fetch("/api/list-dokter"),
//       ]);

//       const scheduleData = await scheduleRes.json();
//       const doctorData = await doctorRes.json();

//       const expandedSchedules = generateRecurringEvents(
//         Array.isArray(scheduleData) ? scheduleData : []
//       );

//       setSchedules(expandedSchedules);
//       setDoctors(Array.isArray(doctorData) ? doctorData : []);
//     } catch (error) {
//       console.error(error);
//       toast.error("Gagal memuat data");
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchData();
//   }, [fetchData]);

//   // ========================
//   // DELETE
//   // ========================
//   const handleDeleteSchedule = async (id: string) => {
//     try {
//       const res = await fetch(`/api/visit-dokter/${id}`, { method: "DELETE" });
//       if (!res.ok) throw new Error();
//       toast.success("Jadwal dihapus");
//       fetchData();
//     } catch {
//       toast.error("Gagal menghapus jadwal");
//     }
//   };

//   // ========================
//   // EDIT
//   // ========================
//   const handleEdit = (schedule: Schedule) => setEditingSchedule(schedule);
//   const closeEdit = () => setEditingSchedule(null);

//   const handleFormSubmit = async () => {
//     closeEdit();
//     await fetchData();
//   };

//   // ========================
//   // MOBILE MODE
//   // ========================
//   if (isMobile) {
//     return (
//       <MobileTimeline
//       />
//     );
//   }

//   // ========================
//   // DESKTOP MODE
//   // ========================
//   return (
//     <div className="space-y-6 p-6 min-h-screen">

//       <header className="flex justify-between items-center border-b pb-4">
//         <div>
//           <h1 className="text-3xl font-bold">Manajemen Jadwal Visit</h1>
//           <p className="text-muted-foreground text-sm">
//             Pengaturan jadwal visit dokter terintegrasi
//           </p>
//         </div>

//         <div className="flex gap-3">
//           <ScheduleForm onFormSubmit={handleFormSubmit} doctorsList={doctors} />
//           <Button asChild variant="outline">
//             <Link href="/list-dokter">
//               <ClipboardList className="mr-2 w-4 h-4" />
//               List Dokter
//             </Link>
//           </Button>
//         </div>
//       </header>

//       {isLoading ? (
//         <div className="flex justify-center py-20">
//           <Loader2 className="animate-spin mr-2" />
//           Memuat Jadwal...
//         </div>
//       ) : (
//         <div className="flex flex-col lg:flex-row gap-6">
//           <div className="flex-1">
//             <DailyTimelineView
//               schedulesData={schedules}
//               onDataChange={fetchData}
//               onEditSchedule={handleEdit}
//             />
//           </div>

//           <div className="lg:w-1/3">
//             <ScheduleSidebar
//               schedules={schedules}
//               onEdit={handleEdit}
//               onDelete={handleDeleteSchedule}
//             />
//           </div>
//         </div>
//       )}

//       {/* MODAL EDIT */}
//       <Dialog open={!!editingSchedule} onOpenChange={(open) => !open && closeEdit()}>
//         <DialogContent className="sm:max-w-[480px]">
//           <DialogHeader>
//             <DialogTitle>Edit Jadwal Visit</DialogTitle>
//           </DialogHeader>

//           {editingSchedule && (
//             <ScheduleForm
//               initialData={{
//                 id: editingSchedule.id ?? "",
//                 namaDokter: editingSchedule.namaDokter ?? "",
//                 rumahSakit: editingSchedule.rumahSakit ?? "",
//                 note: editingSchedule.note ?? "",
//                 status: editingSchedule.status ?? "Terjadwal",
//                 waktuVisit: editingSchedule.waktuVisit,
//                 repeat: editingSchedule.repeat ?? "once",
//               }}
//               doctorsList={doctors}
//               onFormSubmit={handleFormSubmit}
//             />
//           )}
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }

import OperationAnalyticsDashboard from "@/components/operasi/oracle-operasi";

export default function OperasiPage() {
  return <OperationAnalyticsDashboard />;
}
