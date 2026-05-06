"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FilePlus2,
  Loader2,
  Printer,
  RefreshCw,
  Trash2,
  Download,
  Wifi,
  WifiOff,
  Plus,
  Save,
  Copy,
  Eraser,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DRAFT_STORAGE_KEY = "implant-thr:editor:draft:v1";
const EXPORT_DB_NAME = "implant-thr-offline-db";
const EXPORT_STORE_NAME = "pdf-exports";

type ChecklistRow = {
  id: string;
  no: string;
  refNumber: string;
  description: string;
  batchNo: string;
  qtyIn: number;
  qtyOut: number;
  balance: number;
  note: string;
};

type HandoverRow = {
  id: string;
  no: string;
  instrument: string;
  qty: number;
  condition: string;
  note: string;
};

type SignerField =
  | "checker1"
  | "checker2"
  | "acknowledged"
  | "receiverTop"
  | "receiverBottom";
type ReceiverSignerField = "receiverTop" | "receiverBottom";
type LegacySignerField = "prepared" | "checked" | "approved" | "receiver";
type PersistedSignerField = SignerField | LegacySignerField;

type SignerData = {
  name: string;
  signatureDataUrl: string;
};

const SIGNER_LABELS: Record<SignerField, string> = {
  checker1: "Checker I",
  checker2: "Checker II",
  acknowledged: "Mengetahui",
  receiverTop: "Penerima",
  receiverBottom: "Penerima",
};

type ChecklistDocument = {
  id: string;
  title: string;
  hospital: string;
  scope: string;
  documentNo: string;
  date: string;
  period: string;
  logoLeftUrl: string;
  logoRightUrl: string;
  checklistRows: ChecklistRow[];
  handoverRows: HandoverRow[];
  signers: Record<SignerField, SignerData>;
};

type PersistedDocument = Omit<ChecklistDocument, "signers"> & {
  signers?: Partial<Record<PersistedSignerField, SignerData>>;
};

type ApiDocument = {
  id?: string;
  title?: string;
  profile?: Partial<{
    title: string;
    hospital: string;
    scope: string;
    documentNo: string;
    date: string;
    period: string;
    preparedBy: string;
    checkedBy: string;
    approvedBy: string;
    logoLeftUrl: string;
    logoRightUrl: string;
  }>;
  checklistRows?: Array<Record<string, unknown>>;
  handoverRows?: Array<Record<string, unknown>>;
};

type SheetPayload = {
  success: boolean;
  generatedAt: string;
  profile?: Partial<{
    title: string;
    hospital: string;
    scope: string;
    documentNo: string;
    date: string;
    period: string;
    preparedBy: string;
    checkedBy: string;
    approvedBy: string;
    logoLeftUrl: string;
    logoRightUrl: string;
  }>;
  checklistRows?: Array<Record<string, unknown>>;
  handoverRows?: Array<Record<string, unknown>>;
  documents?: ApiDocument[];
  summary?: {
    totalRows: number;
    totalQtyIn: number;
    totalQtyOut: number;
    totalBalance: number;
  };
};

type ExportRecord = {
  id: string;
  filename: string;
  createdAt: string;
  blob: Blob;
};

type InstrumentOption = {
  instrument: string;
  qty: number;
  condition: string;
  note: string;
};

const toMonthInputValue = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatNumber = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number.isFinite(Number(value)) ? Number(value) : 0
  );

const parseNumber = (value: string) => {
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const textSafe = (value: unknown) => (value === null || value === undefined ? "" : String(value));

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const inferActionLabel = (doc: ChecklistDocument, index: number) => {
  const source = `${textSafe(doc.title)} ${textSafe(doc.id)}`.toUpperCase();
  if (source.includes("BIPOLAR")) return "BIPOLAR";
  if (source.includes("TKR")) return "TKR";
  if (source.includes("THR")) return "THR";
  return `TINDAKAN ${index + 1}`;
};

const normalizeChecklistRow = (raw: Record<string, unknown>, index: number): ChecklistRow => ({
  id: uid(),
  no: textSafe(raw.no || index + 1),
  refNumber: textSafe(raw.refNumber || raw.ref || raw.code),
  description: textSafe(raw.description || raw.item || raw.namaBarang),
  batchNo: textSafe(raw.batchNo || raw.batch || raw.lot),
  qtyIn: parseNumber(textSafe(raw.qtyIn || raw.masuk)),
  qtyOut: parseNumber(textSafe(raw.qtyOut || raw.keluar)),
  balance: parseNumber(textSafe(raw.balance || raw.sisa || raw.stock)),
  note: textSafe(raw.note || raw.keterangan),
});

const normalizeHandoverRow = (raw: Record<string, unknown>, index: number): HandoverRow => ({
  id: uid(),
  no: textSafe(raw.no || index + 1),
  instrument: textSafe(raw.instrument || raw.nama || raw.name),
  qty: parseNumber(textSafe(raw.qty || raw.jumlah)),
  condition: textSafe(raw.condition || raw.kondisi),
  note: textSafe(raw.note || raw.keterangan),
});

const emptyChecklistRow = (index: number): ChecklistRow => ({
  id: uid(),
  no: String(index + 1),
  refNumber: "",
  description: "",
  batchNo: "",
  qtyIn: 0,
  qtyOut: 0,
  balance: 0,
  note: "",
});

const emptyHandoverRow = (index: number): HandoverRow => ({
  id: uid(),
  no: String(index + 1),
  instrument: "",
  qty: 0,
  condition: "",
  note: "",
});

const createDocumentFromApi = (
  payload: SheetPayload,
  document: ApiDocument | null,
  period: string
): ChecklistDocument => {
  const profile = {
    ...(payload.profile || {}),
    ...((document && document.profile) || {}),
  };

  const rawChecklist =
    Array.isArray(document?.checklistRows) && document.checklistRows.length > 0
      ? document.checklistRows
      : Array.isArray(payload.checklistRows)
        ? payload.checklistRows
        : [];

  const rawHandover =
    Array.isArray(document?.handoverRows) && document.handoverRows.length > 0
      ? document.handoverRows
      : Array.isArray(payload.handoverRows)
        ? payload.handoverRows
        : [];

  const checklistRows = rawChecklist.map((row, idx) =>
    normalizeChecklistRow((row || {}) as Record<string, unknown>, idx)
  );

  const handoverRows = rawHandover.map((row, idx) =>
    normalizeHandoverRow((row || {}) as Record<string, unknown>, idx)
  );

  return {
    id: document?.id || uid(),
    title: textSafe(document?.title || profile.title || "CHECK LIST IMPLANT THR"),
    hospital: textSafe(profile.hospital),
    scope: textSafe(profile.scope),
    documentNo: textSafe(profile.documentNo),
    date: textSafe(profile.date),
    period: textSafe(profile.period) || period,
    logoLeftUrl: textSafe(profile.logoLeftUrl),
    logoRightUrl: textSafe(profile.logoRightUrl),
    checklistRows,
    handoverRows,
    signers: {
      checker1: {
        name: textSafe(profile.preparedBy),
        signatureDataUrl: "",
      },
      checker2: {
        name: textSafe(profile.checkedBy),
        signatureDataUrl: "",
      },
      acknowledged: {
        name: textSafe(profile.approvedBy),
        signatureDataUrl: "",
      },
      receiverTop: {
        name: "",
        signatureDataUrl: "",
      },
      receiverBottom: {
        name: "",
        signatureDataUrl: "",
      },
    },
  };
};

const createBlankDocument = (period: string): ChecklistDocument => ({
  id: uid(),
  title: "CHECK LIST IMPLANT THR",
  hospital: "",
  scope: "",
  documentNo: "",
  date: new Date().toISOString().split("T")[0],
  period,
  logoLeftUrl: "",
  logoRightUrl: "",
  checklistRows: Array.from({ length: 8 }).map((_, idx) => emptyChecklistRow(idx)),
  handoverRows: Array.from({ length: 4 }).map((_, idx) => emptyHandoverRow(idx)),
  signers: {
    checker1: { name: "", signatureDataUrl: "" },
    checker2: { name: "", signatureDataUrl: "" },
    acknowledged: { name: "", signatureDataUrl: "" },
    receiverTop: { name: "", signatureDataUrl: "" },
    receiverBottom: { name: "", signatureDataUrl: "" },
  },
});

const openExportDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(EXPORT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(EXPORT_STORE_NAME)) {
        db.createObjectStore(EXPORT_STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const saveExportToDb = async (record: ExportRecord) => {
  const db = await openExportDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(EXPORT_STORE_NAME, "readwrite");
    tx.objectStore(EXPORT_STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

const listExportsFromDb = async (): Promise<ExportRecord[]> => {
  const db = await openExportDb();
  const rows = await new Promise<ExportRecord[]>((resolve, reject) => {
    const tx = db.transaction(EXPORT_STORE_NAME, "readonly");
    const req = tx.objectStore(EXPORT_STORE_NAME).getAll();
    req.onsuccess = () => resolve((req.result || []) as ExportRecord[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
};

const deleteExportFromDb = async (id: string) => {
  const db = await openExportDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(EXPORT_STORE_NAME, "readwrite");
    tx.objectStore(EXPORT_STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
};

type SignaturePadProps = {
  value: string;
  onChange: (nextDataUrl: string) => void;
};

function SignaturePad({ value, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";

    ctx.clearRect(0, 0, width, height);

    if (value) {
      const image = new window.Image();
      image.onload = () => {
        ctx.drawImage(image, 0, 0, width, height);
      };
      image.src = value;
    }
  }, [value]);

  const pointFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const point = pointFromEvent(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setIsDrawing(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const point = pointFromEvent(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const finish = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="h-24 w-full rounded border border-gray-300 bg-white"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finish}
        onPointerLeave={finish}
        onPointerCancel={finish}
      />
      <Button type="button" variant="outline" size="sm" onClick={clear} className="print:hidden">
        <Eraser className="mr-2 h-4 w-4" />
        Hapus TTD
      </Button>
    </div>
  );
}

export default function CheckListImplantThrPage() {
  const [period, setPeriod] = useState(toMonthInputValue());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ChecklistDocument[]>([]);
  const [activeDocumentId, setActiveDocumentId] = useState<string>("");
  const [isOnline, setIsOnline] = useState(true);
  const [exportCache, setExportCache] = useState<ExportRecord[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const activeDocument = useMemo(
    () => documents.find((doc) => doc.id === activeDocumentId) || null,
    [documents, activeDocumentId]
  );

  const actionOptions = useMemo(
    () =>
      documents.map((doc, index) => ({
        id: doc.id,
        label: inferActionLabel(doc, index),
        title: doc.title || "Checklist",
      })),
    [documents]
  );

  const instrumentOptionsByDoc = useMemo(() => {
    const output: Record<string, InstrumentOption[]> = {};
    documents.forEach((doc) => {
      const map = new Map<string, InstrumentOption>();
      doc.handoverRows.forEach((row) => {
        const key = textSafe(row.instrument);
        if (!key || map.has(key)) return;
        map.set(key, {
          instrument: key,
          qty: Number(row.qty || 0),
          condition: textSafe(row.condition),
          note: textSafe(row.note),
        });
      });
      output[doc.id] = Array.from(map.values());
    });
    return output;
  }, [documents]);

  const activeInstrumentOptions = useMemo(
    () => (activeDocument ? instrumentOptionsByDoc[activeDocument.id] || [] : []),
    [activeDocument, instrumentOptionsByDoc]
  );

  const refreshCachedExports = useCallback(async () => {
    try {
      const rows = await listExportsFromDb();
      setExportCache(rows);
    } catch {
      // ignore
    }
  }, []);

  const persistDraftToLocal = useCallback((nextDocs: ChecklistDocument[]) => {
    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          savedAt: new Date().toISOString(),
          period,
          documents: nextDocs,
          activeDocumentId,
        })
      );
    } catch {
      // ignore
    }
  }, [period, activeDocumentId]);

  const updateDocuments = useCallback(
    (producer: (prev: ChecklistDocument[]) => ChecklistDocument[]) => {
      setDocuments((prev) => {
        const next = producer(prev);
        persistDraftToLocal(next);
        return next;
      });
    },
    [persistDraftToLocal]
  );

  const fetchDataFromApi = useCallback(async (periodValue: string) => {
    const targetPeriod = periodValue || toMonthInputValue();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/implant-thr?source=published&period=${encodeURIComponent(targetPeriod)}`,
        {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as SheetPayload & { error?: string };
      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || "Gagal memuat data dari API");
      }

      const docs = Array.isArray(payload.documents) && payload.documents.length > 0
        ? payload.documents.map((doc) => createDocumentFromApi(payload, doc, targetPeriod))
        : [createDocumentFromApi(payload, null, targetPeriod)];

      setPeriod(targetPeriod);
      setDocuments(docs);
      setActiveDocumentId(docs[0]?.id || "");

      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            savedAt: new Date().toISOString(),
            period: targetPeriod,
            documents: docs,
            activeDocumentId: docs[0]?.id || "",
          })
        );
      } catch {
        // ignore
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengambil data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(window.navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const fallbackPeriod = toMonthInputValue();
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) {
        const blank = createBlankDocument(fallbackPeriod);
        setDocuments([blank]);
        setActiveDocumentId(blank.id);
        if (window.navigator.onLine) {
          void fetchDataFromApi(fallbackPeriod);
        }
        return;
      }
      const parsed = JSON.parse(raw) as {
        period?: string;
        documents?: PersistedDocument[];
        activeDocumentId?: string;
      };

      const docs = Array.isArray(parsed.documents)
        ? parsed.documents.map((doc) => ({
            ...doc,
            id: doc.id || uid(),
            checklistRows: Array.isArray(doc.checklistRows)
              ? doc.checklistRows.map((row, idx) => ({ ...row, id: row.id || uid(), no: textSafe(row.no || idx + 1) }))
              : [],
            handoverRows: Array.isArray(doc.handoverRows)
              ? doc.handoverRows.map((row, idx) => ({ ...row, id: row.id || uid(), no: textSafe(row.no || idx + 1) }))
              : [],
            signers: {
              checker1: {
                name: textSafe(doc.signers?.checker1?.name || doc.signers?.prepared?.name),
                signatureDataUrl: textSafe(
                  doc.signers?.checker1?.signatureDataUrl ||
                    doc.signers?.prepared?.signatureDataUrl
                ),
              },
              checker2: {
                name: textSafe(doc.signers?.checker2?.name || doc.signers?.checked?.name),
                signatureDataUrl: textSafe(
                  doc.signers?.checker2?.signatureDataUrl ||
                    doc.signers?.checked?.signatureDataUrl
                ),
              },
              acknowledged: {
                name: textSafe(
                  doc.signers?.acknowledged?.name || doc.signers?.approved?.name
                ),
                signatureDataUrl: textSafe(
                  doc.signers?.acknowledged?.signatureDataUrl ||
                    doc.signers?.approved?.signatureDataUrl
                ),
              },
              receiverTop: {
                name: textSafe(
                  doc.signers?.receiverTop?.name || doc.signers?.receiver?.name
                ),
                signatureDataUrl: textSafe(
                  doc.signers?.receiverTop?.signatureDataUrl ||
                    doc.signers?.receiver?.signatureDataUrl
                ),
              },
              receiverBottom: {
                name: textSafe(
                  doc.signers?.receiverBottom?.name || doc.signers?.receiver?.name
                ),
                signatureDataUrl: textSafe(
                  doc.signers?.receiverBottom?.signatureDataUrl ||
                    doc.signers?.receiver?.signatureDataUrl
                ),
              },
            },
          }))
        : [];

      const initialPeriod = parsed.period || fallbackPeriod;

      if (docs.length === 0) {
        const blank = createBlankDocument(initialPeriod);
        setDocuments([blank]);
        setActiveDocumentId(blank.id);
      } else {
        setPeriod(initialPeriod);
        setDocuments(docs);
        setActiveDocumentId(
          docs.some((doc) => doc.id === parsed.activeDocumentId)
            ? textSafe(parsed.activeDocumentId)
            : docs[0].id
        );
      }

      if (window.navigator.onLine) {
        void fetchDataFromApi(initialPeriod);
      }
    } catch {
      const blank = createBlankDocument(fallbackPeriod);
      setDocuments([blank]);
      setActiveDocumentId(blank.id);
      if (window.navigator.onLine) {
        void fetchDataFromApi(fallbackPeriod);
      }
    }
  }, [fetchDataFromApi]);

  useEffect(() => {
    void refreshCachedExports();
  }, [refreshCachedExports]);

  const summary = useMemo(() => {
    if (!activeDocument) {
      return { totalRows: 0, totalQtyIn: 0, totalQtyOut: 0, totalBalance: 0 };
    }
    return activeDocument.checklistRows.reduce(
      (acc, row) => {
        acc.totalRows += 1;
        acc.totalQtyIn += Number(row.qtyIn || 0);
        acc.totalQtyOut += Number(row.qtyOut || 0);
        acc.totalBalance += Number(row.balance || 0);
        return acc;
      },
      { totalRows: 0, totalQtyIn: 0, totalQtyOut: 0, totalBalance: 0 }
    );
  }, [activeDocument]);

  const updateActiveDoc = useCallback(
    (producer: (doc: ChecklistDocument) => ChecklistDocument) => {
      if (!activeDocument) return;
      updateDocuments((prev) =>
        prev.map((doc) => (doc.id === activeDocument.id ? producer(doc) : doc))
      );
    },
    [activeDocument, updateDocuments]
  );

  const renderSignatureSection = (
    leftTitle: string,
    rightTitle: string,
    receiverField: ReceiverSignerField
  ) => {
    if (!activeDocument) return null;

    const renderSignerCard = (field: SignerField) => (
      <div className="space-y-1">
        <p className="text-center text-[10px] font-medium">{SIGNER_LABELS[field]}</p>
        <SignaturePad
          value={activeDocument.signers[field].signatureDataUrl}
          onChange={(nextDataUrl) =>
            updateActiveDoc((doc) => ({
              ...doc,
              signers: {
                ...doc.signers,
                [field]: {
                  ...doc.signers[field],
                  signatureDataUrl: nextDataUrl,
                },
              },
            }))
          }
        />
        <Input
          placeholder="Nama"
          value={activeDocument.signers[field].name}
          onChange={(e) =>
            updateActiveDoc((doc) => ({
              ...doc,
              signers: {
                ...doc.signers,
                [field]: {
                  ...doc.signers[field],
                  name: e.target.value,
                },
              },
            }))
          }
          className="h-8 border-gray-300 text-[10px]"
        />
        <p className="text-center text-[10px] text-gray-500">(................................)</p>
      </div>
    );

    return (
      <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-2">
          <p className="text-center text-[10px]">{leftTitle}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {renderSignerCard("checker1")}
            {renderSignerCard("checker2")}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-center text-[10px]">mengetahui,</p>
          {renderSignerCard("acknowledged")}
        </div>
        <div className="space-y-2">
          <p className="text-center text-[10px]">{rightTitle}</p>
          {renderSignerCard(receiverField)}
        </div>
      </div>
    );
  };

  const addChecklistDocument = () => {
    const nextDoc = createBlankDocument(period);
    updateDocuments((prev) => [...prev, nextDoc]);
    setActiveDocumentId(nextDoc.id);
  };

  const duplicateChecklistDocument = () => {
    if (!activeDocument) return;
    const clone: ChecklistDocument = {
      ...activeDocument,
      id: uid(),
      title: `${activeDocument.title} (Copy)`,
      checklistRows: activeDocument.checklistRows.map((row, idx) => ({
        ...row,
        id: uid(),
        no: String(idx + 1),
      })),
      handoverRows: activeDocument.handoverRows.map((row, idx) => ({
        ...row,
        id: uid(),
        no: String(idx + 1),
      })),
    };

    updateDocuments((prev) => [...prev, clone]);
    setActiveDocumentId(clone.id);
  };

  const removeChecklistDocument = () => {
    if (!activeDocument) return;
    if (documents.length === 1) {
      const blank = createBlankDocument(period);
      setDocuments([blank]);
      setActiveDocumentId(blank.id);
      persistDraftToLocal([blank]);
      return;
    }

    updateDocuments((prev) => prev.filter((doc) => doc.id !== activeDocument.id));
    const fallback = documents.find((doc) => doc.id !== activeDocument.id);
    setActiveDocumentId(fallback?.id || "");
  };

  const exportCurrentToPdf = async () => {
    if (!activeDocument || isExporting) return;
    setIsExporting(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const marginX = 10;
      const rightColX = 120;
      const pageHeight = doc.internal.pageSize.getHeight();
      const bottomMargin = 10;
      let cursorY = 12;

      const ensurePdfSpace = (startY: number, requiredHeight: number) => {
        if (startY + requiredHeight > pageHeight - bottomMargin) {
          doc.addPage();
          return 20;
        }
        return startY;
      };

      doc.setFontSize(12);
      doc.text(activeDocument.title || "CHECK LIST IMPLANT THR", 105, cursorY, {
        align: "center",
      });
      cursorY += 6;

      doc.setFontSize(9);
      doc.text(`Hospital: ${activeDocument.hospital || "-"}`, marginX, cursorY);
      doc.text(`Tanggal: ${activeDocument.date || "-"}`, rightColX, cursorY);
      cursorY += 5;
      doc.text(`Operator : ${activeDocument.scope || "-"}`, marginX, cursorY);
      doc.text(`Set : ${activeDocument.documentNo || "-"}`, rightColX, cursorY);
      cursorY += 5;
      doc.text(
        `Approved : ${activeDocument.signers.acknowledged.name || "-"}`,
        marginX,
        cursorY
      );
      cursorY += 3;

      const drawPdfSignatureSection = (
        startY: number,
        leftTitle: string,
        rightTitle: string,
        receiverField: ReceiverSignerField
      ) => {
        const y = ensurePdfSpace(startY, 30);

        doc.setFontSize(8);
        doc.text(leftTitle, 43, y, { align: "center" });
        doc.text("mengetahui,", 130, y, { align: "center" });
        doc.text(rightTitle, 176, y, { align: "center" });

        const signerSlots: Array<{ field: SignerField; label: string; x: number }> = [
          { field: "checker1", label: "checker I", x: 25 },
          { field: "checker2", label: "checker II", x: 62 },
          { field: "acknowledged", label: "mengetahui", x: 130 },
          { field: receiverField, label: "penerima", x: 176 },
        ];

        signerSlots.forEach((slot) => {
          const item = activeDocument.signers[slot.field];
          doc.setFontSize(8);
          doc.text(slot.label, slot.x, y + 5, { align: "center" });

          if (item.signatureDataUrl) {
            doc.addImage(item.signatureDataUrl, "PNG", slot.x - 15, y + 7, 30, 12);
          }

          doc.text(item.name || "(........................)", slot.x, y + 24, {
            align: "center",
          });
        });

        return y + 28;
      };

      autoTable(doc, {
        startY: cursorY,
        head: [["No", "REF", "Description", "Batch", "Masuk", "Keluar", "Sisa", "Note"]],
        body: [
          ...activeDocument.checklistRows.map((row, idx) => [
            row.no || idx + 1,
            row.refNumber,
            row.description,
            row.batchNo,
            formatNumber(row.qtyIn),
            formatNumber(row.qtyOut),
            formatNumber(row.balance),
            row.note,
          ]),
          [
            { content: "TOTAL", colSpan: 4, styles: { halign: "right", fontStyle: "bold" } },
            { content: formatNumber(summary.totalQtyIn), styles: { halign: "right", fontStyle: "bold" } },
            { content: formatNumber(summary.totalQtyOut), styles: { halign: "right", fontStyle: "bold" } },
            { content: formatNumber(summary.totalBalance), styles: { halign: "right", fontStyle: "bold" } },
            "",
          ],
        ],
        headStyles: { fillColor: [230, 230, 230], textColor: [30, 30, 30] },
        styles: {
          fontSize: 7,
          cellPadding: 1.4,
          overflow: "linebreak",
          valign: "middle",
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 24 },
          2: { cellWidth: 72 },
          3: { cellWidth: 20 },
          4: { cellWidth: 14, halign: "right" },
          5: { cellWidth: 14, halign: "right" },
          6: { cellWidth: 14, halign: "right" },
          7: { cellWidth: 22 },
        },
        margin: { left: marginX, right: marginX },
      });

      const checklistEndY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
        ?.finalY || 120;

      const afterChecklistSignY = drawPdfSignatureSection(
        checklistEndY + 6,
        "yang menyerahkan,",
        "yang menerima,",
        "receiverTop"
      );

      let handoverStartY = afterChecklistSignY + 6;
      handoverStartY = ensurePdfSpace(handoverStartY, 16);

      doc.setFontSize(10);
      doc.text("TANDA TERIMA INSTRUMENT", 105, handoverStartY, { align: "center" });

      autoTable(doc, {
        startY: handoverStartY + 3,
        head: [["No", "Nama Instrument", "Qty", "Kondisi", "Keterangan"]],
        body: activeDocument.handoverRows.map((row, idx) => [
          row.no || idx + 1,
          row.instrument,
          formatNumber(row.qty),
          row.condition,
          row.note,
        ]),
        headStyles: { fillColor: [230, 230, 230], textColor: [30, 30, 30] },
        styles: {
          fontSize: 7,
          cellPadding: 1.4,
          overflow: "linebreak",
          valign: "middle",
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 90 },
          2: { cellWidth: 14, halign: "right" },
          3: { cellWidth: 34 },
          4: { cellWidth: 42 },
        },
        margin: { left: marginX, right: marginX },
      });

      const handoverEndY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
        ?.finalY || handoverStartY + 20;
      drawPdfSignatureSection(
        handoverEndY + 6,
        "Pengirim,",
        "Penerima,",
        "receiverBottom"
      );

      const safeTitle = (activeDocument.title || "checklist").replace(/[^a-z0-9]+/gi, "-");
      const filename = `${safeTitle}_${activeDocument.period || period}_${Date.now()}.pdf`;
      const blob = doc.output("blob");
      doc.save(filename);

      await saveExportToDb({
        id: uid(),
        filename,
        createdAt: new Date().toISOString(),
        blob,
      });
      await refreshCachedExports();
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCachedExport = (item: ExportRecord) => {
    const url = URL.createObjectURL(item.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = item.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-[180px] border-white/20 bg-black/20 text-white"
          />
          <Button
            type="button"
            onClick={() => void fetchDataFromApi(period)}
            disabled={isLoading}
            className="bg-cyan-600 text-white hover:bg-cyan-700"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Muat Data Sheet
          </Button>

          <Button type="button" variant="outline" onClick={addChecklistDocument}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            Tambah Checklist
          </Button>

          <Button type="button" variant="outline" onClick={duplicateChecklistDocument}>
            <Copy className="mr-2 h-4 w-4" />
            Duplikat
          </Button>

          <Button type="button" variant="outline" onClick={removeChecklistDocument}>
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus Checklist
          </Button>

          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Cetak
          </Button>

          <Button
            type="button"
            onClick={exportCurrentToPdf}
            disabled={!activeDocument || isExporting}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Export PDF + Simpan Offline
          </Button>

          <span className="ml-auto inline-flex items-center rounded-full border border-white/20 px-3 py-1 text-xs">
            {isOnline ? (
              <>
                <Wifi className="mr-1.5 h-3.5 w-3.5 text-emerald-300" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="mr-1.5 h-3.5 w-3.5 text-amber-300" />
                Offline (draft tetap tersimpan lokal)
              </>
            )}
          </span>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-300">Error: {error}</p> : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 print:hidden">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[220px_1fr] sm:items-center">
          <label className="text-xs font-semibold text-white/80">Pilih Tindakan</label>
          <div className="flex items-center gap-2">
            <select
              value={activeDocumentId}
              onChange={(event) => setActiveDocumentId(event.target.value)}
              className="h-9 min-w-[220px] rounded-md border border-white/20 bg-black/30 px-2 text-sm text-white outline-none focus:border-cyan-400"
            >
              {actionOptions.map((option) => (
                <option key={option.id} value={option.id} className="text-black">
                  {option.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-white/60">
              {activeDocument ? activeDocument.title : "-"}
            </span>
          </div>
        </div>
      </div>

      <section className="mx-auto w-full max-w-[1100px] rounded-xl bg-white p-5 text-black shadow-2xl print:max-w-none print:rounded-none print:p-4 print:shadow-none">
        {!activeDocument ? (
          <p className="text-sm text-gray-600">Belum ada dokumen checklist.</p>
        ) : (
          <div className="space-y-5 text-[11px]">
            <header className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Input
                  value={activeDocument.title}
                  onChange={(e) =>
                    updateActiveDoc((doc) => ({ ...doc, title: e.target.value }))
                  }
                  className="w-[360px] border-gray-300 bg-white text-[13px] font-semibold"
                />
                <p className="text-[10px] text-gray-600">
                  Approved : {activeDocument.signers.acknowledged.name || "-"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <p className="text-[10px] font-semibold text-gray-700">Rumah Sakit</p>
                  <Input
                    value={activeDocument.hospital}
                    onChange={(e) => updateActiveDoc((doc) => ({ ...doc, hospital: e.target.value }))}
                    className="h-8 border-gray-300 bg-white"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-700">Operator :</p>
                  <Input
                    value={activeDocument.scope}
                    onChange={(e) => updateActiveDoc((doc) => ({ ...doc, scope: e.target.value }))}
                    className="h-8 border-gray-300 bg-white"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-700">Set :</p>
                  <Input
                    value={activeDocument.documentNo}
                    onChange={(e) => updateActiveDoc((doc) => ({ ...doc, documentNo: e.target.value }))}
                    className="h-8 border-gray-300 bg-white"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-700">Approved :</p>
                  <Input
                    value={activeDocument.signers.acknowledged.name}
                    onChange={(e) =>
                      updateActiveDoc((doc) => ({
                        ...doc,
                        signers: {
                          ...doc.signers,
                          acknowledged: {
                            ...doc.signers.acknowledged,
                            name: e.target.value,
                          },
                        },
                      }))
                    }
                    className="h-8 border-gray-300 bg-white"
                  />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-700">Tanggal</p>
                  <Input
                    type="date"
                    value={activeDocument.date}
                    onChange={(e) => updateActiveDoc((doc) => ({ ...doc, date: e.target.value }))}
                    className="h-8 border-gray-300 bg-white"
                  />
                </div>
              </div>
            </header>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-bold">CHECKLIST IMPLANT</h2>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateActiveDoc((doc) => ({
                      ...doc,
                      checklistRows: [...doc.checklistRows, emptyChecklistRow(doc.checklistRows.length)],
                    }))
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Baris
                </Button>
              </div>

              <div className="overflow-x-auto rounded border border-gray-400">
                <table className="w-max border-collapse text-[9px] table-auto">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="w-[6ch] whitespace-nowrap border border-gray-300 px-1 py-1 text-center">No</th>
                      <th className="min-w-[16ch] whitespace-nowrap border border-gray-300 px-1 py-1">REF</th>
                      <th className="min-w-[44ch] border border-gray-300 px-1 py-1">Description</th>
                      <th className="min-w-[14ch] whitespace-nowrap border border-gray-300 px-1 py-1">Batch</th>
                      <th className="w-[7ch] whitespace-nowrap border border-gray-300 px-1 py-1 text-right">Masuk</th>
                      <th className="w-[7ch] whitespace-nowrap border border-gray-300 px-1 py-1 text-right">Keluar</th>
                      <th className="w-[7ch] whitespace-nowrap border border-gray-300 px-1 py-1 text-right">Sisa</th>
                      <th className="min-w-[16ch] border border-gray-300 px-1 py-1">Note</th>
                      <th className="w-[6ch] whitespace-nowrap border border-gray-300 px-1 py-1 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDocument.checklistRows.map((row) => (
                      <tr key={row.id}>
                        <td className="border border-gray-300 p-0.5">
                          <Input
                            value={row.no}
                            onChange={(e) =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                checklistRows: doc.checklistRows.map((item) =>
                                  item.id === row.id ? { ...item, no: e.target.value } : item
                                ),
                              }))
                            }
                            className="h-7 w-[6ch] border-0 px-1 text-center text-[9px]"
                          />
                        </td>
                        <td className="border border-gray-300 p-0.5">
                          <Input
                            value={row.refNumber}
                            onChange={(e) =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                checklistRows: doc.checklistRows.map((item) =>
                                  item.id === row.id ? { ...item, refNumber: e.target.value } : item
                                ),
                              }))
                            }
                            className="h-7 w-full border-0 px-1 text-[9px]"
                          />
                        </td>
                        <td className="border border-gray-300 p-0.5">
                          <Input
                            value={row.description}
                            onChange={(e) =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                checklistRows: doc.checklistRows.map((item) =>
                                  item.id === row.id ? { ...item, description: e.target.value } : item
                                ),
                              }))
                            }
                            className="h-7 w-full border-0 px-1 text-[9px]"
                          />
                        </td>
                        <td className="border border-gray-300 p-0.5">
                          <Input
                            value={row.batchNo}
                            onChange={(e) =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                checklistRows: doc.checklistRows.map((item) =>
                                  item.id === row.id ? { ...item, batchNo: e.target.value } : item
                                ),
                              }))
                            }
                            className="h-7 w-full border-0 px-1 text-[9px]"
                          />
                        </td>
                        <td className="border border-gray-300 p-0.5">
                          <Input
                            type="number"
                            value={String(row.qtyIn)}
                            onChange={(e) =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                checklistRows: doc.checklistRows.map((item) =>
                                  item.id === row.id ? { ...item, qtyIn: parseNumber(e.target.value) } : item
                                ),
                              }))
                            }
                            className="h-7 w-[7ch] border-0 px-1 text-right text-[9px]"
                          />
                        </td>
                        <td className="border border-gray-300 p-0.5">
                          <Input
                            type="number"
                            value={String(row.qtyOut)}
                            onChange={(e) =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                checklistRows: doc.checklistRows.map((item) =>
                                  item.id === row.id ? { ...item, qtyOut: parseNumber(e.target.value) } : item
                                ),
                              }))
                            }
                            className="h-7 w-[7ch] border-0 px-1 text-right text-[9px]"
                          />
                        </td>
                        <td className="border border-gray-300 p-0.5">
                          <Input
                            type="number"
                            value={String(row.balance)}
                            onChange={(e) =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                checklistRows: doc.checklistRows.map((item) =>
                                  item.id === row.id ? { ...item, balance: parseNumber(e.target.value) } : item
                                ),
                              }))
                            }
                            className="h-7 w-[7ch] border-0 px-1 text-right text-[9px]"
                          />
                        </td>
                        <td className="border border-gray-300 p-0.5">
                          <Input
                            value={row.note}
                            onChange={(e) =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                checklistRows: doc.checklistRows.map((item) =>
                                  item.id === row.id ? { ...item, note: e.target.value } : item
                                ),
                              }))
                            }
                            className="h-7 w-full border-0 px-1 text-[9px]"
                          />
                        </td>
                        <td className="border border-gray-300 p-0.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                checklistRows: doc.checklistRows
                                  .filter((item) => item.id !== row.id)
                                  .map((item, rowIndex) => ({
                                    ...item,
                                    no: String(rowIndex + 1),
                                  })),
                              }))
                            }
                            className="h-6 w-6 text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 font-semibold">
                      <td className="border border-gray-300 px-1 py-1 text-right" colSpan={4}>
                        TOTAL
                      </td>
                      <td className="border border-gray-300 px-1 py-1 text-right">{formatNumber(summary.totalQtyIn)}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right">{formatNumber(summary.totalQtyOut)}</td>
                      <td className="border border-gray-300 px-1 py-1 text-right">{formatNumber(summary.totalBalance)}</td>
                      <td className="border border-gray-300 px-1 py-1" />
                      <td className="border border-gray-300 px-1 py-1" />
                    </tr>
                  </tbody>
                </table>
              </div>
              {renderSignatureSection(
                "yang menyerahkan,",
                "yang menerima,",
                "receiverTop"
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[12px] font-bold">SHEET TANDA TERIMA INSTRUMENT</h2>
                  <p className="text-[10px] text-gray-500">
                    Dropdown instrument otomatis menyesuaikan tindakan yang dipilih.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateActiveDoc((doc) => ({
                      ...doc,
                      handoverRows: [...doc.handoverRows, emptyHandoverRow(doc.handoverRows.length)],
                    }))
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Baris
                </Button>
              </div>

              <div className="overflow-x-auto rounded border border-gray-400">
                <table className="w-max border-collapse text-[9px] table-auto">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="w-[6ch] whitespace-nowrap border border-gray-300 px-1 py-1 text-center">No</th>
                      <th className="min-w-[220px] border border-gray-300 px-1 py-1">Nama Instrument</th>
                      <th className="min-w-16 whitespace-nowrap border border-gray-300 px-1 py-1 text-right">Qty</th>
                      <th className="min-w-24 border border-gray-300 px-1 py-1">Kondisi</th>
                      <th className="min-w-[120px] border border-gray-300 px-1 py-1">Keterangan</th>
                      <th className="min-w-12 whitespace-nowrap border border-gray-300 px-1 py-1 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeDocument.handoverRows.length === 0 ? (
                      <tr>
                        <td className="border border-gray-300 px-2 py-2 text-center text-[10px] text-gray-500" colSpan={6}>
                          Data Tanda Terima belum ditemukan di Google Sheet.
                        </td>
                      </tr>
                    ) : null}
                    {activeDocument.handoverRows.map((row) => {
                      const hasCurrent = activeInstrumentOptions.some(
                        (item) => item.instrument === row.instrument
                      );
                      const rowInstrumentOptions = hasCurrent
                        ? activeInstrumentOptions
                        : row.instrument
                          ? [
                              ...activeInstrumentOptions,
                              {
                                instrument: row.instrument,
                                qty: Number(row.qty || 0),
                                condition: row.condition,
                                note: row.note,
                              },
                            ]
                          : activeInstrumentOptions;

                      return (
                      <tr key={row.id}>
                        <td className="border border-gray-300 p-0.5">
                          <Input
                            value={row.no}
                            onChange={(e) =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                handoverRows: doc.handoverRows.map((item) =>
                                  item.id === row.id ? { ...item, no: e.target.value } : item
                                ),
                              }))
                            }
                            className="h-7 w-[6ch] border-0 px-1 text-center text-[9px]"
                          />
                        </td>
                        <td className="border border-gray-300 p-0.5">
                          <select
                            value={row.instrument}
                            onChange={(e) => {
                              const selected = e.target.value;
                              const template = rowInstrumentOptions.find(
                                (item) => item.instrument === selected
                              );
                              updateActiveDoc((doc) => ({
                                ...doc,
                                handoverRows: doc.handoverRows.map((item) => {
                                  if (item.id !== row.id) return item;
                                  if (!template) {
                                    return { ...item, instrument: selected };
                                  }
                                  return {
                                    ...item,
                                    instrument: selected,
                                    qty: template.qty || item.qty,
                                    condition: template.condition || item.condition,
                                    note: template.note || item.note,
                                  };
                                }),
                              }));
                            }}
                            className="h-7 w-full rounded border-0 bg-white px-1 text-[9px] outline-none"
                          >
                            <option value="">Pilih Instrument</option>
                            {rowInstrumentOptions.map((option) => (
                              <option key={option.instrument} value={option.instrument}>
                                {option.instrument}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="border border-gray-300 p-0.5">
                          <Input
                            type="number"
                            value={String(row.qty)}
                            onChange={(e) =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                handoverRows: doc.handoverRows.map((item) =>
                                  item.id === row.id ? { ...item, qty: parseNumber(e.target.value) } : item
                                ),
                              }))
                            }
                            className="h-7 w-full border-0 px-1 text-right text-[9px]"
                          />
                        </td>
                        <td className="border border-gray-300 p-0.5">
                          <Input
                            value={row.condition}
                            onChange={(e) =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                handoverRows: doc.handoverRows.map((item) =>
                                  item.id === row.id ? { ...item, condition: e.target.value } : item
                                ),
                              }))
                            }
                            className="h-7 w-full border-0 px-1 text-[9px]"
                          />
                        </td>
                        <td className="border border-gray-300 p-0.5">
                          <Input
                            value={row.note}
                            onChange={(e) =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                handoverRows: doc.handoverRows.map((item) =>
                                  item.id === row.id ? { ...item, note: e.target.value } : item
                                ),
                              }))
                            }
                            className="h-7 w-full border-0 px-1 text-[9px]"
                          />
                        </td>
                        <td className="border border-gray-300 p-0.5 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              updateActiveDoc((doc) => ({
                                ...doc,
                                handoverRows: doc.handoverRows
                                  .filter((item) => item.id !== row.id)
                                  .map((item, rowIndex) => ({
                                    ...item,
                                    no: String(rowIndex + 1),
                                  })),
                              }))
                            }
                            className="h-6 w-6 text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
              {renderSignatureSection("Pengirim,", "Penerima,", "receiverBottom")}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 print:hidden">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Cache Export PDF (Offline)</h3>
          <span className="text-xs text-white/60">{exportCache.length} file</span>
        </div>
        {exportCache.length === 0 ? (
          <p className="text-xs text-white/60">Belum ada file PDF tersimpan sementara.</p>
        ) : (
          <div className="space-y-2">
            {exportCache.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded border border-white/10 bg-black/20 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-medium">{item.filename}</p>
                  <p className="text-[11px] text-white/60">
                    {new Date(item.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => downloadCachedExport(item)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Unduh
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await deleteExportFromDb(item.id);
                      await refreshCachedExports();
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
