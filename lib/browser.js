import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer";
import { error, log, warn } from "./log.js";

export const VIEWPORT = {
  width: 1366,
  height: 768,
};

let browser = null;
let page = null;

export async function initBrowser() {
  browser = await puppeteer.launch({
    headless: process.env.SHOW_BROWSER !== "true",
    args: ["--no-sandbox"],
  });

  page = await browser.newPage();

  // Setup page event listeners
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      warn(`PAGE ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });

  page.on("pageerror", (err) => {
    error(`PAGE ERROR: ${err.message}`);
  });

  page.on("response", (resp) => {
    if (!resp.ok() && resp.status() !== 302 && resp.status() !== 304) {
      warn(`FAILED HTTP REQUEST TO ${resp.url()} Status: ${resp.status()}`);
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

export async function measurePageLoad(url, waitForSelector = "body", pageLoadTimeout = 60_000) {
  log(`Loading page: ${url}`);

  const response = await page.goto(url, {
    timeout: pageLoadTimeout,
    waitUntil: "load",
  });

  if (!response.ok()) {
    throw new Error(`Failed to load page: ${response.status()}`);
  }

  const atFirstPaint = performance.now();

  log("Waiting for page to fully load...");
  await page.waitForNetworkIdle();

  log(`Waiting for element: ${waitForSelector}`);
  await page.waitForSelector(waitForSelector, {
    visible: true,
    timeout: 60_000,
  });

  const atAppLoad = performance.now();

  log(`Page loaded`);

  return {
    atFirstPaint,
    atAppLoad,
  };
}

export async function measureFileReload(filePath) {
  if (!filePath) {
    log("No file specified for reload test, skipping...");
    return 0;
  }

  const resolvedPath = resolve(filePath);

  try {
    await fs.access(resolvedPath);
  } catch {
    warn(`File ${filePath} not found, skipping reload test...`);
    return {};
  }

  log(`Testing reload with file: ${filePath}`);

  log("Triggering file change...");
  const atFileChange = performance.now();

  const originalContent = await fs.readFile(resolvedPath, "utf8");
  await fs.writeFile(resolvedPath, `${originalContent}\n// reload trigger`);

  const atFileChanged = performance.now();

  log("Waiting for hot reload to complete...");
  await page.waitForNetworkIdle();

  const atReloadComplete = performance.now();

  log("Restoring original file content...");
  await fs.writeFile(resolvedPath, originalContent);

  return {
    atFileChange,
    atFileChanged,
    atReloadComplete,
  };
}

export async function cleanupBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch (err) {
      error("Error closing browser:", err.message);
    }
  }
}
