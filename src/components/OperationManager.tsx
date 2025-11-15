"use client";

import { useState, useMemo, ChangeEvent, useCallback } from "react";
// 1. Impor tipe 'User' dari firebase
import { User } from "firebase/auth";
import {
  Edit,
  Trash2,
  Wallet,
  ArchiveX,
  Search,
  HeartHandshake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
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
import { CurrencyInput } from "@/components/CurencyInput";
import Spinner from "./Spinner";
import { Textarea } from "./ui/textarea";

// Interface (pastikan 'jumlah' bisa string | number untuk form)
interface Operation {
  id: string;
  date: string;
  dokter: string;
  tindakanOperasi: string;
  rumahSakit: string;
  jumlah: number | string;
  klaim: string;
  namaPerawat: string;
}

type EditableOperation = Omit<Operation, "jumlah"> & {
  jumlah: number;
};

// 3. Perbarui ManagerProps untuk MENERIMA 'user'
interface ManagerProps {
  operationsData: Operation[];
  isLoading: boolean;
  onDataChange: () => Promise<void>;
  user: User; // <-- TAMBAHKAN INI
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
  user, // 4. Terima 'user' dari props
}: ManagerProps) {
  // 5. HAPUS baris 'useAuth' ini
  // const { user } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<EditableOperation | null>(null);

  const [filterDate, setFilterDate] = useState("");
  const [filterQuery, setFilterQuery] = useState("");

  const totalOperations = useMemo(() => {
    if (!Array.isArray(operationsData)) return 0;
    return operationsData.reduce((sum, op) => sum + Number(op.jumlah || 0), 0);
  }, [operationsData]);

  const filteredData = useMemo(() => {
    if (!Array.isArray(operationsData)) return [];

    return operationsData
      .filter((op) => {
        const matchDate = filterDate ? op.date === filterDate : true;
        const matchQuery = filterQuery
          ? [op.dokter, op.tindakanOperasi, op.rumahSakit, op.klaim].some(
              (field) =>
                field?.toLowerCase().includes(filterQuery.toLowerCase())
            )
          : true;
        return matchDate && matchQuery;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [operationsData, filterDate, filterQuery]);

  // --- Logika CRUD ---
  // 'user' di sini sekarang merujuk ke prop yang dijamin valid oleh parent

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) return toast.error("Sesi tidak valid."); // Pengaman
      if (!window.confirm("Apakah Anda yakin ingin menghapus data ini?"))
        return;

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/operasi/${id}`, {
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
    },
    [user, onDataChange]
  ); // 'user' sekarang adalah prop dependency

  const handleOpenEditModal = useCallback((item: Operation) => {
    setItemToEdit({
      ...item,
      jumlah: Number(item.jumlah || 0),
    });
    setIsEditModalOpen(true);
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setItemToEdit(null);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!user) return toast.error("Sesi tidak valid.");
    if (!itemToEdit) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/operasi/${itemToEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(itemToEdit),
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
  }, [user, itemToEdit, onDataChange, handleCloseEditModal]);

  // Perbaikan 'stale state' (sudah benar dari sebelumnya)
  const handleEditFormChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setItemToEdit((prev) => {
        if (!prev) return null;
        return { ...prev, [name]: value };
      });
    },
    []
  );

  const handleEditJumlahChange = useCallback((value: number | undefined) => {
    setItemToEdit((prev) => {
      if (!prev) return null;
      return { ...prev, jumlah: value || 0 };
    });
  }, []);

  if (isLoading)
    return (
      <div className="text-center p-8">
        <Spinner />
      </div>
    );

  // ... (Sisa JSX Anda untuk return motion.div, table, modal, dll) ...
  // Tidak ada perubahan di bagian JSX
  return (
    <motion.div
      className="bg-gray-800/60 backdrop-blur-xl border border-white/10 rounded-lg shadow-lg p-6 text-white"
      initial="hidden"
      animate="visible"
    >
      {/* ... (h2, filter, total) ... */}
      <h2 className="text-xl font-semibold mb-4 text-cyan-400">
        Riwayat Data Operasi
      </h2>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="sm:w-1/3"
        />
        <div className="relative sm:flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari dokter, tindakan, rumah sakit, klaim..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-700/50 rounded-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-gray-400" />
          <h3 className="text-md font-semibold text-gray-300">
            Total Biaya Operasi
          </h3>
        </div>
        <p className="text-2xl font-bold text-cyan-400">
          {formatCurrency(totalOperations)}
        </p>
      </div>

      {!Array.isArray(filteredData) || filteredData.length === 0 ? (
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
                <TableHead>klaim</TableHead>
                <TableHead className="text-center">Nama Perawat</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id} className="border-b border-gray-700">
                  <TableCell>{item.date}</TableCell>
                  <TableCell>{item.dokter}</TableCell>
                  <TableCell>{item.tindakanOperasi}</TableCell>
                  <TableCell>{item.rumahSakit}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(Number(item.jumlah))}
                  </TableCell>
                  <TableCell>{item.klaim}</TableCell>
                  <TableCell className="text-center">
                    {(() => {
                      // FIX: buat list selalu array, tidak pernah undefined
                      const list = (item.namaPerawat || "")
                        .split(/[\n,]+/)
                        .map((n) => n.trim())
                        .filter(Boolean);

                      const firstThree = list.slice(0, 3);
                      const moreCount = Math.max(0, list.length - 3);

                      return (
                        <div className="flex flex-col items-center gap-2">
                          {/* BADGE CHIPS */}
                          <div className="flex flex-wrap justify-center gap-1">
                            {firstThree.map((name, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 text-xs rounded-full bg-cyan-600/20 text-cyan-300 border border-cyan-600/40"
                              >
                                {name}
                              </span>
                            ))}

                            {/* …(+N) indicator */}
                            {list.length > 3 && (
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-600/30 text-gray-300 border border-gray-500">
                                +{moreCount}
                              </span>
                            )}
                          </div>

                          {/* ACTION BUTTONS */}
                          <div className="flex items-center gap-2">
                            {/* COPY */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(item.namaPerawat);
                                toast.success("Nama perawat disalin!");
                              }}
                              className="text-xs px-2 py-1 border border-gray-600 hover:bg-gray-700"
                            >
                              Copy
                            </Button>

                            {/* LIHAT SEMUA */}
                            {list.length > 3 && (
                              <LihatSemuaPerawatDialog fullList={list} />
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </TableCell>

                  <TableCell className="text-center">
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
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[625px] bg-gray-800/80 backdrop-blur-md border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">
              Edit Data Operasi
            </DialogTitle>
          </DialogHeader>
          {itemToEdit && (
  <div className="space-y-6 py-4">

    {/* SECTION 1 — DATA DASAR */}
    <div className="space-y-4">
      <h3 className="text-gray-400 text-sm font-semibold">Data Dasar</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Tanggal</Label>
          <Input
            id="date"
            name="date"
            type="date"
            value={itemToEdit.date}
            onChange={handleEditFormChange}
          />
        </div>

        <div>
          <Label htmlFor="dokter">Dokter</Label>
          <Input
            id="dokter"
            name="dokter"
            value={itemToEdit.dokter}
            onChange={handleEditFormChange}
            placeholder="Nama dokter"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="tindakanOperasi">Tindakan Operasi</Label>
        <Input
          id="tindakanOperasi"
          name="tindakanOperasi"
          value={itemToEdit.tindakanOperasi}
          onChange={handleEditFormChange}
          placeholder="Contoh: ORIF Tibia"
        />
      </div>

      <div>
        <Label htmlFor="rumahSakit">Rumah Sakit</Label>
        <Input
          id="rumahSakit"
          name="rumahSakit"
          value={itemToEdit.rumahSakit}
          onChange={handleEditFormChange}
          placeholder="Nama rumah sakit"
        />
      </div>
    </div>

    {/* SECTION 2 — BIAYA */}
    <div className="space-y-4">
      <h3 className="text-gray-400 text-sm font-semibold">
        Informasi Pembiayaan
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="jumlah">Jumlah (Rp)</Label>
          <CurrencyInput
            id="jumlah"
            placeholder="5.000.000"
            value={itemToEdit.jumlah}
            onValueChange={handleEditJumlahChange}
          />
        </div>

        <div>
          <Label htmlFor="klaim">Klaim</Label>
          <Input
            id="klaim"
            name="klaim"
            value={itemToEdit.klaim}
            onChange={handleEditFormChange}
            placeholder="Contoh: BPJS"
          />
        </div>
      </div>
    </div>

    {/* SECTION 3 — TEAM OPERASI */}
    <div className="space-y-3">
      <h3 className="text-gray-400 text-sm font-semibold">Team Operasi</h3>

      <div className="relative w-full">
        <HeartHandshake className="absolute left-3 top-4 h-4 w-4 text-gray-400" />
        <Textarea
          id="namaPerawat"
          name="namaPerawat"
          value={itemToEdit.namaPerawat}
          onChange={handleEditFormChange}
          placeholder="Tuliskan nama perawat, pisahkan per baris..."
          required
          className="pl-10 min-h-[120px] w-full resize-none"
        />
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

function LihatSemuaPerawatDialog({ fullList }: { fullList: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs px-2 py-1 border border-gray-600 hover:bg-gray-700"
      >
        Lihat Semua
      </Button>

      {/* Modal */}
      <DialogContent className="max-w-[400px] bg-gray-800 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">
            Daftar Lengkap Perawat
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto mt-3 pr-1">
          {fullList.map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs rounded-full bg-cyan-600/20 text-cyan-300 border border-cyan-600/40">
                {i + 1}
              </span>
              <p className="text-gray-300 text-sm">{name}</p>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            onClick={() => setOpen(false)}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
