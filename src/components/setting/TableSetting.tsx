"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, CloudUpload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTableUiConfig } from "@/hooks/use-table-ui-config";
import { TableUiConfig } from "@/lib/ui-config";

const parseIntSafe = (value: string, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
};

const parseCsvNumbers = (value: string, fallback: number[]) => {
  const parsed = value
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.floor(n));
  return parsed.length ? parsed : fallback;
};

export default function TableSetting() {
  const {
    config,
    remoteConfig,
    localOverride,
    isLoading,
    saveRemote,
    setLocalOverride,
    resetLocalOverride,
  } = useTableUiConfig();

  const [token, setToken] = useState("");
  const [savingRemote, setSavingRemote] = useState(false);

  const [saldoScrollThreshold, setSaldoScrollThreshold] = useState("");
  const [saldoDesktopMaxHeightPx, setSaldoDesktopMaxHeightPx] = useState("");
  const [saldoMobileMaxHeightPx, setSaldoMobileMaxHeightPx] = useState("");
  const [transactionDesktopMaxHeightPx, setTransactionDesktopMaxHeightPx] = useState("");
  const [transactionMobileMaxHeightPx, setTransactionMobileMaxHeightPx] = useState("");
  const [transactionRowsPerPageDefault, setTransactionRowsPerPageDefault] = useState("");
  const [transactionRowsPerPageOptions, setTransactionRowsPerPageOptions] = useState("");

  useEffect(() => {
    setSaldoScrollThreshold(String(config.saldoScrollThreshold));
    setSaldoDesktopMaxHeightPx(String(config.saldoDesktopMaxHeightPx));
    setSaldoMobileMaxHeightPx(String(config.saldoMobileMaxHeightPx));
    setTransactionDesktopMaxHeightPx(String(config.transactionDesktopMaxHeightPx));
    setTransactionMobileMaxHeightPx(String(config.transactionMobileMaxHeightPx));
    setTransactionRowsPerPageDefault(String(config.transactionRowsPerPageDefault));
    setTransactionRowsPerPageOptions(config.transactionRowsPerPageOptions.join(", "));
  }, [
    config.saldoScrollThreshold,
    config.saldoDesktopMaxHeightPx,
    config.saldoMobileMaxHeightPx,
    config.transactionDesktopMaxHeightPx,
    config.transactionMobileMaxHeightPx,
    config.transactionRowsPerPageDefault,
    config.transactionRowsPerPageOptions,
  ]);

  const draft = useMemo<Partial<TableUiConfig>>(
    () => ({
      saldoScrollThreshold: parseIntSafe(saldoScrollThreshold, config.saldoScrollThreshold),
      saldoDesktopMaxHeightPx: parseIntSafe(
        saldoDesktopMaxHeightPx,
        config.saldoDesktopMaxHeightPx
      ),
      saldoMobileMaxHeightPx: parseIntSafe(
        saldoMobileMaxHeightPx,
        config.saldoMobileMaxHeightPx
      ),
      transactionDesktopMaxHeightPx: parseIntSafe(
        transactionDesktopMaxHeightPx,
        config.transactionDesktopMaxHeightPx
      ),
      transactionMobileMaxHeightPx: parseIntSafe(
        transactionMobileMaxHeightPx,
        config.transactionMobileMaxHeightPx
      ),
      transactionRowsPerPageDefault: parseIntSafe(
        transactionRowsPerPageDefault,
        config.transactionRowsPerPageDefault
      ),
      transactionRowsPerPageOptions: parseCsvNumbers(
        transactionRowsPerPageOptions,
        config.transactionRowsPerPageOptions
      ),
    }),
    [
      saldoScrollThreshold,
      saldoDesktopMaxHeightPx,
      saldoMobileMaxHeightPx,
      transactionDesktopMaxHeightPx,
      transactionMobileMaxHeightPx,
      transactionRowsPerPageDefault,
      transactionRowsPerPageOptions,
      config,
    ]
  );

  const cardStyle =
    "bg-gray-800/60 backdrop-blur-xl border border-white/10 shadow-lg";

  const hasLocal = Boolean(localOverride && Object.keys(localOverride).length);

  const handleSaveLocal = () => {
    setLocalOverride(draft);
    toast.success("Pengaturan tabel tersimpan (lokal).");
  };

  const handleResetLocal = () => {
    resetLocalOverride();
    toast.success("Pengaturan lokal direset.");
  };

  const handleSaveRemote = async () => {
    if (!token) {
      toast.error("Isi token admin (UI_CONFIG_ADMIN_TOKEN) untuk simpan global.");
      return;
    }
    setSavingRemote(true);
    try {
      await saveRemote(token, draft);
      toast.success("Pengaturan tabel tersimpan (global).");
    } catch (e) {
      toast.error((e as Error).message || "Gagal menyimpan global.");
    } finally {
      setSavingRemote(false);
    }
  };

  return (
    <Card className={cardStyle}>
      <CardHeader>
        <CardTitle className="text-white">Pengaturan Tabel</CardTitle>
        <CardDescription>
          Atur tinggi tabel, batas scroll, dan default pagination. Bisa disimpan lokal atau global.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Memuat konfigurasi…
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Saldo: batas scroll (entri)</Label>
            <Input
              value={saldoScrollThreshold}
              onChange={(e) => setSaldoScrollThreshold(e.target.value)}
              placeholder={String(remoteConfig.saldoScrollThreshold)}
            />
          </div>

          <div className="space-y-2">
            <Label>Saldo: max height desktop (px)</Label>
            <Input
              value={saldoDesktopMaxHeightPx}
              onChange={(e) => setSaldoDesktopMaxHeightPx(e.target.value)}
              placeholder={String(remoteConfig.saldoDesktopMaxHeightPx)}
            />
          </div>

          <div className="space-y-2">
            <Label>Saldo: max height mobile (px)</Label>
            <Input
              value={saldoMobileMaxHeightPx}
              onChange={(e) => setSaldoMobileMaxHeightPx(e.target.value)}
              placeholder={String(remoteConfig.saldoMobileMaxHeightPx)}
            />
          </div>

          <div className="space-y-2">
            <Label>Transaksi: max height desktop (px)</Label>
            <Input
              value={transactionDesktopMaxHeightPx}
              onChange={(e) => setTransactionDesktopMaxHeightPx(e.target.value)}
              placeholder={String(remoteConfig.transactionDesktopMaxHeightPx)}
            />
          </div>

          <div className="space-y-2">
            <Label>Transaksi: max height mobile (px)</Label>
            <Input
              value={transactionMobileMaxHeightPx}
              onChange={(e) => setTransactionMobileMaxHeightPx(e.target.value)}
              placeholder={String(remoteConfig.transactionMobileMaxHeightPx)}
            />
          </div>

          <div className="space-y-2">
            <Label>Transaksi: default rows/page</Label>
            <Input
              value={transactionRowsPerPageDefault}
              onChange={(e) => setTransactionRowsPerPageDefault(e.target.value)}
              placeholder={String(remoteConfig.transactionRowsPerPageDefault)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Transaksi: opsi rows/page (CSV)</Label>
            <Input
              value={transactionRowsPerPageOptions}
              onChange={(e) => setTransactionRowsPerPageOptions(e.target.value)}
              placeholder={remoteConfig.transactionRowsPerPageOptions.join(", ")}
            />
            <p className="text-xs text-gray-400">
              Contoh: <span className="font-mono">10, 15, 20</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSaveLocal} className="bg-cyan-600 hover:bg-cyan-700">
              <Save className="mr-2 h-4 w-4" /> Simpan Lokal
            </Button>
            <Button
              variant="outline"
              onClick={handleResetLocal}
              disabled={!hasLocal}
              className="border-white/20 text-white/80 hover:border-white/40"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Lokal
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Token admin (global)"
              className="w-[220px] bg-gray-900/40"
            />
            <Button
              onClick={handleSaveRemote}
              disabled={savingRemote}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {savingRemote ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="mr-2 h-4 w-4" />
              )}
              Simpan Global
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-gray-900/40 p-4 text-xs text-gray-300">
          <p className="font-semibold text-white">Info</p>
          <p className="mt-1">
            Lokal akan tersimpan di browser (per device). Global akan disimpan ke Firestore (
            <span className="font-mono">uiConfig/table</span>) dan berlaku untuk semua user.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

