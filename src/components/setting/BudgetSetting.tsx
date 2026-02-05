"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { Loader2, PiggyBank } from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { BudgetSettings, getUserBudgetSettings, updateUserBudgetSettings } from "@/lib/userSettingService";

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

export default function BudgetSetting() {
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<BudgetSettings>({
    monthlyExpenseBudget: 0,
    enabled: false,
    warnAtPercent: 80,
  });

  const monthlyBudgetNumber = useMemo(() => {
    const n = Number(settings.monthlyExpenseBudget);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  }, [settings.monthlyExpenseBudget]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getUserBudgetSettings(user.uid)
      .then((data) => setSettings(data))
      .finally(() => setIsLoading(false));
  }, [user, loading]);

  const handleSave = async () => {
    if (!user) return toast.error("Anda harus login.");

    const payload: BudgetSettings = {
      enabled: Boolean(settings.enabled),
      monthlyExpenseBudget: monthlyBudgetNumber,
      warnAtPercent: Math.max(0, Math.min(100, Math.floor(Number(settings.warnAtPercent || 0)))),
    };

    if (payload.enabled && payload.monthlyExpenseBudget <= 0) {
      return toast.error("Budget bulanan harus > 0 jika fitur diaktifkan.");
    }

    setIsSaving(true);
    const { error } = await updateUserBudgetSettings(user.uid, payload);
    setIsSaving(false);

    if (error) return toast.error("Gagal menyimpan: " + error);
    toast.success("Budget berhasil disimpan.");
    setSettings(payload);
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
        <CardTitle className="text-white flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-cyan-400" />
          Budget Bulanan
        </CardTitle>
        <CardDescription>
          Atur batas pengeluaran bulanan dan dapatkan peringatan saat mendekati/melewati budget.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-gray-700/50">
          <div>
            <Label className="font-medium text-white">Aktifkan Budget</Label>
            <p className="text-xs text-gray-400">Jika aktif, aplikasi menampilkan peringatan budget.</p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(v) => setSettings((p) => ({ ...p, enabled: v }))}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="monthlyExpenseBudget">Budget Pengeluaran Bulanan (IDR)</Label>
          <Input
            id="monthlyExpenseBudget"
            type="number"
            min={0}
            step={10000}
            value={monthlyBudgetNumber}
            onChange={(e) =>
              setSettings((p) => ({
                ...p,
                monthlyExpenseBudget: Number(e.target.value || 0),
              }))
            }
            disabled={!settings.enabled}
          />
          <p className="text-xs text-gray-400">
            Preview: <span className="text-cyan-300">{formatIDR(monthlyBudgetNumber)}</span>
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="warnAtPercent">Peringatan Saat (%)</Label>
          <Input
            id="warnAtPercent"
            type="number"
            min={0}
            max={100}
            step={5}
            value={Number(settings.warnAtPercent)}
            onChange={(e) =>
              setSettings((p) => ({
                ...p,
                warnAtPercent: Number(e.target.value || 0),
              }))
            }
            disabled={!settings.enabled}
          />
          <p className="text-xs text-gray-400">
            Notifikasi muncul saat pengeluaran mencapai {Math.max(0, Math.min(100, Number(settings.warnAtPercent)))}%
            dari budget.
          </p>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleSave}
          disabled={isSaving || !user}
          className="w-full bg-cyan-600 hover:bg-cyan-700"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSaving ? "Menyimpan..." : "Simpan Budget"}
        </Button>
      </CardFooter>
    </Card>
  );
}

