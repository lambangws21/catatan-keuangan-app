"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";

const shouldShowLoaderForAnchor = (event: MouseEvent, anchor: HTMLAnchorElement) => {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  const nextUrl = new URL(href, window.location.href);
  if (nextUrl.origin !== window.location.origin) return false;

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const nextPath = `${nextUrl.pathname}${nextUrl.search}`;
  return currentPath !== nextPath;
};

export default function PageTransitionLoader() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const fallbackTimer = useRef<number | null>(null);

  const showLoader = () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);

    setIsVisible(true);
    fallbackTimer.current = window.setTimeout(() => {
      setIsVisible(false);
    }, 3500);
  };

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || !shouldShowLoaderForAnchor(event, anchor)) return;
      showLoader();
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushStateWithLoader(...args) {
      const targetUrl = args[2];
      if (typeof targetUrl === "string" || targetUrl instanceof URL) {
        const nextUrl = new URL(targetUrl, window.location.href);
        if (`${nextUrl.pathname}${nextUrl.search}` !== `${window.location.pathname}${window.location.search}`) {
          showLoader();
        }
      }
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function replaceStateWithLoader(...args) {
      const targetUrl = args[2];
      if (typeof targetUrl === "string" || targetUrl instanceof URL) {
        const nextUrl = new URL(targetUrl, window.location.href);
        if (`${nextUrl.pathname}${nextUrl.search}` !== `${window.location.pathname}${window.location.search}`) {
          showLoader();
        }
      }
      return originalReplaceState.apply(this, args);
    };

    window.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", showLoader);

    return () => {
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", showLoader);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    };
  }, []);

  useEffect(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setIsVisible(false);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    }, 260);
  }, [pathname]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-slate-950/75 text-white backdrop-blur-xl">
      <div className="relative w-[min(88vw,360px)] overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-6 text-center shadow-[0_24px_80px_rgba(6,182,212,0.22)]">
        <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-white/10">
          <div className="h-full w-1/2 animate-[page-loader_1.1s_ease-in-out_infinite] rounded-full bg-cyan-300" />
        </div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/15 shadow-inner shadow-white/10">
          <Wallet className="h-7 w-7 text-cyan-200" />
        </div>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
          <p className="text-sm font-semibold tracking-wide">Memuat halaman...</p>
        </div>
        <p className="mt-2 text-xs text-slate-300">
          Menyiapkan data dan tampilan terbaru.
        </p>
      </div>
    </div>
  );
}
