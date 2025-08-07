import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { Launcher } from "chrome-launcher";
import ms from "ms";
import puppeteer from "puppeteer-core";
import { TIMEOUTS } from "./constants.js";

export const VIEWPORT = {
  width: 1366,
  height: 768,
};

const formatMs = (timeMs) => ms(Math.round(timeMs * 1000) / 1000);

let browser = null;
let page = null;

export async function initBrowser() {
  browser = await puppeteer.launch({
    executablePath: Launcher.getInstallations()[0],
    headless: process.env.SHOW_BROWSER !== "true",
    args: ["--no-sandbox"],
  });

  page = await browser.newPage();

  // Setup page event listeners
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      console.log(`PAGE ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    console.log(`PAGE ERROR: ${err.message}`);
  });

  page.on("response", (resp) => {
    if (!resp.ok() && resp.status() !== 302 && resp.status() !== 304) {
      console.log(`FAILED HTTP REQUEST TO ${resp.url()} Status: ${resp.status()}`);
    }
  });

  await page.setViewport(VIEWPORT);

  // Setup authentication if credentials are provided
  if (process.env.AUTH_USER && process.env.AUTH_PASSWORD) {
    await page.authenticate({
      username: process.env.AUTH_USER,
      password: process.env.AUTH_PASSWORD,
    });
  }
}

export async function measurePageLoad(url, waitForSelector = "body") {
  console.log(`Loading page: ${url}`);
  const startTime = performance.now();

  const response = await page.goto(url, {
    timeout: TIMEOUTS.PAGE_LOAD,
    waitUntil: "load",
  });

  if (!response.ok()) {
    throw new Error(`Failed to load page: ${response.status()}`);
  }

  const navigationEndTime = performance.now();
  console.log("Waiting for page to fully load...");

  const firstPaintTime = performance.now();

  console.log(`Waiting for element: ${waitForSelector}`);
  await page.waitForSelector(waitForSelector, {
    visible: true,
    timeout: TIMEOUTS.PAGE_LOAD,
  });

  const appLoadTime = performance.now();
  console.log(`Page loaded in ${Math.round(appLoadTime - startTime)}ms`);

  return {
    timeToNavigation: navigationEndTime - startTime,
    timeToFirstPaint: firstPaintTime - startTime,
    timeToAppLoad: appLoadTime - startTime,
  };
}

export async function waitForNetworkIdle() {
  await page.waitForNetworkIdle({ idleTime: TIMEOUTS.NETWORK_IDLE });
}

export async function cleanupBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      console.error("Error closing browser:", error.message);
    }
  }
}

export async function measureFileReload(filePath) {
  if (!filePath) {
    console.log("No file specified for reload test, skipping...");
    return 0;
  }

  const resolvedPath = resolve(filePath);

  try {
    await fs.access(resolvedPath);
  } catch {
    console.log(`File ${filePath} not found, skipping reload test...`);
    return 0;
  }

  console.log(`Testing reload with file: ${filePath}`);

  console.log("Triggering file change...");
  const reloadStartTime = performance.now();

  const originalContent = await fs.readFile(resolvedPath, "utf8");
  await fs.writeFile(resolvedPath, `${originalContent}\n// reload trigger`);

  console.log("Waiting for hot reload to complete...");
  await waitForNetworkIdle();

  console.log("Restoring original file content...");
  await fs.writeFile(resolvedPath, originalContent);

  const reloadTime = performance.now() - reloadStartTime;

  console.log(`File reload completed in ${formatMs(reloadTime)}`);
  return reloadTime;
}
