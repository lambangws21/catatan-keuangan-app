/**
 * Google Apps Script - Web App untuk CHECK LIST IMPLANT THR
 *
 * Struktur sheet yang disarankan:
 * 1) Sheet: META
 *    Kolom A = key, Kolom B = value
 *    Contoh key:
 *    - title
 *    - hospital
 *    - scope
 *    - documentNo
 *    - preparedBy
 *    - checkedBy
 *    - approvedBy
 *    - logoLeftUrl
 *    - logoRightUrl
 *
 * 2) Sheet: CHECKLIST
 *    Header baris 1, contoh:
 *    no | refNumber | description | batchNo | qtyIn | qtyOut | balance | note | date
 *
 * 3) Sheet: TANDA_TERIMA
 *    Header baris 1, contoh:
 *    no | instrument | qty | condition | note
 *
 * Query param yang didukung:
 * - period=YYYY-MM
 * - format=json (opsional)
 * - apiKey=... (opsional, jika memakai proteksi API key)
 */

const THR_CONFIG = {
  metaSheetNames: ["META", "Meta", "CONFIG"],
  checklistSheetNames: [
    "CHECKLIST",
    "CHECK LIST",
    "LIST_IMPLANT",
    "CHECKLIST_IMPLANT",
  ],
  handoverSheetNames: [
    "TANDA_TERIMA",
    "TANDA TERIMA",
    "TANDA TERIMA INSTRUMENT",
    "SERAH_TERIMA",
    "SERAH TERIMA",
  ],
  scriptPropertyApiKeyName: "IMPLANT_THR_API_KEY", // optional
};

function doGet(e) {
  try {
    enforceApiKeyIfConfigured_(e);
    const payload = buildPayload_(e);
    return jsonOutput_(payload);
  } catch (error) {
    return jsonOutput_({
      success: false,
      error: error && error.message ? error.message : "Unknown error",
    });
  }
}

function buildPayload_(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = Session.getScriptTimeZone() || "Asia/Jakarta";
  const period = toText_(e && e.parameter ? e.parameter.period : "");

  const metaSheet = getFirstSheetByNames_(ss, THR_CONFIG.metaSheetNames);
  const checklistSheet = getFirstSheetByNames_(
    ss,
    THR_CONFIG.checklistSheetNames
  );
  const handoverSheet = getFirstSheetByNames_(
    ss,
    THR_CONFIG.handoverSheetNames
  );

  if (!checklistSheet) {
    throw new Error(
      'Sheet checklist tidak ditemukan. Coba gunakan salah satu nama: ' +
        THR_CONFIG.checklistSheetNames.join(", ")
    );
  }
  if (!handoverSheet) {
    throw new Error(
      "Sheet Tanda Terima tidak ditemukan. Coba gunakan salah satu nama: " +
        THR_CONFIG.handoverSheetNames.join(", ")
    );
  }

  const metaMap = readMetaMap_(metaSheet);
  const rawChecklist = readRowsByHeader_(checklistSheet);
  const rawHandover = readRowsByHeader_(handoverSheet);

  const checklistRows = rawChecklist
    .filter(function (row) {
      return matchPeriod_(row, period, tz);
    })
    .map(function (row, idx) {
      return normalizeChecklistRow_(row, idx, tz);
    });

  const handoverRows = rawHandover.map(function (row, idx) {
    return normalizeHandoverRow_(row, idx);
  });

  const summary = checklistRows.reduce(
    function (acc, row) {
      acc.totalRows += 1;
      acc.totalQtyIn += row.qtyIn;
      acc.totalQtyOut += row.qtyOut;
      acc.totalBalance += row.balance;
      return acc;
    },
    { totalRows: 0, totalQtyIn: 0, totalQtyOut: 0, totalBalance: 0 }
  );

  return {
    success: true,
    generatedAt: Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    profile: {
      title: getMeta_(metaMap, "title", "CHECK LIST IMPLANT THR"),
      hospital: getMeta_(metaMap, "hospital", ""),
      scope: getMeta_(metaMap, "scope", ""),
      documentNo: getMeta_(metaMap, "documentNo", ""),
      date: getMeta_(
        metaMap,
        "date",
        Utilities.formatDate(new Date(), tz, "yyyy-MM-dd")
      ),
      period: period || Utilities.formatDate(new Date(), tz, "yyyy-MM"),
      preparedBy: getMeta_(metaMap, "preparedBy", ""),
      checkedBy: getMeta_(metaMap, "checkedBy", ""),
      approvedBy: getMeta_(metaMap, "approvedBy", ""),
      logoLeftUrl: getMeta_(metaMap, "logoLeftUrl", ""),
      logoRightUrl: getMeta_(metaMap, "logoRightUrl", ""),
    },
    checklistRows: checklistRows,
    handoverRows: handoverRows,
    summary: summary,
  };
}

function normalizeChecklistRow_(row, index, tz) {
  return {
    no: toText_(pick_(row, ["no", "nomor", "number"])) || String(index + 1),
    refNumber: toText_(
      pick_(row, ["refnumber", "ref", "ref_no", "refcode", "kode"])
    ),
    description: toText_(
      pick_(row, ["description", "deskripsi", "item", "namabarang", "nama"])
    ),
    batchNo: toText_(pick_(row, ["batchno", "batch", "lot", "batch_no"])),
    qtyIn: toNumber_(pick_(row, ["qtyin", "masuk", "qty_in", "qtymasuk"])),
    qtyOut: toNumber_(pick_(row, ["qtyout", "keluar", "qty_out", "qtykeluar"])),
    balance: toNumber_(pick_(row, ["balance", "sisa", "stock", "qtybalance"])),
    note: toText_(pick_(row, ["note", "keterangan", "remark", "catatan"])),
    date: normalizeCellDate_(pick_(row, ["date", "tanggal", "tgl"]), tz),
  };
}

function normalizeHandoverRow_(row, index) {
  return {
    no: toText_(pick_(row, ["no", "nomor", "number"])) || String(index + 1),
    instrument: toText_(
      pick_(row, [
        "instrument",
        "nama",
        "name",
        "namainstrument",
        "namainstrumen",
        "alat",
        "namaalat",
      ])
    ),
    qty: toNumber_(pick_(row, ["qty", "jumlah", "jumlahset", "set"])),
    condition: toText_(
      pick_(row, ["condition", "kondisi", "status", "kondisiinstrument"])
    ),
    note: toText_(pick_(row, ["note", "keterangan", "remark", "catatan"])),
  };
}

function matchPeriod_(row, period, tz) {
  if (!period) return true;
  const candidates = [
    pick_(row, ["period", "periode"]),
    pick_(row, ["date", "tanggal", "tgl"]),
  ];

  for (var i = 0; i < candidates.length; i += 1) {
    const candidate = normalizeCellDate_(candidates[i], tz);
    if (candidate && candidate.indexOf(period) === 0) {
      return true;
    }
  }

  return false;
}

function getFirstSheetByNames_(ss, candidateNames) {
  if (!ss || !Array.isArray(candidateNames) || candidateNames.length === 0) {
    return null;
  }

  for (var i = 0; i < candidateNames.length; i += 1) {
    const byExact = ss.getSheetByName(candidateNames[i]);
    if (byExact) return byExact;
  }

  const allSheets = ss.getSheets();
  const normalizedCandidates = candidateNames.map(function (name) {
    return normalizeSheetName_(name);
  });

  for (var j = 0; j < allSheets.length; j += 1) {
    const current = allSheets[j];
    const normalizedCurrent = normalizeSheetName_(current.getName());
    if (normalizedCandidates.indexOf(normalizedCurrent) !== -1) {
      return current;
    }
  }

  return null;
}

function normalizeSheetName_(value) {
  return toText_(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function readMetaMap_(sheet) {
  if (!sheet) return {};
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return {};

  var out = {};
  for (var i = 1; i < values.length; i += 1) {
    const rawKey = toText_(values[i][0]);
    if (!rawKey) continue;
    const key = normalizeHeaderKey_(rawKey);
    out[key] = values[i][1];
  }
  return out;
}

function readRowsByHeader_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (!values || values.length < 2) return [];

  const headers = values[0].map(function (cell) {
    return normalizeHeaderKey_(cell);
  });

  return values
    .slice(1)
    .filter(function (row) {
      return row.some(function (cell) {
        return toText_(cell) !== "";
      });
    })
    .map(function (row) {
      const obj = {};
      headers.forEach(function (header, idx) {
        obj[header] = row[idx];
      });
      return obj;
    });
}

function normalizeHeaderKey_(value) {
  return toText_(value)
    .toLowerCase()
    .replace(/[^\w]+/g, "");
}

function pick_(row, keys) {
  for (var i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== "") {
      return row[key];
    }
  }
  return "";
}

function toText_(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toNumber_(value) {
  if (typeof value === "number" && isFinite(value)) return value;
  const asText = toText_(value).replace(/[^\d.-]/g, "");
  const parsed = Number(asText);
  return isFinite(parsed) ? parsed : 0;
}

function normalizeCellDate_(value, tz) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, tz, "yyyy-MM-dd");
  }
  const asText = toText_(value);
  if (!asText) return "";
  const parsed = new Date(asText);
  if (isNaN(parsed.getTime())) return asText;
  return Utilities.formatDate(parsed, tz, "yyyy-MM-dd");
}

function getMeta_(map, key, fallback) {
  const normalizedKey = normalizeHeaderKey_(key);
  if (Object.prototype.hasOwnProperty.call(map, normalizedKey)) {
    return toText_(map[normalizedKey]);
  }
  return fallback;
}

function enforceApiKeyIfConfigured_(e) {
  const expected = PropertiesService.getScriptProperties().getProperty(
    THR_CONFIG.scriptPropertyApiKeyName
  );
  if (!expected) return;
  const provided = toText_(e && e.parameter ? e.parameter.apiKey : "");
  if (!provided || provided !== expected) {
    throw new Error("Unauthorized: apiKey invalid");
  }
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
