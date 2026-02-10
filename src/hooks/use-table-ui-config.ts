"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { TableUiConfig, sanitizeTableUiConfig } from "@/lib/ui-config";

type ApiResponse = {
  config: TableUiConfig | Partial<TableUiConfig>;
  source: "remote" | "default";
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
  return (await res.json()) as ApiResponse;
};

const LOCAL_KEY = "tableUiConfigOverride";

const readLocalOverride = (): Partial<TableUiConfig> | null => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const json = JSON.parse(raw) as unknown;
    if (!json || typeof json !== "object") return null;
    return json as Partial<TableUiConfig>;
  } catch {
    return null;
  }
};

export function useTableUiConfig() {
  const { data, error, mutate } = useSWR<ApiResponse>(
    "/api/ui-config/table",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const [localOverride, setLocalOverrideState] =
    useState<Partial<TableUiConfig> | null>(null);

  useEffect(() => {
    setLocalOverrideState(readLocalOverride());
  }, []);

  const remoteConfig = useMemo(
    () => sanitizeTableUiConfig(data?.config ?? undefined),
    [data?.config]
  );

  const config = useMemo(
    () => sanitizeTableUiConfig({ ...remoteConfig, ...(localOverride || {}) }),
    [remoteConfig, localOverride]
  );

  const setLocalOverride = (patch: Partial<TableUiConfig>) => {
    setLocalOverrideState((prev) => {
      const next = { ...(prev || {}), ...patch };
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const resetLocalOverride = () => {
    try {
      localStorage.removeItem(LOCAL_KEY);
    } catch {
      // ignore
    }
    setLocalOverrideState(null);
  };

  const saveRemote = async (token: string, patch: Partial<TableUiConfig>) => {
    const res = await fetch("/api/ui-config/table/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      if (json && typeof json === "object" && "error" in json) {
        const err = (json as Record<string, unknown>).error;
        if (typeof err === "string" && err.trim()) message = err;
      }
      throw new Error(message);
    }
    await mutate();
    return json as ApiResponse;
  };

  return {
    config,
    remoteConfig,
    localOverride,
    source: data?.source,
    isLoading: !data && !error,
    isError: error,
    setLocalOverride,
    resetLocalOverride,
    saveRemote,
  };
}
