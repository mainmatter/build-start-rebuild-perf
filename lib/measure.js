import { markdownTable } from "markdown-table";
import { cleanupBrowser, initBrowser, measureFileReload, measurePageLoad } from "./browser.js";
import { error, log } from "./log.js";
import { startServer, terminateServer } from "./server.js";
import { formatMs } from "./utils.js";

/**
 * @typedef {Object} MeasureResults
 * @property {number} atStart
 * @property {number} atServerUp
 * @property {number} atFirstPaint
 * @property {number} atAppLoad
 * @property {number} [atFileChange]
 * @property {number} [atFileChanged]
 * @property {number} [atReloadComplete]
 */

/**
 *
 * @param {*} options
 * @returns {Promise<MeasureResults>}
 */
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

/**
 *
 * @param {MeasureResults} results
 * @returns string
 */
export function formatResults({
  atStart,
  atServerUp,
  atFirstPaint,
  atAppLoad,
  atFileChanged,
  atReloadComplete,
}) {
  const reloaded = atReloadComplete !== undefined;

  const tableData = [
    ["Dev Server Ready", "First Paint", "App Loaded", reloaded && "Reload after change"].filter(
      Boolean,
    ),
    [
      formatMs(atServerUp - atStart),
      formatMs(atFirstPaint - atStart),
      formatMs(atAppLoad - atStart),
      reloaded && formatMs(atReloadComplete - atFileChanged),
    ].filter(Boolean),
  ];

  return markdownTable(tableData);
}
