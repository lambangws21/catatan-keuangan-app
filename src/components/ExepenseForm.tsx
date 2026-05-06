"use client";

import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { storage } from "@/lib/firebase/client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Camera, Loader2, ScanText, Trash2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput } from "@/components/CurencyInput";

interface ExpenseFormProps {
  onTransactionAdded: () => Promise<void>;
}

type KlaimStatus = "Belum diajukan" | "Diajukan" | "Dibayar";

type SelectedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

const klaimStatusOptions: KlaimStatus[] = [
  "Belum diajukan",
  "Diajukan",
  "Dibayar",
];

const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
};

const toIsoDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeRecognizedDate = (dayRaw: string, monthRaw: string, yearRaw: string) => {
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  let year = Number(yearRaw);

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }

  if (year < 100) {
    year += year < 70 ? 2000 : 1900;
  }

  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2000 || year > 2100) {
    return null;
  }

  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }

  return toIsoDateInput(candidate);
};

const extractDateFromOcrText = (rawText: string) => {
  const normalized = rawText.replace(/[|]/g, "/");

  const slashDate = normalized.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (slashDate) {
    const value = normalizeRecognizedDate(slashDate[1], slashDate[2], slashDate[3]);
    if (value) return value;
  }

  const monthMap: Record<string, string> = {
    jan: "01",
    januari: "01",
    feb: "02",
    februari: "02",
    mar: "03",
    maret: "03",
    apr: "04",
    april: "04",
    mei: "05",
    may: "05",
    jun: "06",
    juni: "06",
    jul: "07",
    juli: "07",
    agu: "08",
    agt: "08",
    agustus: "08",
    aug: "08",
    sep: "09",
    september: "09",
    okt: "10",
    october: "10",
    oktober: "10",
    nov: "11",
    november: "11",
    dec: "12",
    des: "12",
    desember: "12",
    december: "12",
  };

  const monthText = normalized
    .toLowerCase()
    .match(/(\d{1,2})\s+([a-z]{3,10})\s+(\d{2,4})/);
  if (!monthText) return null;

  const month = monthMap[monthText[2]];
  if (!month) return null;

  return normalizeRecognizedDate(monthText[1], month, monthText[3]);
};

const extractAmountFromOcrText = (rawText: string) => {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const extractCandidates = (source: string) => {
    const matches = source.match(/\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d{5,}/g) || [];
    return matches
      .map((token) => {
        const normalized = token.replace(/[^\d]/g, "");
        const value = Number(normalized);
        return Number.isFinite(value) ? value : 0;
      })
      .filter((value) => value >= 1000 && value <= 500000000);
  };

  for (const line of lines) {
    if (!/(total|jumlah|grand|subtotal|tagihan|tunai|bayar)/i.test(line)) {
      continue;
    }
    const candidates = extractCandidates(line);
    if (candidates.length > 0) {
      return Math.max(...candidates);
    }
  }

  const allCandidates = extractCandidates(lines.join(" "));
  if (allCandidates.length === 0) return undefined;
  return Math.max(...allCandidates);
};

const extractDescriptionFromOcrText = (rawText: string) => {
  const blacklist = /(rp|idr|total|jumlah|subtotal|grand|tunai|cash|change|kembalian|tax|ppn|diskon|tanggal|date|time|jam|operator|kasir)/i;
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length >= 3 && line.length <= 70)
    .filter((line) => !blacklist.test(line));

  const candidate = lines.find((line) => /[a-zA-Z]/.test(line));
  return candidate || "";
};

const loadImageDimensions = (previewUrl: string) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const image = new window.Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 });
    };
    image.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    image.src = previewUrl;
  });

const buildPhotoId = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

export default function ExpenseForm({ onTransactionAdded }: ExpenseFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [jenisBiaya, setJenisBiaya] = useState("Transportasi");
  const [customJenisBiaya, setCustomJenisBiaya] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [klaim, setKlaim] = useState("");
  const [klaimStatus, setKlaimStatus] = useState<KlaimStatus>("Belum diajukan");
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [jumlah, setJumlah] = useState<number | undefined>(undefined);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrPreview, setOcrPreview] = useState("");
  const DRAFT_KEY = "draft:expense:v1";
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    return () => {
      selectedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, [selectedPhotos]);

  const appendFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("Hanya file gambar yang bisa diunggah.");
      return;
    }

    const existingIds = new Set(selectedPhotos.map((photo) => photo.id));
    const nextPhotos: SelectedPhoto[] = [];

    for (const file of imageFiles) {
      const id = buildPhotoId(file);
      if (existingIds.has(id)) continue;

      const previewUrl = URL.createObjectURL(file);
      const dimensions = await loadImageDimensions(previewUrl);
      nextPhotos.push({
        id,
        file,
        previewUrl,
        width: dimensions.width,
        height: dimensions.height,
      });
      existingIds.add(id);
    }

    if (nextPhotos.length === 0) {
      toast.message("File yang sama sudah dipilih sebelumnya.");
      return;
    }

    setSelectedPhotos((prev) => [...prev, ...nextPhotos]);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    await appendFiles(e.target.files);
    e.target.value = "";
  };

  const handleScanReceipt = () => {
    const input = document.getElementById("receipt-capture") as HTMLInputElement | null;
    input?.click();
  };

  const removePhoto = (id: string) => {
    setSelectedPhotos((prev) => {
      const target = prev.find((photo) => photo.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((photo) => photo.id !== id);
    });
  };

  const clearPhotos = () => {
    setSelectedPhotos((prev) => {
      prev.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return [];
    });
  };

  const resetForm = () => {
    setTanggal(new Date().toISOString().split("T")[0]);
    setJenisBiaya("Transportasi");
    setCustomJenisBiaya("");
    setKeterangan("");
    setJumlah(undefined);
    setKlaim("");
    setKlaimStatus("Belum diajukan");
    clearPhotos();
    setOcrPreview("");
    setOcrProgress(0);

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }

    const fileInput = document.getElementById("file-input") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    const receiptInput = document.getElementById("receipt-capture") as HTMLInputElement;
    if (receiptInput) receiptInput.value = "";
  };

  const handleJumlahChange = (value: number | undefined) => {
    setJumlah(value);
  };

  useEffect(() => {
    if (!isOpen) return;
    if (draftReady) return;

    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        setDraftReady(true);
        return;
      }
      const parsed = JSON.parse(raw) as {
        tanggal?: string;
        jenisBiaya?: string;
        customJenisBiaya?: string;
        keterangan?: string;
        klaim?: string;
        klaimStatus?: KlaimStatus;
        jumlah?: number;
      };
      if (typeof parsed.tanggal === "string") setTanggal(parsed.tanggal);
      if (typeof parsed.jenisBiaya === "string") setJenisBiaya(parsed.jenisBiaya);
      if (typeof parsed.customJenisBiaya === "string") setCustomJenisBiaya(parsed.customJenisBiaya);
      if (typeof parsed.keterangan === "string") setKeterangan(parsed.keterangan);
      if (typeof parsed.klaim === "string") setKlaim(parsed.klaim);
      if (typeof parsed.klaimStatus === "string" && klaimStatusOptions.includes(parsed.klaimStatus)) {
        setKlaimStatus(parsed.klaimStatus);
      }
      if (typeof parsed.jumlah === "number") setJumlah(parsed.jumlah);
    } catch {
      // ignore
    } finally {
      setDraftReady(true);
    }
  }, [DRAFT_KEY, draftReady, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!draftReady) return;

    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            tanggal,
            jenisBiaya,
            customJenisBiaya,
            keterangan,
            klaim,
            klaimStatus,
            jumlah,
          })
        );
      } catch {
        // ignore
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [DRAFT_KEY, draftReady, isOpen, tanggal, jenisBiaya, customJenisBiaya, keterangan, klaim, klaimStatus, jumlah]);

  const handleRunOcr = async () => {
    if (selectedPhotos.length === 0 || isOcrProcessing) return;

    setIsOcrProcessing(true);
    setOcrProgress(0);
    setMessage(null);

    try {
      const tesseract = await import("tesseract.js");
      const result = await tesseract.recognize(selectedPhotos[0].file, "eng", {
        logger: (event: { status?: string; progress?: number }) => {
          if (event.status === "recognizing text" && typeof event.progress === "number") {
            setOcrProgress(Math.round(event.progress * 100));
          }
        },
      });

      const rawText = result.data.text || "";
      if (!rawText.trim()) {
        toast.error("Teks struk tidak terbaca. Coba foto lebih jelas.");
        return;
      }

      setOcrPreview(rawText.slice(0, 900));

      const detectedDate = extractDateFromOcrText(rawText);
      const detectedAmount = extractAmountFromOcrText(rawText);
      const detectedDescription = extractDescriptionFromOcrText(rawText);

      if (detectedDate) {
        setTanggal(detectedDate);
      }
      if (typeof detectedAmount === "number") {
        setJumlah(detectedAmount);
      }
      if (detectedDescription) {
        setKeterangan((prev) => (prev.trim() ? prev : detectedDescription));
      }

      toast.success("OCR selesai. Data utama struk sudah diisi otomatis.");
    } catch (error) {
      console.error("OCR error:", error);
      toast.error("OCR gagal diproses. Periksa koneksi lalu coba lagi.");
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const finalJenisBiaya =
      jenisBiaya === "Lainnya" ? customJenisBiaya.trim() : jenisBiaya;
    if (jenisBiaya === "Lainnya" && !finalJenisBiaya) {
      setIsSubmitting(false);
      setMessage("Mohon isi Jenis Biaya lainnya.");
      return;
    }

    try {
      const uploadedUrls =
        selectedPhotos.length === 0
          ? []
          : await Promise.all(
              selectedPhotos.map(async (photo, index) => {
                const safeName = photo.file.name.replace(/\s+/g, "-");
                const storageRef = ref(
                  storage,
                  `berkas/${Date.now()}_${index + 1}_${safeName}`
                );
                const metadata = photo.file.type
                  ? { contentType: photo.file.type }
                  : undefined;
                const snapshot = await uploadBytes(storageRef, photo.file, metadata);
                return getDownloadURL(snapshot.ref);
              })
            );

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal,
          jenisBiaya: finalJenisBiaya,
          keterangan,
          jumlah,
          klaim,
          klaimStatus,
          fileUrls: uploadedUrls,
          fileUrl: uploadedUrls[0] || "",
        }),
      });

      if (!response.ok) throw new Error("Gagal menyimpan data");

      await onTransactionAdded();
      toast.success("Data berhasil disimpan!");
      setMessage("Data berhasil disimpan!");
      resetForm();
      setDraftReady(false);

      setTimeout(() => setMessage(null), 1500);
    } catch (error) {
      console.error(error);
      setMessage("Terjadi error saat menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setDraftReady(false);
      }}
    >
      <DialogTrigger asChild>
        <Button className="bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400">
          Input Biaya Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-none max-h-[calc(100dvh-1rem)] overflow-y-auto border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="text-cyan-700 dark:text-cyan-300">
            Input Biaya Baru
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tanggal">Tanggal</Label>
              <Input
                id="tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="jenisBiaya">Jenis Biaya</Label>
              <Select value={jenisBiaya} onValueChange={setJenisBiaya}>
                <SelectTrigger className="w-full bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10">
                  <SelectValue placeholder="Pilih jenis biaya" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-white/10">
                  <SelectItem value="Transportasi">Transportasi</SelectItem>
                  <SelectItem value="Cargo">Cargo</SelectItem>
                  <SelectItem value="Meals Metting">Meals Metting</SelectItem>
                  <SelectItem value="Lainnya">Lainnya...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {jenisBiaya === "Lainnya" ? (
            <div className="grid gap-2">
              <Label htmlFor="customJenisBiaya">Jenis Biaya Lainnya</Label>
              <Input
                id="customJenisBiaya"
                value={customJenisBiaya}
                onChange={(e) => setCustomJenisBiaya(e.target.value)}
                placeholder="Contoh: Parkir, Tol, Hotel, dll."
                required
                className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
              />
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="keterangan">Keterangan</Label>
            <Textarea
              id="keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              required
              placeholder="Detail pengeluaran..."
              className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="jumlah">Jumlah (Rp)</Label>
              <CurrencyInput
                id="jumlah"
                placeholder="1.000.000"
                required
                value={jumlah || ""}
                onValueChange={handleJumlahChange}
                className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="klaim">Nama Klaim</Label>
              <Input
                id="klaim"
                value={klaim}
                onChange={(e) => setKlaim(e.target.value)}
                required
                placeholder="Contoh: Proyek A"
                className="bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10"
              />
            </div>
            <div className="grid gap-2">
              <Label>Status Klaim</Label>
              <Select value={klaimStatus} onValueChange={(value) => setKlaimStatus(value as KlaimStatus)}>
                <SelectTrigger className="w-full bg-white border-slate-200 dark:bg-slate-900/60 dark:border-white/10">
                  <SelectValue placeholder="Pilih status klaim" />
                </SelectTrigger>
                <SelectContent className="bg-white text-slate-900 border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-white/10">
                  {klaimStatusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label htmlFor="file-input">Upload Berkas Foto (Opsional, Bisa Banyak)</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleScanReceipt}
                  size="sm"
                  className="h-7 rounded-full border border-slate-200 bg-slate-100 px-3 text-[11px] text-slate-900 hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
                >
                  <Camera className="mr-2 h-3.5 w-3.5" />
                  Scan Struk
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRunOcr}
                  size="sm"
                  disabled={selectedPhotos.length === 0 || isOcrProcessing}
                  className="h-7 rounded-full border-cyan-300/40 text-cyan-700 hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-500/10"
                >
                  {isOcrProcessing ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ScanText className="mr-2 h-3.5 w-3.5" />
                  )}
                  OCR Struk
                </Button>
              </div>
            </div>
            <Input
              id="file-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="text-slate-500 file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-1 file:text-white hover:file:bg-cyan-700 dark:text-slate-400 dark:file:bg-cyan-500 dark:hover:file:bg-cyan-400"
            />
            <Input
              id="receipt-capture"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            {isOcrProcessing ? (
              <p className="text-xs text-cyan-600 dark:text-cyan-300">
                OCR berjalan... {ocrProgress}%
              </p>
            ) : null}
          </div>

          {selectedPhotos.length > 0 ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Preview Berkas ({selectedPhotos.length})</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-rose-600 hover:text-rose-700 dark:text-rose-300"
                  onClick={clearPhotos}
                >
                  Hapus Semua
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {selectedPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-slate-900/40"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-slate-200 dark:border-white/10">
                      <Image
                        src={photo.previewUrl}
                        alt={photo.file.name}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "contain" }}
                        className="rounded-md"
                      />
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                      <p className="line-clamp-1 font-medium">{photo.file.name}</p>
                      <p>
                        Resolusi: {photo.width > 0 && photo.height > 0 ? `${photo.width} x ${photo.height}` : "Tidak terdeteksi"}
                      </p>
                      <p>Ukuran: {formatFileSize(photo.file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePhoto(photo.id)}
                      className="mt-2 h-7 w-full border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-400/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Hapus
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {ocrPreview ? (
            <div className="rounded-lg border border-cyan-200/70 bg-cyan-50/70 p-3 text-xs text-slate-700 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-slate-200">
              <p className="font-semibold text-cyan-700 dark:text-cyan-300">Hasil OCR (ringkas)</p>
              <p className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap">{ocrPreview}</p>
            </div>
          ) : null}

          {message && (
            <p
              className={`mt-2 text-center text-sm ${
                message.toLowerCase().includes("error")
                  ? "text-rose-600 dark:text-rose-300"
                  : "text-emerald-600 dark:text-emerald-300"
              }`}
            >
              {message}
            </p>
          )}

          <DialogFooter className="sticky bottom-0 bg-white/90 pt-3 -mx-6 px-6 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] backdrop-blur dark:bg-slate-950/80">
            <div className="flex w-full gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={handleScanReceipt}
                size="sm"
                className="flex-1 h-9 border border-slate-200 bg-slate-100 px-3 text-xs text-slate-900 hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15"
              >
                <Camera className="mr-2 h-3.5 w-3.5" />
                Scan
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                size="sm"
                className="flex-1 h-9 bg-cyan-600 px-3 text-xs text-white hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-400"
              >
                {isSubmitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
