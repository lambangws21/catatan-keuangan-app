"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { updateUserPassword, deleteUserAccount } from "@/lib/AuthServices";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default function ProfileSettings() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Password baru dan konfirmasi tidak cocok.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password minimal harus 6 karakter.");
      return;
    }

    setIsLoading(true);
    const { error } = await updateUserPassword(newPassword);

    if (error) {
      toast.error(error);
    } else {
      toast.success("Password berhasil diperbarui.");
      setNewPassword("");
      setConfirmPassword("");
    }
    setIsLoading(false);
  };

  const handleDeleteAccount = async () => {
    const { error } = await deleteUserAccount();
    if (error) {
      toast.error(error);
    } else {
      toast.success("Akun Anda telah dihapus.");
    }
  };

  const cardStyle =
    "bg-gray-800/60 backdrop-blur-xl border border-white/10 shadow-lg";

  return (
    <Card className={cardStyle}>
      <CardHeader>
        <CardTitle className="text-white">Informasi Profil</CardTitle>
        <CardDescription>
          Lihat informasi akun Anda dan kelola keamanan.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            value={user?.email || ""}
            readOnly
            disabled
            className="bg-gray-700/80"
          />
        </div>
        <form
          onSubmit={handleChangePassword}
          className="space-y-4 pt-4 border-t border-white/10"
        >
          <h3 className="font-semibold text-white">Ubah Password</h3>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Password Baru</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Perbarui Password
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4 pt-6 border-t border-white/10">
        <h3 className="font-semibold text-red-400">Zona Berbahaya</h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-500">Hapus Akun</Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Apakah Anda benar-benar yakin?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                Tindakan ini tidak dapat dibatalkan. Ini akan menghapus akun Anda
                secara permanen dan semua data yang terkait.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700"
              >
                Lanjutkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <p className="text-xs text-gray-500">
          Menghapus akun Anda bersifat permanen. Harap berhati-hati.
        </p>
      </CardFooter>
    </Card>
  );
}
