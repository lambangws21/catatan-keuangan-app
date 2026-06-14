"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { toast } from "sonner";
import {
  Download,
  FileText,
  Grip,
  Loader2,
  Palette,
  Plus,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type PdfJsDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
};

type PdfJsPage = {
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: {
    canvas: HTMLCanvasElement;
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
};

type TextOverlay = {
  id: string;
  page: number;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
};

const DEFAULT_COLOR = "#14b8a6";
const PREVIEW_SCALE = 1.6;

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
};

const downloadBytes = (bytes: Uint8Array, filename: string) => {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function PdfEditor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const previewShellRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const [fileName, setFileName] = useState("");
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PdfJsDocument | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [previewWidth, setPreviewWidth] = useState(0);
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pageOverlays = useMemo(
    () => overlays.filter((item) => item.page === currentPage),
    [currentPage, overlays]
  );
  const selectedOverlay = useMemo(
    () => overlays.find((item) => item.id === selectedId) ?? null,
    [overlays, selectedId]
  );
  const previewScale = useMemo(() => {
    if (!canvasSize.width || !previewWidth) return 1;
    return Math.min(1, Math.max(0.46, previewWidth / canvasSize.width));
  }, [canvasSize.width, previewWidth]);
  const previewSize = useMemo(
    () => ({
      width: canvasSize.width * previewScale,
      height: canvasSize.height * previewScale,
    }),
    [canvasSize.height, canvasSize.width, previewScale]
  );

  const renderPage = useCallback(async () => {
    if (!pdfDocument || !canvasRef.current) return;

    setIsRendering(true);
    try {
      const page = await pdfDocument.getPage(currentPage);
      const viewport = page.getViewport({ scale: PREVIEW_SCALE });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) throw new Error("Canvas tidak tersedia.");

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / PREVIEW_SCALE}px`;
      canvas.style.height = `${viewport.height / PREVIEW_SCALE}px`;

      await page.render({ canvas, canvasContext: context, viewport }).promise;
      setCanvasSize({
        width: viewport.width / PREVIEW_SCALE,
        height: viewport.height / PREVIEW_SCALE,
      });
    } catch (error) {
      console.error(error);
      toast.error("Gagal menampilkan halaman PDF.");
    } finally {
      setIsRendering(false);
    }
  }, [currentPage, pdfDocument]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  useEffect(() => {
    const shell = previewShellRef.current;
    if (!shell) return;

    const updateWidth = () => {
      const rect = shell.getBoundingClientRect();
      setPreviewWidth(Math.max(0, rect.width - 16));
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setSelectedId(null);
    setOverlays([]);

    try {
      const buffer = await file.arrayBuffer();
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.mjs",
        import.meta.url
      ).toString();
      const loadingTask = pdfjs.getDocument({ data: buffer.slice(0) });
      const loadedPdf = (await loadingTask.promise) as unknown as PdfJsDocument;

      setPdfBytes(buffer);
      setPdfDocument(loadedPdf);
      setPageCount(loadedPdf.numPages);
      setCurrentPage(1);
      setFileName(file.name);
      toast.success("PDF berhasil dimuat.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal membaca PDF.");
      setPdfBytes(null);
      setPdfDocument(null);
      setPageCount(0);
      setFileName("");
    } finally {
      setIsLoading(false);
    }
  };

  const updateOverlay = (id: string, patch: Partial<TextOverlay>) => {
    setOverlays((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const addTextOverlay = () => {
    if (!pdfDocument) {
      toast.error("Upload PDF dulu.");
      return;
    }

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}`;

    const item: TextOverlay = {
      id,
      page: currentPage,
      text: "Teks baru",
      x: Math.max(24, canvasSize.width * 0.12),
      y: Math.max(24, canvasSize.height * 0.12),
      fontSize: 18,
      color: DEFAULT_COLOR,
    };

    setOverlays((prev) => [...prev, item]);
    setSelectedId(id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setOverlays((prev) => prev.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    item: TextOverlay
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedId(item.id);
    dragRef.current = {
      id: item.id,
      offsetX: (event.clientX - rect.left) / previewScale,
      offsetY: (event.clientY - rect.top) / previewScale,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const nextX =
      (event.clientX - rect.left) / previewScale - dragRef.current.offsetX;
    const nextY =
      (event.clientY - rect.top) / previewScale - dragRef.current.offsetY;

    updateOverlay(dragRef.current.id, {
      x: Math.min(Math.max(0, nextX), Math.max(0, canvasSize.width - 16)),
      y: Math.min(Math.max(0, nextY), Math.max(0, canvasSize.height - 16)),
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  const exportPdf = async () => {
    if (!pdfBytes) {
      toast.error("Upload PDF dulu.");
      return;
    }

    try {
      const pdfDoc = await PDFDocument.load(pdfBytes.slice(0));
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      overlays.forEach((item) => {
        const page = pdfDoc.getPages()[item.page - 1];
        if (!page) return;

        const { width, height } = page.getSize();
        const displayWidth = canvasSize.width || width;
        const displayHeight = canvasSize.height || height;
        const color = hexToRgb(item.color);
        const pdfX = (item.x / displayWidth) * width;
        const pdfY = height - (item.y / displayHeight) * height - item.fontSize;

        page.drawText(item.text, {
          x: pdfX,
          y: Math.max(0, pdfY),
          size: item.fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
          maxWidth: width - pdfX - 24,
          lineHeight: item.fontSize * 1.2,
        });
      });

      const bytes = await pdfDoc.save();
      const name = fileName.replace(/\.pdf$/i, "") || "edited";
      downloadBytes(bytes, `${name}-edited.pdf`);
      toast.success("PDF berhasil diexport.");
    } catch (error) {
      console.error(error);
      toast.error("Gagal export PDF.");
    }
  };

  return (
    <div className="space-y-4 pb-20 text-(--dash-ink) md:space-y-5 md:pb-0">
      <header className="rounded-2xl border border-white/10 bg-(--dash-surface) p-4 shadow-[0_16px_40px_rgba(2,6,23,0.35)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
              <FileText className="h-3.5 w-3.5" />
              PDF Editor
            </p>
            <h1 className="mt-3 break-words text-2xl font-semibold text-white sm:text-3xl">
              Edit PDF Ringan
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-(--dash-muted)">
              Tambahkan teks overlay, ubah warna dan ukuran, drag posisi teks, lalu export menjadi PDF baru.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
            <Button
              type="button"
              onClick={addTextOverlay}
              disabled={!pdfDocument}
              className="h-11 bg-cyan-500 text-slate-950 hover:bg-cyan-300"
            >
              <Plus className="h-4 w-4" />
              Tambah Teks
            </Button>
            <Button
              type="button"
              onClick={exportPdf}
              disabled={!pdfDocument || overlays.length === 0}
              variant="secondary"
              className="h-11 border border-white/10 bg-white/10 text-white hover:bg-white/15"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_320px] xl:gap-5">
        <aside className="space-y-4 rounded-2xl border border-white/10 bg-(--dash-surface) p-4">
          <div className="space-y-2">
            <Label htmlFor="pdf-upload" className="text-sm text-white">
              Upload PDF
            </Label>
            <Input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="h-11 border-white/10 bg-white/5 text-sm text-white file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-cyan-500 file:px-3 file:text-slate-950"
            />
            <p className="break-words text-xs text-(--dash-muted)">
              {fileName || "Belum ada file dipilih."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="h-11 border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={currentPage >= pageCount}
              onClick={() => setCurrentPage((prev) => Math.min(pageCount, prev + 1))}
              className="h-11 border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              Next
            </Button>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-(--dash-muted)">
            Halaman{" "}
            <span className="font-semibold text-white">
              {pageCount ? currentPage : 0}
            </span>{" "}
            dari <span className="font-semibold text-white">{pageCount}</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-(--dash-muted)">
            Model edit ini menambahkan teks baru di atas PDF asli. Teks bawaan PDF tidak diubah langsung.
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/80 p-3 shadow-[0_18px_55px_rgba(2,6,23,0.42)] sm:p-4">
          <div
            ref={previewShellRef}
            className="relative flex min-h-[60vh] items-center justify-center overflow-auto rounded-xl bg-black/30 p-2 sm:min-h-[520px] sm:p-4"
          >
            {isLoading || isRendering ? (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
              </div>
            ) : null}

            {pdfDocument ? (
              <div
                className="relative shrink-0"
                style={{
                  width: previewSize.width || undefined,
                  height: previewSize.height || undefined,
                }}
              >
                <div
                  ref={stageRef}
                  className="relative shrink-0 overflow-hidden rounded-md bg-white shadow-2xl"
                  style={{
                    width: canvasSize.width || undefined,
                    height: canvasSize.height || undefined,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <canvas ref={canvasRef} className="block" />
                  {pageOverlays.map((item) => (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onPointerDown={(event) => handlePointerDown(event, item)}
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        "absolute touch-none cursor-move select-none rounded-md border px-2 py-1 shadow-lg",
                        selectedId === item.id
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-transparent bg-transparent hover:border-cyan-300/70"
                      )}
                      style={{
                        left: item.x,
                        top: item.y,
                        color: item.color,
                        fontSize: item.fontSize,
                        lineHeight: 1.15,
                        maxWidth: Math.max(120, canvasSize.width - item.x - 24),
                      }}
                    >
                      <span className="inline-flex items-start gap-1 whitespace-pre-wrap break-words">
                        <Grip className="mt-1 h-3 w-3 shrink-0 opacity-50" />
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[420px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
                <Upload className="h-10 w-10 text-cyan-300" />
                <h2 className="mt-3 text-lg font-semibold text-white">
                  Upload PDF untuk mulai
                </h2>
                <p className="mt-1 max-w-md text-sm text-(--dash-muted)">
                  Setelah file dimuat, halaman PDF akan muncul di sini dan teks bisa ditambahkan sebagai overlay.
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4 rounded-2xl border border-white/10 bg-(--dash-surface) p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-(--dash-muted)">
                Properti
              </p>
              <h2 className="text-lg font-semibold text-white">Teks</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!selectedOverlay}
              onClick={deleteSelected}
              className="text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {selectedOverlay ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="inline-flex items-center gap-2 text-sm text-white">
                  <Type className="h-4 w-4 text-cyan-300" />
                  Isi teks
                </Label>
                <Textarea
                  value={selectedOverlay.text}
                  onChange={(event) =>
                    updateOverlay(selectedOverlay.id, { text: event.target.value })
                  }
                  className="min-h-[120px] border-white/10 bg-white/5 text-base text-white placeholder:text-white/40 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm text-white">Ukuran</Label>
                  <Input
                    type="number"
                    min={8}
                    max={96}
                    value={selectedOverlay.fontSize}
                    onChange={(event) =>
                      updateOverlay(selectedOverlay.id, {
                        fontSize: Number(event.target.value),
                      })
                    }
                    className="h-11 border-white/10 bg-white/5 text-base text-white sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="inline-flex items-center gap-2 text-sm text-white">
                    <Palette className="h-4 w-4 text-cyan-300" />
                    Warna
                  </Label>
                  <Input
                    type="color"
                    value={selectedOverlay.color}
                    onChange={(event) =>
                      updateOverlay(selectedOverlay.id, { color: event.target.value })
                    }
                    className="h-11 border-white/10 bg-white/5 p-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm text-white">X</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedOverlay.x)}
                    onChange={(event) =>
                      updateOverlay(selectedOverlay.id, {
                        x: Number(event.target.value),
                      })
                    }
                    className="h-11 border-white/10 bg-white/5 text-base text-white sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-white">Y</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedOverlay.y)}
                    onChange={(event) =>
                      updateOverlay(selectedOverlay.id, {
                        y: Number(event.target.value),
                      })
                    }
                    className="h-11 border-white/10 bg-white/5 text-base text-white sm:text-sm"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-(--dash-muted)">
              Pilih teks di canvas atau klik <span className="font-semibold text-white">Tambah Teks</span>.
            </div>
          )}

          <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs leading-5 text-cyan-50/80">
            Tips: drag teks langsung di atas halaman PDF. Export akan mempertahankan PDF asli dan menambahkan teks overlay.
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-950/90 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur md:hidden">
        <Button
          type="button"
          onClick={addTextOverlay}
          disabled={!pdfDocument}
          className="h-12 bg-cyan-500 text-slate-950 hover:bg-cyan-300"
        >
          <Plus className="h-4 w-4" />
          Teks
        </Button>
        <Button
          type="button"
          onClick={exportPdf}
          disabled={!pdfDocument || overlays.length === 0}
          variant="secondary"
          className="h-12 border border-white/10 bg-white/10 text-white hover:bg-white/15"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
    </div>
  );
}
