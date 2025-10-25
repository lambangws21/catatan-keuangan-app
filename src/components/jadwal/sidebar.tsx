// components/sidebar.tsx

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VisitDokter, VisitStatus } from "@/lib/types"; // Pastikan VisitStatus diimpor
import { format } from "date-fns";
import { Sparkles } from "lucide-react"; // Ikon seperti di gambar
import { cn } from "@/lib/utils";

interface SidebarProps {
  // Prop diubah menjadi lebih sederhana
  selectedVisit: VisitDokter | null;
}

// Fungsi helper untuk menentukan warna kartu berdasarkan status
// Disesuaikan agar mirip dengan gambar Anda
const getStatusCardStyle = (status: VisitStatus) => {
  switch (status) {
    case 'In Progress': // Biru (seperti "Meeting")
      return 'bg-primary text-primary-foreground shadow-lg';
    case 'Done': // Hijau (seperti "Workout")
      return 'bg-green-600 text-white shadow-lg';
    case 'To Do': // Merah (seperti "Deadline")
    default:
      return 'bg-red-500 text-white shadow-lg';
  }
};

export function Sidebar({ selectedVisit }: SidebarProps) {
  
  // Tentukan konten berdasarkan apakah ada visit yang dipilih
  const visit = selectedVisit;
  const cardTitle = visit ? visit.namaDokter : "Pilih Jadwal";
  const cardDescription = visit ? visit.rumahSakit : "Klik jadwal visit dari kalender untuk melihat detail.";
  const cardTime = visit ? format(new Date(visit.waktuVisit), 'p') : "--:--"; // 'p' = 9:00 AM

  // Tentukan style
  const cardStyle = visit 
    ? getStatusCardStyle(visit.status) 
    : "bg-card text-card-foreground border"; // Style default shadcn
    
  const textStyle = visit ? "" : "text-muted-foreground";

  return (
    <Card className={cn("sticky top-4 transition-all duration-300", cardStyle)}>
      <CardContent className={cn("p-6", textStyle)}>
        <div className="flex justify-between items-start mb-4">
          <div className="max-w-[75%]">
            <CardTitle className={cn("text-xl font-bold", textStyle)}>
              {cardTitle}
            </CardTitle>
            <p className={cn("opacity-90 mt-1", textStyle, !visit && "text-sm")}>
              {cardDescription}
            </p>
          </div>
          <span className={cn("font-semibold text-lg", textStyle)}>
            {cardTime}
          </span>
        </div>
        
        {/* Tampilkan avatar dan icon hanya jika ada visit yang dipilih */}
        {visit && (
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/20">
            {/* Avatars (placeholder) */}
            <div className="flex -space-x-2">
              <Avatar className="border-2 border-primary-foreground">
                <AvatarImage src="https://i.pravatar.cc/150?img=1" alt="User 1" />
                <AvatarFallback>R1</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-primary-foreground">
                <AvatarImage src="https://i.pravatar.cc/150?img=2" alt="User 2" />
                <AvatarFallback>R2</AvatarFallback>
              </Avatar>
              <Avatar className="border-2 border-primary-foreground">
                <AvatarFallback>+2</AvatarFallback>
              </Avatar>
            </div>
            
            {/* Ikon "Sparkle" (placeholder) */}
            <div className="p-3 bg-white/20 rounded-lg cursor-pointer">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}