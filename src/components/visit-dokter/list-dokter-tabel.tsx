"use client";

import { useState, ChangeEvent } from 'react'; // Impor hook
import { Trash2, ArchiveX, Loader2, Edit } from 'lucide-react'; // Impor ikon Edit
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Impor komponen Dialog untuk modal edit
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Tipe data dokter
interface Doctor {
  id: string;
  namaDokter: string;
  rumahSakit: string;
}
interface DoctorListProps {
    doctorsData: Doctor[];
    isLoading: boolean;
    onDataChange: () => Promise<void>;
}

export default function DoctorList({ doctorsData, isLoading, onDataChange }: DoctorListProps) {
  
  // State untuk modal edit
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Doctor | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus dokter ini dari daftar?")) return;
    
    try {
      // PERBAIKAN: Path API disesuaikan dengan file di Canvas Anda
      const response = await fetch(`/api/list-dokter/${id}`, { 
          method: "DELETE",
      });
      if (!response.ok) throw new Error("Gagal menghapus dokter.");
      toast.success("Dokter berhasil dihapus.");
      await onDataChange();
    } catch (error) {
        toast.error((error as Error).message);
    }
  };

  // Fungsi untuk membuka modal dan mengisi data
  const handleOpenEditModal = (item: Doctor) => {
    setItemToEdit({ ...item });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setItemToEdit(null);
  };

  // Fungsi untuk menangani perubahan pada form edit
  const handleEditFormChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!itemToEdit) return;
    const { name, value } = e.target;
    setItemToEdit((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  // Fungsi untuk mengirim data update ke API
  const handleUpdate = async () => {
    if (!itemToEdit) return;
    
    try {
      const response = await fetch(`/api/list-dokter/${itemToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          namaDokter: itemToEdit.namaDokter,
          rumahSakit: itemToEdit.rumahSakit,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gagal memperbarui dokter.');
      }

      toast.success('Dokter berhasil diperbarui.');
      await onDataChange();
      handleCloseEditModal();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (isLoading) return (
    <div className="flex justify-center items-center p-16"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>
  );
  
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <motion.div 
        className="bg-gray-800/60 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg p-6 text-white"
        variants={containerVariants} initial="hidden" animate="visible"
    >
      <motion.div variants={itemVariants}>
        {!Array.isArray(doctorsData) || doctorsData.length === 0 ? (
            <div className="text-center text-gray-400 py-16 bg-gray-800/50 rounded-lg">
                <ArchiveX className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                <p className="font-semibold">Belum Ada Dokter</p>
                <p className="text-sm">Daftar dokter yang Anda tambahkan akan muncul di sini.</p>
            </div>
        ) : (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
                <TableHeader><TableRow className="border-gray-700 hover:bg-gray-800 sticky top-0 bg-gray-800 z-10"><TableHead>Nama Dokter</TableHead><TableHead>Rumah Sakit</TableHead><TableHead className="text-center">Aksi</TableHead></TableRow></TableHeader>
                <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                {doctorsData.map((item) => (
                    <motion.tr key={item.id} className="border-b border-gray-700" variants={itemVariants}>
                        <TableCell className="py-3 px-6 font-medium">{item.namaDokter}</TableCell>
                        <TableCell className="py-3 px-6">{item.rumahSakit}</TableCell>
                        <TableCell className="text-center py-3 px-6">
                            <TooltipProvider>
                                <div className="flex justify-center items-center gap-1">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(item)}>
                                                <Edit className="h-4 w-4 text-yellow-500" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Edit Dokter</p></TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TooltipTrigger>
                                        <TooltipContent><p>Hapus Dokter</p></TooltipContent>
                                    </Tooltip>
                                </div>
                            </TooltipProvider>
                        </TableCell>
                    </motion.tr>
                ))}
                </motion.tbody>
            </Table>
            </div>
        )}
      </motion.div>

      {/* Modal Edit */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800/80 backdrop-blur-md border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Edit Dokter</DialogTitle>
          </DialogHeader>
          {itemToEdit && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="namaDokter">Nama Dokter</Label>
                <Input
                  id="namaDokter"
                  name="namaDokter"
                  value={itemToEdit.namaDokter}
                  onChange={handleEditFormChange}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rumahSakit">Rumah Sakit</Label>
                <Input
                  id="rumahSakit"
                  name="rumahSakit"
                  value={itemToEdit.rumahSakit}
                  onChange={handleEditFormChange}
                  className="bg-gray-700 border-gray-600"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditModal}>
              Batal
            </Button>
            <Button onClick={handleUpdate} className="bg-cyan-600 hover:bg-cyan-700">
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

