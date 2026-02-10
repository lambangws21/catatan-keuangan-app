"use client";

import { useMemo, useState } from "react";
import {
  IMPLANT_MATERIALS,
  type ImplantMaterialItem,
  type ImplantProcedure,
} from "@/lib/implantMaterials";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { Copy, ExternalLink, Eye, RefreshCcw, Check } from "lucide-react";

const PROCEDURE_OPTIONS: Array<{ label: string; value: "ALL" | ImplantProcedure }> =
  [
    { label: "All", value: "ALL" },
    { label: "THR", value: "THR" },
    { label: "TKR", value: "TKR" },
    { label: "UKA", value: "UKA" },
    { label: "Other", value: "OTHER" },
  ];

const DEFAULT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfaqN8MwjyAb4RzkX6afr_OYop5_WLYmPF7fEnWCe3inlWQ3w/viewform?embedded=true";

const GOOGLE_FORM_WINDOW_NAME = "operasi-google-form";

function openSingleGoogleFormWindow(url: string) {
  const win = window.open(url, GOOGLE_FORM_WINDOW_NAME, "noopener,noreferrer");
  win?.focus();
}

function normalizeGoogleFormUrl(raw: string): { embedUrl: string; openUrl: string } {
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts.at(-1);
    if (last === "formResponse") {
      parts[parts.length - 1] = "viewform";
      url.pathname = "/" + parts.join("/");
    }

    const openUrl = new URL(url.toString());
    openUrl.searchParams.delete("embedded");

    const embedUrl = new URL(url.toString());
    embedUrl.searchParams.set("embedded", "true");

    return { embedUrl: embedUrl.toString(), openUrl: openUrl.toString() };
  } catch {
    return { embedUrl: raw, openUrl: raw };
  }
}

const formatItemLines = (item: ImplantMaterialItem) => {
  const parts = [
    item.vendor ? `${item.vendor}` : null,
    item.implant,
    item.component ? `(${item.component})` : null,
    `- ${item.material}`,
  ].filter(Boolean);

  const firstLine = parts.join(" ");
  const lines = [firstLine];
  if (item.notes) lines.push(`Notes: ${item.notes}`);
  return lines;
};

const buildSummary = (items: ImplantMaterialItem[]) => {
  if (!items.length) return "";
  const byProcedure = items.reduce<Record<string, ImplantMaterialItem[]>>((acc, item) => {
    (acc[item.procedure] ??= []).push(item);
    return acc;
  }, {});

  return Object.entries(byProcedure)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([proc, list]) => {
      const lines = list
        .slice()
        .sort((a, b) => a.implant.localeCompare(b.implant))
        .map((it) => {
          const [head, ...rest] = formatItemLines(it);
          if (rest.length === 0) return `- ${head}`;
          return [`- ${head}`, ...rest.map((x) => `  ${x}`)].join("\n");
        });
      return `${proc}\n${lines.join("\n")}`;
    })
    .join("\n\n");
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function OperasiMaterialsList({
  density = "default",
  forceList = false,
}: {
  density?: "default" | "compact";
  forceList?: boolean;
}) {
  const isCompact = density === "compact";
  const [query, setQuery] = useState("");
  const [procedure, setProcedure] = useState<"ALL" | ImplantProcedure>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [notesDialogId, setNotesDialogId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const notesPreviewLimit = 55;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return IMPLANT_MATERIALS.filter((item) => {
      if (procedure !== "ALL" && item.procedure !== procedure) return false;
      if (!q) return true;
      return (
        item.implant.toLowerCase().includes(q) ||
        item.material.toLowerCase().includes(q) ||
        (item.component ?? "").toLowerCase().includes(q) ||
        (item.vendor ?? "").toLowerCase().includes(q) ||
        (item.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [procedure, query]);

  const selectedItems = useMemo(
    () => IMPLANT_MATERIALS.filter((it) => selectedIds.has(it.id)),
    [selectedIds]
  );

  const summary = useMemo(() => buildSummary(selectedItems), [selectedItems]);

  const notesText = useMemo(() => {
    const itemsWithNotes = selectedItems.filter((x) => Boolean(x.notes?.trim()));
    if (itemsWithNotes.length === 0) return "";
    return itemsWithNotes
      .slice()
      .sort((a, b) => a.implant.localeCompare(b.implant))
      .map((it) => `${it.procedure} - ${it.implant}\n${it.notes}`)
      .join("\n\n");
  }, [selectedItems]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filtered.forEach((it) => next.add(it.id));
      return next;
    });
  };

  const clearSelected = () => setSelectedIds(new Set());

  const flashCopyStatus = (message: string, timeoutMs = 1200) => {
    setCopyStatus(message);
    window.setTimeout(() => setCopyStatus(null), timeoutMs);
  };

  const copyText = async (text: string, okMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flashCopyStatus(okMessage, 1200);
    } catch {
      flashCopyStatus("Copy failed", 1500);
    }
  };

  const copySummary = async () => {
    if (!summary) return;
    await copyText(summary, "Copied");
  };

  const copyNotes = async () => {
    if (!notesText) return;
    await copyText(notesText, "Notes copied");
  };

  const notesDialogItem = useMemo(() => {
    if (!notesDialogId) return null;
    return IMPLANT_MATERIALS.find((it) => it.id === notesDialogId) ?? null;
  }, [notesDialogId]);

  const notesDialogText = (notesDialogItem?.notes ?? "").trim();
  const notesDialogMeta = notesDialogItem
    ? `${notesDialogItem.procedure} - ${notesDialogItem.implant}`
    : "";

  // --- MOBILE LIST ITEM (friendly) ---
  const MobileRow = ({ item }: { item: ImplantMaterialItem }) => {
    const checked = selectedIds.has(item.id);
    const notes = item.notes?.trim() ?? "";
    const notesPreviewFull = notes.replace(/\s+/g, " ").trim();
    const isNotesLong = notesPreviewFull.length > notesPreviewLimit;
    const notesPreview = isNotesLong
      ? `${notesPreviewFull.slice(0, notesPreviewLimit)}…`
      : notesPreviewFull;
    const isNotesExpandable = isNotesLong || notes.includes("\n");

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => toggleSelected(item.id)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          toggleSelected(item.id);
        }}
        className={cx(
          "w-full text-left",
          isCompact ? "rounded-lg border bg-background p-2" : "rounded-xl border bg-background p-3",
          "active:scale-[0.99] transition",
          checked && "border-primary/40 bg-muted/40"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="shrink-0">
                {item.procedure}
              </Badge>
              {checked && (
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" />
                  Selected
                </Badge>
              )}
            </div>

            <div className="mt-2 font-medium leading-snug wrap-break-words">
              {item.implant}
            </div>

            <div className="mt-1 text-xs text-muted-foreground wrap-break-words">
              {item.vendor ? item.vendor : "—"}
            </div>

            {isCompact ? (
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Material:</span>{" "}
                <span className="text-foreground/90">{item.material}</span>
                <span className="mx-2 text-muted-foreground/60">•</span>
                <span className="font-medium text-foreground">Comp:</span>{" "}
                <span className="text-foreground/90">{item.component ?? "-"}</span>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-2">
                  <div className="text-muted-foreground">Component</div>
                  <div className="font-medium wrap-break-words">{item.component ?? "-"}</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <div className="text-muted-foreground">Material</div>
                  <div className="font-medium wrap-break-words">{item.material}</div>
                </div>
              </div>
            )}

            <div className="mt-2">
              {!notes ? (
                <div className="text-xs text-muted-foreground">Notes: -</div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1 text-xs text-foreground/80 wrap-break-words">
                    <span className="text-muted-foreground">Notes: </span>
                    {notesPreview}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cx(isCompact ? "h-7 w-7 shrink-0" : "h-8 w-8 shrink-0")}
                    onClick={(e) => {
                      e.stopPropagation();
                      void copyText(notes, "Notes copied");
                    }}
                    title="Copy notes"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy notes</span>
                  </Button>
                  {isNotesExpandable && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cx(isCompact ? "h-7 w-7 shrink-0" : "h-8 w-8 shrink-0")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotesDialogId(item.id);
                      }}
                      title="Baca lebih"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Baca lebih</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <input
            type="checkbox"
            checked={checked}
            readOnly
            tabIndex={-1}
            aria-hidden="true"
            className="mt-1 h-4 w-4 shrink-0 pointer-events-none"
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className={cx(
        "h-full min-h-0 flex flex-col w-full",
        isCompact ? "gap-2 text-[13px]" : "gap-3"
      )}
    >
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cx(isCompact ? "text-base" : "text-lg", "font-semibold leading-tight")}>
            Operasi
          </div>
          <div className="text-xs text-muted-foreground">
            Pilih implant/material lalu copy ke Google Form.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="shrink-0">
            {selectedItems.length} selected
          </Badge>
          {copyStatus && <Badge variant="outline">{copyStatus}</Badge>}
        </div>
      </div>

      {/* SEARCH + FILTER (friendly) */}
      <Card className="py-0 gap-0">
        <div className={cx(isCompact ? "p-2 space-y-2" : "p-3 space-y-3")}>
          <Input
            placeholder="Search implant / material / vendor…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {/* Mobile: Tabs (lebih rapih) */}
          <div className={cx(forceList ? "hidden" : "md:hidden")}>
            <Tabs value={procedure} onValueChange={(v) => setProcedure(v as typeof procedure)}>
              <TabsList className="w-full flex overflow-x-auto justify-start">
                {PROCEDURE_OPTIONS.map((opt) => (
                  <TabsTrigger key={opt.value} value={opt.value} className="shrink-0">
                    {opt.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Desktop: Buttons */}
          <div className={cx(forceList ? "flex" : "hidden md:flex", "flex-wrap gap-2")}>
            {PROCEDURE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={procedure === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setProcedure(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>
              Select filtered
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearSelected}>
              Clear
            </Button>
            <div className="flex-1" />
            <Badge variant="outline">{filtered.length} hasil</Badge>
          </div>
        </div>
      </Card>

      {/* LIST (mobile) + TABLE (desktop) */}
      <div className="flex-1 min-h-0">
        {/* Mobile list */}
        <div
          className={cx(
            forceList ? "h-full overflow-auto space-y-2 pb-2" : "md:hidden h-full overflow-auto space-y-2 pb-2"
          )}
        >
          {filtered.map((item) => (
            <MobileRow key={item.id} item={item} />
          ))}
          {!filtered.length && (
            <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
              Tidak ada data. Isi `src/lib/implantMaterials.ts`.
            </div>
          )}
        </div>

        {/* Desktop table */}
        <Card
          className={cx(
            forceList ? "hidden" : "hidden md:flex",
            "h-full min-h-0 overflow-hidden py-0 gap-0"
          )}
        >
          <div className="h-full overflow-auto">
            <table className={cx("w-full table-fixed", isCompact ? "text-xs" : "text-sm")}>
              <colgroup>
                <col className="w-8" />
                <col className="w-10" />
                <col />
                <col className="w-14" />
                <col className="w-16" />
                <col className="w-16" />
              </colgroup>
              <thead className="sticky top-0 bg-background border-b">
                <tr className="text-left">
                  <th className={cx(isCompact ? "px-2 py-1.5" : "px-3 py-2", "w-8")}>Sel</th>
                  <th className={cx(isCompact ? "px-2 py-1.5" : "px-3 py-2", "w-10")}>Proc</th>
                  <th className={cx(isCompact ? "px-2 py-1.5" : "px-3 py-2")}>Implant</th>
                  <th className={cx(isCompact ? "px-2 py-1.5" : "px-3 py-2", "w-16")}>
                    Component
                  </th>
                  <th className={cx(isCompact ? "px-2 py-1.5" : "px-3 py-2", "w-16")}>
                    Material
                  </th>
                  <th className={cx(isCompact ? "px-2 py-1.5" : "px-3 py-2", "w-16")}>Notes</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((item) => {
                  const checked = selectedIds.has(item.id);
                  const notes = item.notes?.trim() ?? "";
                  const notesPreviewFull = notes.replace(/\s+/g, " ").trim();
                  const isNotesLong = notesPreviewFull.length > notesPreviewLimit;
                  const notesPreview = isNotesLong
                    ? `${notesPreviewFull.slice(0, notesPreviewLimit)}…`
                    : notesPreviewFull;
                  const isNotesExpandable = isNotesLong || notes.includes("\n");

                  return (
                    <tr
                      key={item.id}
                      className={cx(
                        "border-b hover:bg-muted/40",
                        checked && "bg-muted/30"
                      )}
                    >
                      <td className={cx(isCompact ? "px-2 py-1.5" : "px-3 py-2", "align-top")}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelected(item.id)}
                        />
                      </td>
                      <td
                        className={cx(
                          isCompact ? "px-2 py-1.5" : "px-3 py-2",
                          "align-top font-medium"
                        )}
                      >
                        {item.procedure}
                      </td>

                      <td className={cx(isCompact ? "px-2 py-1.5" : "px-3 py-2", "align-top")}>
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => toggleSelected(item.id)}
                        >
                          <div className="font-medium wrap-break-words">{item.implant}</div>
                          {item.vendor && (
                            <div className="text-xs text-muted-foreground wrap-break-words">
                              {item.vendor}
                            </div>
                          )}
                        </button>
                      </td>

                      <td
                        className={cx(
                          isCompact ? "hidden lg:table-cell px-2 py-1.5" : "px-3 py-2",
                          "align-top wrap-break-words"
                        )}
                      >
                        {item.component ?? "-"}
                      </td>

                      <td className={cx(isCompact ? "px-2 py-1.5" : "px-3 py-2", "align-top wrap-break-words")}>
                        {item.material}
                      </td>

                      <td className={cx(isCompact ? "px-2 py-1.5" : "px-3 py-2", "align-top")}>
                        {!notes ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className={cx(isCompact ? "hidden 2xl:block min-w-0 flex-1" : "min-w-0 flex-1")}>
                              <div className="line-clamp-2 text-xs text-foreground/80 wrap-break-words">
                                {notesPreview}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Copy notes"
                              onClick={() => void copyText(notes, "Notes copied")}
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">Copy notes</span>
                            </Button>
                            {isNotesExpandable && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Baca lebih"
                                onClick={() => setNotesDialogId(item.id)}
                              >
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Baca lebih</span>
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td className="px-3 py-6 text-center text-muted-foreground" colSpan={6}>
                      Tidak ada data. Isi `src/lib/implantMaterials.ts`.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* SUMMARY (collapsible biar nggak makan tinggi) */}
      <Card className="py-0 gap-0">
        <div className="p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Paste hasilnya ke field implant/material di form.
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={copyNotes} disabled={!notesText}>
                Copy Notes
              </Button>
              <Button type="button" onClick={copySummary} disabled={!summary}>
                Copy Summary
              </Button>
            </div>
          </div>

          <Separator />

          <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">
                Summary {summary ? <span className="text-muted-foreground">({selectedItems.length})</span> : ""}
              </div>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={!summary}>
                  {summaryOpen ? "Hide" : "Show"}
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent>
              {summary ? (
                <pre className="mt-2 max-h-44 overflow-auto rounded-md bg-muted/40 p-2 text-xs whitespace-pre-wrap">
                  {summary}
                </pre>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">
                  Belum ada yang dipilih.
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </Card>

      {/* NOTES DIALOG */}
      <Dialog open={Boolean(notesDialogId)} onOpenChange={(open) => !open && setNotesDialogId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notes</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">{notesDialogMeta}</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!notesDialogText}
              onClick={() => void copyText(notesDialogText, "Notes copied")}
            >
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
            {notesDialogText || "-"}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OperasiMaterialsPanel({
  formUrl = DEFAULT_FORM_URL,
  layout = "split",
}: {
  formUrl?: string;
  layout?: "split" | "stacked";
}) {
  const [iframeKey, setIframeKey] = useState(0);
  const [mobileView, setMobileView] = useState<"materials" | "form">("materials");
  const { embedUrl, openUrl } = useMemo(() => normalizeGoogleFormUrl(formUrl), [formUrl]);

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile switch */}
      <div className={cx("flex items-center gap-2 md:hidden", layout === "stacked" && "hidden")}>
        <Button
          type="button"
          size="sm"
          variant={mobileView === "materials" ? "default" : "outline"}
          onClick={() => setMobileView("materials")}
          className="flex-1"
        >
          Materials
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mobileView === "form" ? "default" : "outline"}
          onClick={() => setMobileView("form")}
          className="flex-1"
        >
          Form
        </Button>
      </div>

      {layout === "stacked" ? (
        <div className="flex flex-col gap-4 md:h-[calc(10s0vh-88px)] md:min-h-[640px] ">
          <div className="min-h-0 md:h-[420px] md:overflow-hidden">
            <OperasiMaterialsList />
          </div>

          <Card className="flex-1 min-h-0 py-1  gap-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
              <div className="text-sm font-semibold">Google Form</div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIframeKey((k) => k + 1)}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reload
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openSingleGoogleFormWindow(openUrl)}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 ">
              <iframe
                key={iframeKey}
                title="Google Form Operasi"
                src={embedUrl}
                className="h-full w-full "
              />
            </div>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row md:flex-nowrap md:h-[calc(100vh-220px)] md:min-h-[640px]">
          <div
            className={cx(
              "min-h-0 w-full md:flex-[0_1_300px] lg:flex-[0_1_340px] md:min-w-60 md:overflow-hidden",
              mobileView !== "materials" && "hidden md:block"
            )}
          >
            <OperasiMaterialsList />
          </div>

          <div
            className={cx(
              "flex-1 min-w-0 min-h-0 md:min-w-[420px]",
              mobileView !== "form" && "hidden md:block"
            )}
          >
            <Card className="h-[calc(100svh-88px)] min-h-[520px] md:h-full md:min-h-0 py-0 gap-0 overflow-hidden ">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <div className="text-sm font-semibold">Google Form</div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setIframeKey((k) => k + 1)}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reload
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openSingleGoogleFormWindow(openUrl)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-h-0 ">
                <iframe
                  key={iframeKey}
                  title="Google Form Operasi"
                  src={embedUrl}
                  className="h-full w-full"
                />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
