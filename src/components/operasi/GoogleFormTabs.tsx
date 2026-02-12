"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { OperasiMaterialsList } from "@/components/operasi/OperasiMaterialsPanel";
import { cn } from "@/lib/utils";

const RAW_FORM_URL =
  "https://docs.google.com/forms/u/0/d/e/1FAIpQLSfaqN8MwjyAb4RzkX6afr_OYop5_WLYmPF7fEnWCe3inlWQ3w/formResponse";

const GOOGLE_FORM_WINDOW_NAME = "operasi-google-form";

const toEmbeddableGoogleFormUrl = (url: string) => {
  try {
    const u = new URL(url);
    if (u.pathname.endsWith("/formResponse")) {
      u.pathname = u.pathname.replace(/\/formResponse$/, "/viewform");
    }
    if (!u.pathname.endsWith("/viewform")) return url;
    u.searchParams.set("embedded", "true");
    return u.toString();
  } catch {
    return url;
  }
};

type OperasiGoogleFormProps = {
  embedded?: boolean;
  onClose?: () => void;
};

export default function OperasiGoogleForm({ embedded, onClose }: OperasiGoogleFormProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  const VIEWMODE_KEY = embedded ? "operasi:viewMode:embedded:v1" : "operasi:viewMode:v1";
  const LEFT_WIDTH_KEY = embedded ? "operasi:leftWidth:embedded:v1" : "operasi:leftWidth:v1";
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 867px)").matches;
  }, []);

  const [viewMode, setViewMode] = useState<"split" | "form" | "materials">(() => {
    if (typeof window === "undefined") return "split";
    const raw = window.localStorage.getItem(VIEWMODE_KEY);
    if (raw === "form" || raw === "materials" || raw === "split") {
      if (embedded && isMobile && raw === "split") return "form";
      return raw;
    }
    if (embedded && isMobile) return "form";
    return "split";
  });
  const viewModeRef = useRef(viewMode);

  const [leftWidth, setLeftWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 460;
    const raw = window.localStorage.getItem(LEFT_WIDTH_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : 460;
  });

  const [iframeKey, setIframeKey] = useState(0);
  const embedUrl = useMemo(() => toEmbeddableGoogleFormUrl(RAW_FORM_URL), []);
  const openUrl = useMemo(() => {
    try {
      const u = new URL(embedUrl);
      u.searchParams.delete("embedded");
      return u.toString();
    } catch {
      return embedUrl;
    }
  }, [embedUrl]);

  const resetView = () => {
    setViewMode(embedded && isMobile ? "form" : "split");
    setLeftWidth(460);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(VIEWMODE_KEY);
        window.localStorage.removeItem(LEFT_WIDTH_KEY);
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LEFT_WIDTH_KEY, String(leftWidth));
  }, [leftWidth, LEFT_WIDTH_KEY]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEWMODE_KEY, viewMode);
  }, [viewMode, VIEWMODE_KEY]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current || viewModeRef.current !== "split") return;
      const node = containerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const delta = e.clientX - dragStartX.current;
      const next = dragStartW.current + delta;
      const min = 340;
      const max = Math.max(min, rect.width - 420);
      setLeftWidth(Math.max(min, Math.min(max, next)));
    };
    const onUp = () => {
      dragRef.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div
      className={cn(
        "flex flex-col",
        embedded ? "h-full min-h-0" : "min-h-svh p-4 bg-background"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          embedded ? "border-b px-3 py-2" : "mb-3"
        )}
      >
        <div className="space-y-0.5">
          {embedded ? (
            <div className="text-xs font-semibold">Google Form Operasi</div>
          ) : (
            <>
              <div className="text-md font-bold">Operasi</div>
              <div className="text-xs text-muted-foreground">
                Split view: kiri untuk pilih implant/material, kanan untuk isi Google Form.
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            {embedded && onClose ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={onClose}
              >
                Kembali
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className={cn(
                "h-7 px-2 text-[11px]",
                embedded ? "hidden md:inline-flex" : ""
              )}
              variant={viewMode === "split" ? "default" : "outline"}
              onClick={() => setViewMode("split")}
              title="Tampilkan 2 panel"
            >
              Split
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 px-2 text-[11px]"
              variant={viewMode === "materials" ? "default" : "outline"}
              onClick={() => setViewMode("materials")}
              title="Hanya daftar implant/material"
            >
              Materials
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 px-2 text-[11px]"
              variant={viewMode === "form" ? "default" : "outline"}
              onClick={() => setViewMode("form")}
              title="Hanya Google Form"
            >
              Form
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={resetView}
              title="Reset tampilan (kalau panel hilang)"
            >
              Reset
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIframeKey((k) => k + 1)}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" className="h-7 px-2 text-[11px]" asChild>
            <a
              href={openUrl}
              target={GOOGLE_FORM_WINDOW_NAME}
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Open Form
            </a>
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={cn(
          "flex min-h-0 flex-1 overflow-hidden rounded-xl border bg-card",
          embedded ? "m-3" : "h-[calc(100svh-88px)]"
        )}
      >
        {viewMode !== "form" && (
          <div
            className="h-full overflow-hidden "
            style={{ width: viewMode === "split" ? leftWidth : "100%" }}
          >
            <div className="h-full min-h-0 p-2 overflow-hidden">
              <OperasiMaterialsList density="compact" forceList />
            </div>
          </div>
        )}

        {viewMode === "split" && (
          <div
            className="w-2 cursor-col-resize bg-border/60 hover:bg-border relative  "
            onPointerDown={(e) => {
              dragRef.current = true;
              dragStartX.current = e.clientX;
              dragStartW.current = leftWidth;
              (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
            }}
            aria-label="Resize panels"
            title="Drag to resize"
          />
        )}

        {viewMode !== "materials" && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <Card className="h-full rounded-none border-0">
              <iframe
                key={iframeKey}
                title="Google Form"
                src={embedUrl}
                className="h-full w-full"
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
