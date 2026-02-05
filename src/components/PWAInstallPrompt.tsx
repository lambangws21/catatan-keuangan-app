"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  // iOS Safari
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    Boolean(nav?.standalone)
  );
};

export default function PWAInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [hidden, setHidden] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const dismissedKey = "pwa:install:dismissed:v1";

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissedKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    if (isStandalone()) return;
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  const dismiss = () => {
    try {
      localStorage.setItem(dismissedKey, "1");
    } catch {
      // ignore
    }
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome !== "accepted") {
        dismiss();
      }
    } catch {
      // ignore
    } finally {
      setDeferred(null);
      setHidden(true);
    }
  };

  if (hidden || !deferred) return null;

  return (
    <div
      className={cn(
        "fixed left-4 right-4 z-50 sm:hidden",
        "bottom-[calc(env(safe-area-inset-bottom)+1rem)]"
      )}
    >
      <div className="rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-[0_20px_60px_rgba(2,6,23,0.55)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">
              Install aplikasi
            </p>
            <p className="text-xs text-white/70">
              Buka lebih cepat seperti aplikasi.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={install}
            className="rounded-full bg-cyan-600 text-white hover:bg-cyan-700"
          >
            <Download className="mr-2 h-4 w-4" />
            Install
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="px-2 text-xs font-semibold text-white/60 hover:text-white"
          >
            Nanti
          </button>
        </div>
      </div>
    </div>
  );
}
