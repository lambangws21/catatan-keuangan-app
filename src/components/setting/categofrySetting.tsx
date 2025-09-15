"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2, PlusCircle, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getUserCategories, addCategory, updateCategory, deleteCategory } from "@/lib/userSettingService";

// Tipe untuk objek kategori
interface Category {
  id: string;
  name: string;
}

export default function CategorySettings() {
    const { user } = useAuth();
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // State untuk modal tambah/edit
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({});
    
    // PERBAIKAN: Bungkus fetchCategories dengan useCallback
    const fetchCategories = useCallback(async () => {
        if (user) {
            setIsLoading(true);
            const userCategories = await getUserCategories(user.uid);
            setCategories(userCategories);
            setIsLoading(false);
        }
    }, [user]);

    // PERBAIKAN: Gunakan fetchCategories yang sudah di-memoize
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleOpenModal = (category?: Category) => {
        setCurrentCategory(category || { name: '' });
        setIsModalOpen(true);
    };

    const handleSaveCategory = async () => {
        if (!user) return toast.error("Anda harus login.");
        if (!currentCategory.name?.trim()) return toast.error("Nama kategori tidak boleh kosong.");

        setIsSaving(true);
        let error: string | null = null;

        if (currentCategory.id) {
            // Update kategori yang ada
            ({ error } = await updateCategory(user.uid, currentCategory.id, currentCategory.name));
        } else {
            // Tambah kategori baru
            ({ error } = await addCategory(user.uid, currentCategory.name));
        }

        if (error) {
            toast.error(`Gagal menyimpan: ${error}`);
        } else {
            toast.success(`Kategori "${currentCategory.name}" berhasil disimpan.`);
            setIsModalOpen(false);
            await fetchCategories(); // Refresh daftar kategori
        }
        setIsSaving(false);
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (!user) return toast.error("Anda harus login.");
        
        const { error } = await deleteCategory(user.uid, categoryId);
        if (error) {
            toast.error(`Gagal menghapus: ${error}`);
        } else {
            toast.success("Kategori berhasil dihapus.");
            await fetchCategories(); // Refresh daftar kategori
        }
    };
    
    const cardStyle = "bg-gray-800/60 backdrop-blur-xl border border-white/10 shadow-lg";

    if (isLoading) {
        return (
            <Card className={cardStyle}>
                <CardContent className="flex justify-center items-center p-16">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cardStyle}>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-white">Manajemen Kategori</CardTitle>
                    <CardDescription>Tambah, edit, atau hapus kategori pengeluaran Anda.</CardDescription>
                </div>
                <Button onClick={() => handleOpenModal()} size="sm" className="bg-cyan-600 hover:bg-cyan-700">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Tambah Kategori
                </Button>
            </CardHeader>
            <CardContent>
                {categories.length > 0 ? (
                    <div className="space-y-3">
                        {categories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                                <p className="font-medium">{cat.name}</p>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(cat)}>
                                        <Edit className="h-4 w-4 text-yellow-400" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
                                                <AlertDialogDescription className="text-gray-400">
                                                    Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus kategori &quot;{cat.name}&quot;?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)} className="bg-red-600 hover:bg-red-700">Hapus</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-400 py-8">Anda belum memiliki kategori kustom.</p>
                )}
            </CardContent>

            {/* Modal untuk Tambah/Edit Kategori */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-cyan-400">{currentCategory.id ? 'Edit' : 'Tambah'} Kategori</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category-name">Nama Kategori</Label>
                            <Input 
                                id="category-name" 
                                value={currentCategory.name || ''}
                                onChange={(e) => setCurrentCategory(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Contoh: Belanja Bulanan"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSaveCategory} disabled={isSaving} className="bg-cyan-600 hover:bg-cyan-700">
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

