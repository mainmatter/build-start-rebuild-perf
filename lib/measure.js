import { markdownTable } from "markdown-table";
import ms from "ms";
import { cleanupBrowser, initBrowser, measureFileReload, measurePageLoad } from "./browser.js";
import { startServer, terminateServer } from "./server.js";

const formatMs = (timeMs) => ms(Math.round(timeMs * 1000) / 1000);

let measurements = {
  buildTime: 0,
  timeToInteractive: 0,
  timeToAppLoad: 0,
  timeToReload: 0,
};

export async function measure(options) {
  try {
    await initBrowser();
    console.log("Starting performance measurement...\n");

    const buildStartTime = performance.now();
    const serverURL = await startServer(options);
    const coldLoadMetrics = await measurePageLoad(serverURL, options.waitFor);
    await terminateServer();
    const buildEndTime = performance.now();

    measurements.buildTime = buildEndTime - buildStartTime;
    measurements.timeToInteractive = coldLoadMetrics.timeToFirstPaint;
    measurements.timeToAppLoad = coldLoadMetrics.timeToAppLoad;

    console.log(`Start measurement completed in ${formatMs(measurements.buildTime)}\n`);

    measurements.timeToReload = await measureFileReload(options.file);

    return measurements;
  } catch (error) {
    console.error("Performance measurement failed:", error.message);
    throw error;
  } finally {
    await terminateServer();
    await cleanupBrowser();
  }
}

export function printResults() {
  const tableData = [
    ["Build", "Time to interactive", "App load", "Hot reload"],
    [
      formatMs(measurements.buildTime),
      formatMs(measurements.timeToInteractive),
      formatMs(measurements.timeToAppLoad),
      formatMs(measurements.timeToReload),
    ],
  ];

  const markdownOutput = markdownTable(tableData, { align: ["r", "r", "r", "r"] });

  console.log("\nPerformance Results:");
  console.log(markdownOutput);
}
