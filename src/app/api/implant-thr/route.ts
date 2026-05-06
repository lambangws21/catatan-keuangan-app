import { NextResponse } from "next/server";

type ChecklistRow = {
  no: string;
  refNumber: string;
  description: string;
  batchNo: string;
  qtyIn: number;
  qtyOut: number;
  balance: number;
  note: string;
  implantType?: string;
};

type HandoverRow = {
  no: string;
  instrument: string;
  qty: number;
  condition: string;
  note: string;
  implantType?: string;
};

type ProfileData = {
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
};

type DocumentData = {
  id: string;
  title: string;
  profile: ProfileData;
  checklistRows: ChecklistRow[];
  handoverRows: HandoverRow[];
};

type RoutePayload = {
  success: boolean;
  generatedAt: string;
  profile: ProfileData;
  checklistRows: ChecklistRow[];
  handoverRows: HandoverRow[];
  documents: DocumentData[];
  summary: {
    totalRows: number;
    totalQtyIn: number;
    totalQtyOut: number;
    totalBalance: number;
  };
  source: "published" | "appscript";
};

type PublishedItem = {
  name: string;
  gid: string;
  pageUrl: string;
};

const DEFAULT_APP_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxAVWKIeohGdl_4KRiwlXWFuaVTF4EVkgGgVxrbOrq7YJXGbV6wU6mN8_qYkn_ZeDkm/exec";
const DEFAULT_PUBLISHED_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR-wcQVimh_G8eeFNLRu47sa_VGahTthd6hGv5JA9QLsTzMQPugk_el_-RubxPf_5nJtjNTQRakZhCL/pubhtml";

const toStringSafe = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeHeaderKey = (value: unknown) =>
  toStringSafe(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const parseCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
};

const toNumberSafe = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d.-]/g, "");
    if (!normalized) return 0;
    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const toNumberFromCandidates = (...values: unknown[]) => {
  for (const value of values) {
    const asText = toStringSafe(value);
    const parsed = toNumberSafe(value);
    if (parsed !== 0 || asText === "0") {
      return parsed;
    }
  }
  return 0;
};

const canonicalType = (value: string) => {
  const normalized = normalizeHeaderKey(value);
  if (!normalized) return "UMUM";
  if (normalized.includes("bipolar")) return "BIPOLAR";
  if (normalized.includes("tkr") || normalized.includes("knee")) return "TKR";
  if (normalized.includes("thr") || normalized.includes("hip")) return "THR";
  if (normalized === "umum" || normalized === "general") return "UMUM";
  return value.toUpperCase().trim();
};

const inferImplantType = (text: string, fallback = "UMUM") => {
  const content = toStringSafe(text).toUpperCase();
  if (!content) return canonicalType(fallback);

  if (
    /BIPOLAR|BI[\s-]*POLAR|HEMI[\s-]*HIP|HEMI\s+ARTHROPLASTY/.test(content)
  ) {
    return "BIPOLAR";
  }
  if (
    /TKR|KNEE|TIBIAL|PATELLA|FEMORAL COMPONENT|POSTERIOR STABILIZED/.test(
      content
    )
  ) {
    return "TKR";
  }
  if (
    /THR|HIP|ACETABULAR|FEMORAL HEAD|CEMENTLESS STEM|CEMENTED STEM|LINER/.test(
      content
    )
  ) {
    return "THR";
  }

  if (/\bNMH[A-Z0-9]+\b/.test(content)) return "THR";
  if (/\bNMD[A-Z0-9]+\b/.test(content)) return "TKR";

  return canonicalType(fallback);
};

const normalizeTypeKey = (value: string) => canonicalType(value || "UMUM");

const orderedTypeKeys = (typeSet: Set<string>) => {
  const baseOrder = ["THR", "TKR", "BIPOLAR", "UMUM"];
  const rest = Array.from(typeSet).filter((type) => !baseOrder.includes(type));
  rest.sort((a, b) => a.localeCompare(b));
  return [...baseOrder.filter((type) => typeSet.has(type)), ...rest];
};

const pickFirstArray = (
  source: Record<string, unknown>,
  keys: string[],
  allowEmpty = true
): unknown[] => {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value) && (allowEmpty || value.length > 0)) {
      return value;
    }
  }
  return [];
};

const normalizeChecklistRow = (raw: unknown, index: number): ChecklistRow => {
  const row = (raw || {}) as Record<string, unknown>;
  const inferredType = inferImplantType(
    `${toStringSafe(row.description || row.deskripsi || row.namabarang || row.item)} ${toStringSafe(
      row.refnumber || row.refNumber || row.partnumber || row.kode || row.code
    )}`,
    toStringSafe(row.implantType || row.__implantType || row.type || row.kategori)
  );
  return {
    no: toStringSafe(row.no || row.nomor || row.number) || String(index + 1),
    refNumber: toStringSafe(
      row.refnumber || row.refNumber || row.partnumber || row.ref || row.code || row.kode
    ),
    description: toStringSafe(
      row.description ||
        row.deskripsi ||
        row.namabarang ||
        row.item ||
        row.nama ||
        row.part ||
        row.namapart
    ),
    batchNo: toStringSafe(row.batchno || row.batchNo || row.batch || row.lot),
    qtyIn: toNumberFromCandidates(row.qtyin, row.qtyIn, row.masuk, row.stdqty),
    qtyOut: toNumberFromCandidates(
      row.qtyout,
      row.qtyOut,
      row.keluar,
      row.qtychecked,
      row.qtyissued
    ),
    balance: toNumberFromCandidates(
      row.balance,
      row.sisa,
      row.stock,
      row.qtybalance,
      row.qtyreturned
    ),
    note: toStringSafe(row.note || row.keterangan || row.remark || row.catatan),
    implantType: normalizeTypeKey(inferredType),
  };
};

const normalizeHandoverRow = (raw: unknown, index: number): HandoverRow => {
  const row = (raw || {}) as Record<string, unknown>;
  const code = toStringSafe(row.kodebarang || row.kode || row.code);
  const name = toStringSafe(
    row.instrument ||
      row.nama ||
      row.name ||
      row.namabarang ||
      row.namainstrument ||
      row.namainstrumen ||
      row.alat ||
      row.namaalat
  );
  const inferredType = inferImplantType(
    `${name} ${code} ${toStringSafe(row.keterangan || row.note || row.sectionType || row.section)}`,
    toStringSafe(row.implantType || row.__implantType || row.sectionType || row.section)
  );

  return {
    no: toStringSafe(row.no || row.nomor || row.number) || String(index + 1),
    instrument: code && name ? `${name} (${code})` : name || code,
    qty: toNumberFromCandidates(row.qty, row.jumlah, row.batch, row.jumlahset, row.set),
    condition: toStringSafe(
      row.condition ||
        row.kondisi ||
        row.status ||
        row.kondisiinstrument ||
        row.satuan ||
        row.qty
    ),
    note: toStringSafe(row.note || row.keterangan || row.remark || row.catatan),
    implantType: normalizeTypeKey(inferredType),
  };
};

const normalizeProfile = (
  raw: Record<string, unknown>,
  fallback?: Partial<ProfileData>
): ProfileData => ({
  title: toStringSafe(raw.title) || fallback?.title || "CHECK LIST IMPLANT THR",
  hospital: toStringSafe(raw.hospital) || fallback?.hospital || "",
  scope: toStringSafe(raw.scope) || fallback?.scope || "",
  documentNo: toStringSafe(raw.documentNo) || fallback?.documentNo || "",
  date: toStringSafe(raw.date) || fallback?.date || "",
  period: toStringSafe(raw.period) || fallback?.period || "",
  preparedBy: toStringSafe(raw.preparedBy) || fallback?.preparedBy || "",
  checkedBy: toStringSafe(raw.checkedBy) || fallback?.checkedBy || "",
  approvedBy: toStringSafe(raw.approvedBy) || fallback?.approvedBy || "",
  logoLeftUrl: toStringSafe(raw.logoLeftUrl) || fallback?.logoLeftUrl || "",
  logoRightUrl: toStringSafe(raw.logoRightUrl) || fallback?.logoRightUrl || "",
});

const computeSummary = (checklistRows: ChecklistRow[]) => ({
  totalRows: checklistRows.length,
  totalQtyIn: checklistRows.reduce((sum, row) => sum + row.qtyIn, 0),
  totalQtyOut: checklistRows.reduce((sum, row) => sum + row.qtyOut, 0),
  totalBalance: checklistRows.reduce((sum, row) => sum + row.balance, 0),
});

const buildDocumentsByType = (
  profile: ProfileData,
  checklistRows: ChecklistRow[],
  handoverRows: HandoverRow[]
): DocumentData[] => {
  const typeSet = new Set<string>();
  checklistRows.forEach((row) => typeSet.add(normalizeTypeKey(row.implantType || "UMUM")));
  handoverRows.forEach((row) => typeSet.add(normalizeTypeKey(row.implantType || "UMUM")));
  if (typeSet.size === 0) {
    typeSet.add("UMUM");
  }

  const docsWithType = orderedTypeKeys(typeSet).map((typeKey) => {
    const checklistForType = checklistRows.filter(
      (row) => normalizeTypeKey(row.implantType || "UMUM") === typeKey
    );
    const handoverForType = handoverRows.filter(
      (row) => normalizeTypeKey(row.implantType || "UMUM") === typeKey
    );

    const titleSuffix = typeKey === "UMUM" ? "" : ` ${typeKey}`;
    return {
      typeKey,
      doc: {
        id: `doc-${typeKey.toLowerCase()}`,
        title: `CHECK LIST IMPLANT${titleSuffix}`,
        profile: {
          ...profile,
          title: `CHECK LIST IMPLANT${titleSuffix}`,
        },
        checklistRows: checklistForType,
        handoverRows: handoverForType,
      } satisfies DocumentData,
    };
  });

  const shared = docsWithType.find((item) => item.typeKey === "UMUM")?.doc;
  const typedDocs = docsWithType
    .filter((item) => item.typeKey !== "UMUM")
    .map((item) => item.doc);

  if (shared && typedDocs.length > 0) {
    return typedDocs
      .map((doc) => ({
        ...doc,
        checklistRows: [...doc.checklistRows, ...shared.checklistRows],
        handoverRows: [...doc.handoverRows, ...shared.handoverRows],
      }))
      .filter((doc) => doc.checklistRows.length > 0 || doc.handoverRows.length > 0);
  }

  return docsWithType
    .map((item) => item.doc)
    .filter((doc) => doc.checklistRows.length > 0 || doc.handoverRows.length > 0);
};

const decodeEscapedJsString = (value: string) =>
  value
    .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

const parsePublishedItems = (html: string): PublishedItem[] => {
  const items: PublishedItem[] = [];
  const pattern =
    /items\.push\(\{name:\s*"((?:[^"\\]|\\.)*)",\s*pageUrl:\s*"((?:[^"\\]|\\.)*)",\s*gid:\s*"([^"]+)"/g;

  let match = pattern.exec(html);
  while (match) {
    items.push({
      name: decodeEscapedJsString(match[1]),
      pageUrl: decodeEscapedJsString(match[2]),
      gid: decodeEscapedJsString(match[3]),
    });
    match = pattern.exec(html);
  }

  return items;
};

const buildPublishedCsvUrl = (pageUrl: string, gid: string): string => {
  const url = new URL(pageUrl);
  if (url.pathname.includes("/pubhtml/sheet")) {
    url.pathname = url.pathname.replace("/pubhtml/sheet", "/pub");
  } else if (url.pathname.includes("/pubhtml")) {
    url.pathname = url.pathname.replace("/pubhtml", "/pub");
  }
  url.searchParams.set("gid", gid);
  url.searchParams.set("single", "true");
  url.searchParams.set("output", "csv");
  return url.toString();
};

const isChecklistSheet = (sheetName: string) => {
  const name = normalizeHeaderKey(sheetName);
  return (
    name.includes("check") ||
    name.includes("implant") ||
    name.includes("tkr") ||
    name.includes("thr") ||
    name.includes("sheet")
  );
};

const isHandoverSheet = (sheetName: string) => {
  const name = normalizeHeaderKey(sheetName);
  return (
    name.includes("tandaterima") ||
    name.includes("serahterima") ||
    name.includes("instrument")
  );
};

const parseChecklistRowsFromMatrix = (
  matrix: string[][],
  sheetName: string
): Array<Record<string, unknown>> => {
  const sheetType = inferImplantType(sheetName, "UMUM");
  return matrix
    .map((row) => row.map(toStringSafe))
    .filter((cells) => /^\d+$/.test(cells[0] || ""))
    .map((cells) => {
      const rowType = inferImplantType(
        `${cells[1] || ""} ${cells[2] || ""} ${sheetName}`,
        sheetType
      );
      return {
        no: cells[0] || "",
        partnumber: cells[1] || "",
        description: cells[2] || "",
        batchno: cells[3] || "",
        stdqty: cells[4] || "",
        qtychecked: cells[5] || "",
        qtyissued: cells[6] || "",
        qtyreturned: cells[7] || "",
        __implantType: normalizeTypeKey(rowType),
      };
    })
    .filter(
      (row) => toStringSafe(row.partnumber) !== "" || toStringSafe(row.description) !== ""
    );
};

const parseHandoverRowsFromMatrix = (
  matrix: string[][],
  sheetName: string
): Array<Record<string, unknown>> => {
  const rows = matrix.map((row) => row.map(toStringSafe));
  const output: Array<Record<string, unknown>> = [];
  let activeType = inferImplantType(sheetName, "UMUM");

  for (const cells of rows) {
    const line = cells.join(" ").trim();
    if (!line) continue;

    if (!/^\d+$/.test(cells[0] || "")) {
      const looksLikeHeader =
        /^no$/i.test(cells[0] || "") ||
        /kode\s*barang|nama\s*barang|keterangan/i.test(line);
      if (looksLikeHeader) {
        continue;
      }

      const typeFromSection = inferImplantType(line, activeType);
      if (typeFromSection !== "UMUM" || activeType === "UMUM") {
        activeType = typeFromSection;
      }
      continue;
    }

    output.push({
      no: cells[0] || "",
      kodebarang: cells[1] || "",
      namabarang: cells[2] || "",
      batch: cells[3] || "",
      qty: cells[4] || "",
      keterangan: cells[5] || "",
      __implantType: normalizeTypeKey(
        inferImplantType(
          `${cells[1] || ""} ${cells[2] || ""} ${cells[5] || ""}`,
          activeType
        )
      ),
    });
  }

  return output
    .filter((row) => toStringSafe(row.namabarang) !== "" || toStringSafe(row.kodebarang) !== "")
    .map((row, index) => ({
      ...row,
      no: toStringSafe(row.no) || String(index + 1),
    }));
};

const normalizeRowsBySheet = (
  sheets: Array<{ name: string; matrix: string[][] }>
): {
  checklistRaw: Array<Record<string, unknown>>;
  handoverRaw: Array<Record<string, unknown>>;
} => {
  const checklistRaw: Array<Record<string, unknown>> = [];
  const handoverRaw: Array<Record<string, unknown>> = [];

  sheets.forEach((sheet) => {
    if (isHandoverSheet(sheet.name)) {
      handoverRaw.push(...parseHandoverRowsFromMatrix(sheet.matrix, sheet.name));
      return;
    }
    if (isChecklistSheet(sheet.name)) {
      checklistRaw.push(...parseChecklistRowsFromMatrix(sheet.matrix, sheet.name));
      return;
    }

    const checklistCandidate = parseChecklistRowsFromMatrix(sheet.matrix, sheet.name);
    const handoverCandidate = parseHandoverRowsFromMatrix(sheet.matrix, sheet.name);
    if (handoverCandidate.length > checklistCandidate.length) {
      handoverRaw.push(...handoverCandidate);
    } else {
      checklistRaw.push(...checklistCandidate);
    }
  });

  return { checklistRaw, handoverRaw };
};

const fetchPublishedPayload = async (
  publishedUrl: string,
  period: string
): Promise<RoutePayload> => {
  const htmlResponse = await fetch(publishedUrl, { cache: "no-store" });
  if (!htmlResponse.ok) {
    throw new Error(`Published sheet tidak bisa diakses (${htmlResponse.status})`);
  }

  const html = await htmlResponse.text();
  const items = parsePublishedItems(html);
  if (items.length === 0) {
    throw new Error("Tab sheet publik tidak terdeteksi pada URL yang diberikan.");
  }

  const sheetRows = await Promise.all(
    items.map(async (item) => {
      const csvUrl = buildPublishedCsvUrl(item.pageUrl, item.gid);
      const csvResponse = await fetch(csvUrl, { cache: "no-store" });
      if (!csvResponse.ok) {
        throw new Error(
          `Gagal membaca sheet "${item.name}" (${csvResponse.status}).`
        );
      }
      const csvText = await csvResponse.text();
      const matrix = parseCsv(csvText);
      return {
        ...item,
        matrix,
      };
    })
  );

  const { checklistRaw, handoverRaw } = normalizeRowsBySheet(sheetRows);

  const checklistRows = checklistRaw.map(normalizeChecklistRow);
  const handoverRows = handoverRaw.map(normalizeHandoverRow);
  const now = new Date();
  const summary = computeSummary(checklistRows);
  const profile = normalizeProfile({
    title: "CHECK LIST IMPLANT THR",
    date: now.toISOString().slice(0, 10),
    period: period || now.toISOString().slice(0, 7),
  });
  const documents = buildDocumentsByType(profile, checklistRows, handoverRows);

  return {
    success: true,
    generatedAt: now.toISOString(),
    profile,
    checklistRows,
    handoverRows,
    documents,
    summary,
    source: "published",
  };
};

const fetchAppScriptPayload = async (
  appScriptUrl: string,
  period: string,
  apiKey?: string
): Promise<RoutePayload> => {
  const upstreamUrl = new URL(appScriptUrl);
  upstreamUrl.searchParams.set("format", "json");
  if (period) upstreamUrl.searchParams.set("period", period);
  if (apiKey) upstreamUrl.searchParams.set("apiKey", apiKey);

  const response = await fetch(upstreamUrl.toString(), { cache: "no-store" });
  if (!response.ok) {
    const raw = await response.text();
    throw new Error(
      `App Script mengembalikan status ${response.status}. ${raw.slice(0, 120)}`
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Respons App Script bukan JSON valid.");
  }

  const root = (payload || {}) as Record<string, unknown>;
  const profile = normalizeProfile((root.profile || {}) as Record<string, unknown>);

  const rootChecklist = pickFirstArray(
    root,
    ["checklistRows", "checklist", "checklistData", "items"],
    true
  );
  const rootHandover = pickFirstArray(
    root,
    [
      "handoverRows",
      "tandaTerimaRows",
      "serahTerimaRows",
      "tandaTerima",
      "serahTerima",
      "instrumentRows",
    ],
    true
  );

  const rootChecklistRows = rootChecklist.map(normalizeChecklistRow);
  const rootHandoverRows = rootHandover.map(normalizeHandoverRow);

  const documents = Array.isArray(root.documents)
    ? root.documents.map((rawDoc, index) => {
        const doc = (rawDoc || {}) as Record<string, unknown>;
        const docProfile = normalizeProfile(
          ((doc.profile || {}) as Record<string, unknown>) || {},
          profile
        );
        const docChecklistRaw = pickFirstArray(
          doc,
          ["checklistRows", "checklist", "checklistData", "items"],
          false
        );
        const docHandoverRaw = pickFirstArray(
          doc,
          [
            "handoverRows",
            "tandaTerimaRows",
            "serahTerimaRows",
            "tandaTerima",
            "serahTerima",
            "instrumentRows",
          ],
          false
        );

        return {
          id: toStringSafe(doc.id) || `doc-${index + 1}`,
          title: toStringSafe(doc.title) || docProfile.title,
          profile: docProfile,
          checklistRows: (
            docChecklistRaw.length > 0 ? docChecklistRaw : rootChecklist
          ).map(normalizeChecklistRow),
          handoverRows: (
            docHandoverRaw.length > 0 ? docHandoverRaw : rootHandover
          ).map(normalizeHandoverRow),
        } satisfies DocumentData;
      })
    : [];

  const checklistRows =
    rootChecklistRows.length > 0 ? rootChecklistRows : documents[0]?.checklistRows || [];
  const handoverRows =
    rootHandoverRows.length > 0 ? rootHandoverRows : documents[0]?.handoverRows || [];
  const summary = computeSummary(checklistRows);
  const autoDocuments = buildDocumentsByType(profile, checklistRows, handoverRows);
  const finalDocuments =
    documents.length > 1
      ? documents
      : autoDocuments.length > 0
        ? autoDocuments
        : documents;

  return {
    success: true,
    generatedAt: toStringSafe(root.generatedAt) || new Date().toISOString(),
    profile,
    checklistRows,
    handoverRows,
    documents: finalDocuments,
    summary,
    source: "appscript",
  };
};

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const period = toStringSafe(incoming.searchParams.get("period"));
  const source = toStringSafe(incoming.searchParams.get("source")) || "published";

  const appScriptUrl = process.env.GS_IMPLANT_THR_WEBAPP_URL || DEFAULT_APP_SCRIPT_URL;
  const appScriptApiKey = process.env.GS_IMPLANT_THR_API_KEY;
  const publishedUrl = process.env.GS_IMPLANT_THR_PUBLISHED_URL || DEFAULT_PUBLISHED_URL;

  try {
    if (source === "appscript") {
      const appScriptPayload = await fetchAppScriptPayload(
        appScriptUrl,
        period,
        appScriptApiKey
      );
      return NextResponse.json(appScriptPayload, { status: 200 });
    }

    try {
      const publishedPayload = await fetchPublishedPayload(publishedUrl, period);
      return NextResponse.json(publishedPayload, { status: 200 });
    } catch (publishedError) {
      const fallbackPayload = await fetchAppScriptPayload(
        appScriptUrl,
        period,
        appScriptApiKey
      );
      return NextResponse.json(
        {
          ...fallbackPayload,
          warning:
            publishedError instanceof Error
              ? `Published fallback gagal: ${publishedError.message}`
              : "Published fallback gagal",
        },
        { status: 200 }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi error saat ambil data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
