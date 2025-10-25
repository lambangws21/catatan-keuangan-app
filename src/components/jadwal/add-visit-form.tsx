// components/jadwal/add-visit-form.tsx
"use client";

import { format } from "date-fns"; 
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VisitSchema, VisitFormValues } from "@/lib/schemas";
import { CalendarIcon, Loader2 } from "lucide-react"; 
import { motion } from "framer-motion"; 
import { cn } from "@/lib/utils"; // Disediakan oleh shadcn/ui
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; 
import { VisitStatus } from "@/lib/types";

interface AddVisitFormProps {
  onSuccess: (newVisit: VisitFormValues & { id: string }) => void;
  onClose: () => void;
}

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00"
];

export function AddVisitForm({ onSuccess, onClose }: AddVisitFormProps) {
  const initialDate = format(new Date(), "yyyy-MM-dd");
  const initialTime = "09:00"; 

  const form = useForm<VisitFormValues>({
    resolver: zodResolver(VisitSchema),
    defaultValues: {
      namaDokter: "",
      rumahSakit: "",
      waktuVisit: `${initialDate}T${initialTime}`, 
      status: 'To Do',
    },
  });

  const { isSubmitting } = form.formState;
  const dateValue = form.watch('waktuVisit');
  const [datePart, timePart] = dateValue.split('T');

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const existingTime = timePart || initialTime;
      const newDatePart = format(date, "yyyy-MM-dd");
      form.setValue('waktuVisit', `${newDatePart}T${existingTime}`, { shouldValidate: true });
    }
  };

  const handleTimeChange = (time: string) => {
    const existingDate = datePart || initialDate;
    form.setValue('waktuVisit', `${existingDate}T${time}`, { shouldValidate: true });
  };

  async function onSubmit(data: VisitFormValues) {
    try {
      // SIMULASI API POST ke /api/visit-dokter
      const response = await fetch('/api/visit-dokter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan data visit.");
      }
      
      const newVisit = (await response.json()) as VisitFormValues & { id: string }; 
      onSuccess(newVisit); 
      onClose();

    } catch (error) {
      console.error("Error submitting visit:", error);
    }
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* === Grup Data Dokter (Tetap 100% lebar) === */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="namaDokter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Dokter</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="cth: Dr. Budi Santoso" 
                    {...field} 
                    className="dark:bg-gray-50 dark:text-gray-900 dark:border-gray-300" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rumahSakit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rumah Sakit</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="cth: RS Harapan Sehat" 
                    {...field} 
                    className="dark:bg-gray-50 dark:text-gray-900 dark:border-gray-300" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* === Grup Waktu dan Status === */}
        {/* PERBAIKAN RESPONSIVITAS: grid-cols-1 di mobile, grid-cols-2 di medium ke atas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
          {/* Tanggal Visit (Date Picker) */}
          <FormField
            name="waktuVisit"
            render={() => ( 
              <FormItem className="flex flex-col">
                <FormLabel>Tanggal Visit</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          "dark:bg-gray-50 dark:text-gray-900 dark:border-gray-300 dark:hover:bg-gray-200", 
                          !datePart && "text-muted-foreground dark:text-gray-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {datePart
                          ? format(new Date(datePart), "PPP")
                          : <span>Pilih tanggal</span>}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    {/* PERBAIKAN: Tambahkan kelas responsif pada Calendar Popover */}
                    <Calendar
                      mode="single"
                      selected={datePart ? new Date(datePart) : undefined}
                      onSelect={handleDateChange} 
                      initialFocus
                      className="max-w-[calc(100vw-3rem)]" // Batasi lebar Calendar di mobile
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Waktu Visit (Time Picker - Select) */}
          <FormItem>
              <FormLabel>Waktu</FormLabel>
              <Select 
                onValueChange={handleTimeChange} 
                defaultValue={timePart || initialTime}
              >
                <FormControl>
                  <SelectTrigger className="dark:bg-gray-50 dark:text-gray-900 dark:border-gray-300">
                    <SelectValue placeholder="Pilih jam" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                    {/* PERBAIKAN: Batasi tinggi SelectContent agar fleksibel di mobile */}
                  {timeSlots.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
          </FormItem>
          
          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="md:col-span-2"> 
                {/* PERBAIKAN: Status mengambil 2 kolom di desktop/tablet, 1 kolom di mobile */}
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="dark:bg-gray-50 dark:text-gray-900 dark:border-gray-300">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(['To Do', 'In Progress', 'Done'] as VisitStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tombol Submit dengan Framer Motion */}
        <motion.div
            whileTap={{ scale: 0.98 }}
            className="pt-2"
        >
          <Button 
            type="submit" 
            className="w-full h-12 text-lg" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Menyimpan...
              </>
            ) : "Tambah Jadwal"}
          </Button>
        </motion.div>
      </form>
    </Form>
  );
}