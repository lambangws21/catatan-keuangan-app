"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotificationSettings() {
  const cardStyle =
    "bg-gray-800/60 backdrop-blur-xl border border-white/10 shadow-lg";

  const [weeklyReport, setWeeklyReport] = useState(true);
  const [lowBalanceAlert, setLowBalanceAlert] = useState(true);
  const [largeTransactionAlert, setLargeTransactionAlert] = useState(false);

  return (
    <Card className={cardStyle}>
      <CardHeader>
        <CardTitle className="text-white">Pengaturan Notifikasi</CardTitle>
        <CardDescription>
          Pilih notifikasi mana yang ingin Anda terima melalui email atau
          aplikasi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50">
          <div>
            <Label htmlFor="weekly-report" className="font-medium text-white">
              Laporan Mingguan
            </Label>
            <p className="text-xs text-gray-400">
              Dapatkan ringkasan pengeluaran Anda setiap minggu.
            </p>
          </div>
          <Switch
            id="weekly-report"
            checked={weeklyReport}
            onCheckedChange={setWeeklyReport}
          />
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50">
          <div>
            <Label htmlFor="low-balance" className="font-medium text-white">
              Peringatan Saldo Rendah
            </Label>
            <p className="text-xs text-gray-400">
              Dapat notifikasi jika saldo Anda di bawah batas.
            </p>
          </div>
          <Switch
            id="low-balance"
            checked={lowBalanceAlert}
            onCheckedChange={setLowBalanceAlert}
          />
        </div>
        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50">
          <div>
            <Label htmlFor="large-transaction" className="font-medium text-white">
              Notifikasi Transaksi Besar
            </Label>
            <p className="text-xs text-gray-400">
              Dapat notifikasi untuk transaksi di atas jumlah tertentu.
            </p>
          </div>
          <Switch
            id="large-transaction"
            checked={largeTransactionAlert}
            onCheckedChange={setLargeTransactionAlert}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full bg-cyan-600 hover:bg-cyan-700">
          Simpan Preferensi
        </Button>
      </CardFooter>
    </Card>
  );
}
