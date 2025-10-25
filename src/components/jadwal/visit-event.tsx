// components/jadwal/visit-event.tsx
import { VisitDokter, VisitStatus } from '@/lib/types';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils'; 

interface VisitEventProps {
  visit: VisitDokter;
}

const getStatusColors = (status: VisitStatus) => {
  switch (status) {
    case 'In Progress':
      // Biru (Team meeting style)
      return 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'; 
    case 'Done':
      // Hijau (Workout style)
      return 'bg-green-500 hover:bg-green-600 text-white shadow-md'; 
    case 'To Do':
    default:
      // Merah (Project deadline style)
      return 'bg-red-500 hover:bg-red-600 text-white shadow-md';
  }
};

export function VisitEvent({ visit }: VisitEventProps) {
  return (
    <motion.div
      layout 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "h-full w-full rounded-lg p-2 cursor-pointer transition-colors duration-200",
        getStatusColors(visit.status)
      )}
    >
      <div className="font-bold text-sm truncate">{visit.namaDokter}</div>
      <div className="text-xs truncate opacity-90">{visit.rumahSakit}</div>
    </motion.div>
  );
}