import { markdownTable } from "markdown-table";
import ms from "ms";
import { cleanupBrowser, initBrowser, measureFileReload, measurePageLoad } from "./browser.js";
import { error, log } from "./log.js";
import { startServer, terminateServer } from "./server.js";

const formatter = Intl.NumberFormat("en-US", {
  style: "unit",
  unit: "millisecond",
});

const formatMs = (timeMs) => formatter.format(Math.round(timeMs));

export async function measure(options) {
  try {
    await initBrowser();
    log("Starting performance measurement...\n");

    const atStart = performance.now();
    const serverURL = await startServer(options);
    const atServerUp = performance.now();
    const pageLoadMetrics = await measurePageLoad(serverURL, options.waitFor);
    const reloadMetrics = await measureFileReload(options.file);
    await terminateServer();

    return {
      atStart,
      atServerUp,
      ...pageLoadMetrics,
      ...reloadMetrics,
    };
  } catch (err) {
    error("Performance measurement failed:", err.message);
    throw err;
  } finally {
    await terminateServer();
    await cleanupBrowser();
  }
}

export function formatResults(results) {
  const tableData = [
    ["Dev Server Ready", "First Paint", "App Loaded", "Reload after change"],
    [
      formatMs(results.atServerUp - results.atStart),
      formatMs(results.atFirstPaint - results.atStart),
      formatMs(results.atAppLoad - results.atStart),
      formatMs(results.atReloadComplete - results.atFileChanged),
    ],
  ];

  return markdownTable(tableData);
}
