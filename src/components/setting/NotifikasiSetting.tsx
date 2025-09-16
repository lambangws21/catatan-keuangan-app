"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getUserNotificationSettings, updateUserNotificationSettings } from "@/lib/userSettingService";

// Tipe untuk state pengaturan
interface NotificationPreferences {
  weeklyReport: boolean;
  lowBalanceAlert: boolean;
  largeTransactionAlert: boolean;
}

export default function NotificationSettings() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<NotificationPreferences>({
        weeklyReport: true,
        lowBalanceAlert: true,
        largeTransactionAlert: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Ambil pengaturan saat komponen dimuat
    useEffect(() => {
        if (user) {
            getUserNotificationSettings(user.uid).then(data => {
                if (data) {
                    setSettings(data);
                }
                setIsLoading(false);
            });
        } else {
            setIsLoading(false); // Berhenti loading jika tidak ada user
        }
    }, [user]);

    const handleSettingChange = (key: keyof NotificationPreferences, value: boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSaveChanges = async () => {
        if (!user) {
            toast.error("Anda harus login untuk menyimpan pengaturan.");
            return;
        }
        setIsSaving(true);
        const { error } = await updateUserNotificationSettings(user.uid, settings);
        if (error) {
            toast.error("Gagal menyimpan preferensi: " + error);
        } else {
            toast.success("Preferensi notifikasi berhasil disimpan.");
        }
        setIsSaving(false);
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
            <CardHeader>
                <CardTitle className="text-white">Pengaturan Notifikasi</CardTitle>
                <CardDescription>Pilih notifikasi mana yang ingin Anda terima.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50">
                    <div>
                        <Label htmlFor="weekly-report" className="font-medium text-white">Laporan Mingguan</Label>
                        <p className="text-xs text-gray-400">Dapatkan ringkasan pengeluaran Anda setiap minggu.</p>
                    </div>
                    <Switch id="weekly-report" checked={settings.weeklyReport} onCheckedChange={(value) => handleSettingChange('weeklyReport', value)} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50">
                    <div>
                        <Label htmlFor="low-balance" className="font-medium text-white">Peringatan Saldo Rendah</Label>
                        <p className="text-xs text-gray-400">Dapat notifikasi jika saldo Anda di bawah batas.</p>
                    </div>
                    <Switch id="low-balance" checked={settings.lowBalanceAlert} onCheckedChange={(value) => handleSettingChange('lowBalanceAlert', value)} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50">
                    <div>
                        <Label htmlFor="large-transaction" className="font-medium text-white">Notifikasi Transaksi Besar</Label>
                        <p className="text-xs text-gray-400">Dapat notifikasi untuk transaksi di atas jumlah tertentu.</p>
                    </div>
                    <Switch id="large-transaction" checked={settings.largeTransactionAlert} onCheckedChange={(value) => handleSettingChange('largeTransactionAlert', value)} />
                </div>
            </CardContent>
             <CardFooter>
                <Button onClick={handleSaveChanges} disabled={isSaving} className="w-full bg-cyan-600 hover:bg-cyan-700">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? 'Menyimpan...' : 'Simpan Preferensi'}
                </Button>
            </CardFooter>
        </Card>
    );
}

