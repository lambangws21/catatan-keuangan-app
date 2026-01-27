export type TableUiConfig = {
  saldoScrollThreshold: number;
  saldoDesktopMaxHeightPx: number;
  saldoMobileMaxHeightPx: number;
  transactionDesktopMaxHeightPx: number;
  transactionMobileMaxHeightPx: number;
  transactionRowsPerPageDefault: number;
  transactionRowsPerPageOptions: number[];
};

export const defaultTableUiConfig: TableUiConfig = {
  saldoScrollThreshold: 10,
  saldoDesktopMaxHeightPx: 560,
  saldoMobileMaxHeightPx: 640,
  transactionDesktopMaxHeightPx: 620,
  transactionMobileMaxHeightPx: 700,
  transactionRowsPerPageDefault: 10,
  transactionRowsPerPageOptions: [10, 15, 20],
};

const toNumber = (value: unknown, fallback: number) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toNumberArray = (value: unknown, fallback: number[]) => {
  if (Array.isArray(value)) {
    const parsed = value
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0);
    return parsed.length ? parsed : fallback;
  }
  return fallback;
};

export const sanitizeTableUiConfig = (
  input: Partial<TableUiConfig> | null | undefined
): TableUiConfig => {
  const merged: TableUiConfig = {
    ...defaultTableUiConfig,
    ...(input || {}),
  };

  const options = toNumberArray(
    merged.transactionRowsPerPageOptions,
    defaultTableUiConfig.transactionRowsPerPageOptions
  );
  const defaultRows = toNumber(
    merged.transactionRowsPerPageDefault,
    defaultTableUiConfig.transactionRowsPerPageDefault
  );

  return {
    saldoScrollThreshold: Math.max(
      1,
      Math.floor(
        toNumber(merged.saldoScrollThreshold, defaultTableUiConfig.saldoScrollThreshold)
      )
    ),
    saldoDesktopMaxHeightPx: Math.max(
      200,
      Math.floor(
        toNumber(
          merged.saldoDesktopMaxHeightPx,
          defaultTableUiConfig.saldoDesktopMaxHeightPx
        )
      )
    ),
    saldoMobileMaxHeightPx: Math.max(
      200,
      Math.floor(
        toNumber(
          merged.saldoMobileMaxHeightPx,
          defaultTableUiConfig.saldoMobileMaxHeightPx
        )
      )
    ),
    transactionDesktopMaxHeightPx: Math.max(
      200,
      Math.floor(
        toNumber(
          merged.transactionDesktopMaxHeightPx,
          defaultTableUiConfig.transactionDesktopMaxHeightPx
        )
      )
    ),
    transactionMobileMaxHeightPx: Math.max(
      200,
      Math.floor(
        toNumber(
          merged.transactionMobileMaxHeightPx,
          defaultTableUiConfig.transactionMobileMaxHeightPx
        )
      )
    ),
    transactionRowsPerPageDefault: Math.max(1, Math.floor(defaultRows)),
    transactionRowsPerPageOptions: options,
  };
};

