"use client";

import { useState, useMemo, ChangeEvent } from "react";
import { Edit, Trash2, Wallet, ArchiveX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext"; // Impor useAuth untuk mendapatkan user
import { toast } from "sonner";
import { motion } from "framer-motion";

// Impor komponen UI lain
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CurrencyInput } from "@/components/CurencyInput"; // Pastikan path ke CurrencyInput benar

interface Operation {
  id: string;
  date: string;
  dokter: string;
  tindakanOperasi: string;
  rumahSakit: string;
  jumlah: number | string;
  klaim: string;
}
interface ManagerProps {
  operationsData: Operation[];
  isLoading: boolean;
  onDataChange: () => Promise<void>;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);

export default function OperationManager({
  operationsData,
  isLoading,
  onDataChange,
}: ManagerProps) {
  const { user } = useAuth(); // Dapatkan user dari context
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Operation | null>(null);

  const totalOperations = useMemo(() => {
    if (!Array.isArray(operationsData)) return 0;
    return operationsData.reduce((sum, op) => sum + Number(op.jumlah || 0), 0);
  }, [operationsData]);

  // --- Logika CRUD dengan Autentikasi ---

  const handleDelete = async (id: string) => {
    if (!user) return toast.error("Sesi tidak valid, silakan login kembali.");
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?")) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/operations/${id}`, { // Path API diperbaiki
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menghapus data.");
      }
      toast.success("Data berhasil dihapus.");
      await onDataChange();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleOpenEditModal = (item: Operation) => {
    setItemToEdit({ ...item });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setItemToEdit(null);
  };

  const handleUpdate = async () => {
    if (!user) return toast.error("Sesi tidak valid, silakan login kembali.");
    if (!itemToEdit) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/operations/${itemToEdit.id}`, { // Path API diperbaiki
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...itemToEdit,
          jumlah: Number(itemToEdit.jumlah),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal memperbarui data.");
      }

      handleCloseEditModal();
      toast.success("Data berhasil diperbarui.");
      await onDataChange();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleEditFormChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!itemToEdit) return;
    const { name, value } = e.target;
    setItemToEdit((prev) => (prev ? { ...prev, [name]: value } : null));
  };
  
  // Handler baru untuk CurrencyInput di dalam modal edit
  const handleEditJumlahChange = (value: number | undefined) => {
    if (!itemToEdit) return;
    setItemToEdit((prev) => (prev ? { ...prev, jumlah: value || 0 } : null));
  };


  if (isLoading)
    return <p className="text-center p-8">Memuat data operasi...</p>;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      className="bg-gray-800/60 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg p-6 text-white"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.h2
        className="text-xl font-semibold mb-4 text-cyan-400"
        variants={itemVariants}
      >
        Riwayat Data Operasi
      </motion.h2>

      <motion.div
        className="mb-6 p-4 bg-gray-700/50 rounded-lg flex justify-between items-center"
        variants={itemVariants}
      >
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-gray-400" />
          <h3 className="text-md font-semibold text-gray-300">
            Total Biaya Operasi
          </h3>
        </div>
        <p className="text-2xl font-bold text-cyan-400">
          {formatCurrency(totalOperations)}
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        {!Array.isArray(operationsData) || operationsData.length === 0 ? (
          <div className="text-center text-gray-400 py-16 bg-gray-800/50 rounded-lg">
            <ArchiveX className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="font-semibold">Tidak Ada Data Operasi</p>
            <p className="text-sm">
              Data yang Anda tambahkan akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-gray-800 sticky top-0 bg-gray-800 z-10">
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Dokter</TableHead>
                  <TableHead>Tindakan</TableHead>
                  <TableHead>Rumah Sakit</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <motion.tbody
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {operationsData.map((item) => (
                  <motion.tr
                    key={item.id}
                    className="border-b border-gray-700"
                    variants={itemVariants}
                  >
                    <TableCell className="py-3 px-6">{item.date}</TableCell>
                    <TableCell className="py-3 px-6">{item.dokter}</TableCell>
                    <TableCell className="py-3 px-6">
                      {item.tindakanOperasi}
                    </TableCell>
                    <TableCell className="py-3 px-6">
                      {item.rumahSakit}
                    </TableCell>
                    <TableCell className="text-right py-3 px-6 font-mono">
                      {formatCurrency(Number(item.jumlah))}
                    </TableCell>
                    <TableCell className="text-center py-3 px-6">
                      <TooltipProvider>
                        <div className="flex justify-center items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEditModal(item)}
                              >
                                <Edit className="h-4 w-4 text-yellow-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit Data</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Hapus Data</p>
                            </TooltipContent>
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
        <DialogContent className="sm:max-w-[625px] bg-gray-800/80 backdrop-blur-md border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">
              Edit Data Operasi
            </DialogTitle>
          </DialogHeader>
          {itemToEdit && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Tanggal</Label>
                  <Input id="date" name="date" type="date" value={itemToEdit.date} onChange={handleEditFormChange} />
                </div>
                <div>
                  <Label htmlFor="dokter">Dokter</Label>
                  <Input id="dokter" name="dokter" value={itemToEdit.dokter} onChange={handleEditFormChange} />
                </div>
              </div>
              <div>
                <Label htmlFor="tindakanOperasi">Tindakan Operasi</Label>
                <Input id="tindakanOperasi" name="tindakanOperasi" value={itemToEdit.tindakanOperasi} onChange={handleEditFormChange} />
              </div>
              <div>
                <Label htmlFor="rumahSakit">Rumah Sakit</Label>
                <Input id="rumahSakit" name="rumahSakit" value={itemToEdit.rumahSakit} onChange={handleEditFormChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jumlah">Jumlah (Rp)</Label>
                   <CurrencyInput 
                        id="jumlah" 
                        placeholder="5.000.000" 
                        value={itemToEdit.jumlah || ''}
                        onValueChange={handleEditJumlahChange}
                    />
                </div>
                <div>
                  <Label htmlFor="klaim">Klaim</Label>
                  <Input id="klaim" name="klaim" value={itemToEdit.klaim} onChange={handleEditFormChange} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditModal}>
              Batal
            </Button>
            <Button
              onClick={handleUpdate}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

