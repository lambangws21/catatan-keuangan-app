const originalWarn = console.warn;
const originalEmitWarning = process.emitWarning.bind(process);

console.warn = (...args) => {
  const message = args.map(String).join(" ");
  if (message.includes("[baseline-browser-mapping] The data in this module is over two months old")) {
    return;
  }

  originalWarn(...args);
};

process.emitWarning = (warning, ...args) => {
  const message = warning instanceof Error ? warning.message : String(warning);
  const options = args.find(
    (arg) => arg && typeof arg === "object" && !Array.isArray(arg)
  );
  const code =
    (options && options.code) ||
    args.find((arg) => typeof arg === "string" && arg.startsWith("DEP"));

  if (code === "DEP0040" && message.includes("punycode")) {
    return;
  }

  return originalEmitWarning(warning, ...args);
};
