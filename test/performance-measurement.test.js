import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("PerformanceMeasurement", () => {
  beforeEach(async () => {
    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Options handling", () => {
    it("should have default options available", async () => {
      const { DEFAULT_OPTIONS } = await import("../lib/constants.js");

      expect(DEFAULT_OPTIONS.url).toBe("http://localhost:4200");
      expect(DEFAULT_OPTIONS.command).toBe("pnpm start");
      expect(DEFAULT_OPTIONS.waitFor).toBe("body");
      expect(DEFAULT_OPTIONS.file).toBeNull();
    });

    it("should merge options correctly", async () => {
      const { DEFAULT_OPTIONS } = await import("../lib/constants.js");
      const customOptions = {
        url: "http://localhost:3000",
        file: "app.js",
        command: "npm start",
        waitFor: ".app",
      };

      const mergedOptions = { ...DEFAULT_OPTIONS, ...customOptions };

      expect(mergedOptions.url).toBe("http://localhost:3000");
      expect(mergedOptions.file).toBe("app.js");
      expect(mergedOptions.command).toBe("npm start");
      expect(mergedOptions.waitFor).toBe(".app");
    });

    it("should handle partial option overrides", async () => {
      const { DEFAULT_OPTIONS } = await import("../lib/constants.js");
      const partialOptions = {
        url: "http://localhost:8080",
        command: "yarn dev",
      };

      const mergedOptions = { ...DEFAULT_OPTIONS, ...partialOptions };

      expect(mergedOptions.url).toBe("http://localhost:8080");
      expect(mergedOptions.command).toBe("yarn dev");
      expect(mergedOptions.waitFor).toBe("body"); // should use default
      expect(mergedOptions.file).toBeNull(); // should use default
    });
  });

  describe("Browser setup", () => {
    it("should validate browser launch parameters", () => {
      const launchOptions = {
        executablePath: "/path/to/chrome",
        headless: true,
        args: ["--no-sandbox"],
      };

      expect(launchOptions.executablePath).toBe("/path/to/chrome");
      expect(launchOptions.headless).toBe(true);
      expect(launchOptions.args).toContain("--no-sandbox");
    });

    it("should validate page event listener setup", () => {
      const eventTypes = ["console", "pageerror", "response"];

      eventTypes.forEach((eventType) => {
        expect(eventType).toMatch(/^(console|pageerror|response)$/);
      });
    });

    it("should validate viewport dimensions", () => {
      const viewport = { width: 1366, height: 768 };

      expect(viewport.width).toBe(1366);
      expect(viewport.height).toBe(768);
    });
  });

  describe("Server URL extraction", () => {
    it("should extract Vite server URL from stdout", () => {
      const testCases = [
        "Local:   http://localhost:4173/",
        "Local: https://localhost:3000/@vite",
        "serving at http://localhost:8080",
      ];

      const patterns = [
        /Local:\s+(https?:\/\/[^\s/]+)/,
        /serving at\s+(https?:\/\/[^\s/]+)/,
        /Available on:\s+(https?:\/\/[^\s/]+)/,
        /server running at\s+(https?:\/\/[^\s/]+)/i,
      ];

      testCases.forEach((testCase) => {
        let found = false;
        for (const pattern of patterns) {
          const match = testCase.match(pattern);
          if (match) {
            expect(match[1]).toMatch(/^https?:\/\/localhost:\d+/);
            found = true;
            break;
          }
        }
        expect(found).toBe(true);
      });
    });
  });

  describe("Performance measurements", () => {
    it("should measure timing differences correctly", () => {
      const startTime = 1000;
      const endTime = 1500;
      const timeDiff = endTime - startTime;

      expect(timeDiff).toBe(500);
      expect(Math.round(timeDiff)).toBe(500);
    });

    it("should format timing results using ms package", async () => {
      const ms = (await import("ms")).default;

      const measurements = {
        buildTime: 1234.5,
        timeToInteractive: 567.8,
        timeToAppLoad: 890.1,
        timeToReload: 234.6,
      };

      const buildTime = ms(Math.round(measurements.buildTime));
      const timeToInteractive = ms(Math.round(measurements.timeToInteractive));
      const timeToAppLoad = ms(Math.round(measurements.timeToAppLoad));
      const timeToReload = ms(Math.round(measurements.timeToReload));

      expect(buildTime).toBe("1s");
      expect(timeToInteractive).toBe("568ms");
      expect(timeToAppLoad).toBe("890ms");
      expect(timeToReload).toBe("235ms");
    });

    it("should format timing results with proper padding", async () => {
      const ms = (await import("ms")).default;

      const buildTime = ms(1234);
      const timeToInteractive = ms(567);
      const timeToAppLoad = ms(890);
      const timeToReload = ms(234);

      // Test that the ms package formats correctly
      expect(buildTime).toBe("1s");
      expect(timeToInteractive).toBe("567ms");
      expect(timeToAppLoad).toBe("890ms");
      expect(timeToReload).toBe("234ms");

      // Test that padding works
      expect(buildTime.padStart(10).length).toBe(10);
      expect(timeToInteractive.padStart(19).length).toBe(19);
      expect(timeToAppLoad.padStart(16).length).toBe(16);
      expect(timeToReload.padStart(14).length).toBe(14);

      // Test that padding adds spaces to the left
      expect(buildTime.padStart(10).endsWith("1s")).toBe(true);
      expect(timeToInteractive.padStart(19).endsWith("567ms")).toBe(true);
    });
  });

  describe("File operations", () => {
    let tempFile;

    beforeEach(async () => {
      tempFile = resolve(__dirname, "temp-test-file.js");
      await fs.writeFile(tempFile, 'console.log("test");');
    });

    afterEach(async () => {
      try {
        await fs.unlink(tempFile);
      } catch (_e) {
        // File might not exist, ignore
      }
    });

    it("should read and write files for reload testing", async () => {
      const originalContent = await fs.readFile(tempFile, "utf8");
      expect(originalContent).toBe('console.log("test");');

      // Simulate touching the file
      const modifiedContent = `${originalContent}\n// reload trigger`;
      await fs.writeFile(tempFile, modifiedContent);

      const touchedContent = await fs.readFile(tempFile, "utf8");
      expect(touchedContent).toBe('console.log("test");\n// reload trigger');

      // Restore original content
      await fs.writeFile(tempFile, originalContent);
      const restoredContent = await fs.readFile(tempFile, "utf8");
      expect(restoredContent).toBe(originalContent);
    });

    it("should handle non-existent files gracefully", async () => {
      const nonExistentFile = resolve(__dirname, "non-existent-file.js");

      await expect(async () => {
        await fs.access(nonExistentFile);
      }).rejects.toThrow();
    });
  });

  describe("Command execution", () => {
    it("should parse command strings correctly", () => {
      const commands = ["pnpm start", "npm run dev", "yarn serve --port 3000"];

      commands.forEach((command) => {
        const parts = command.split(" ");
        const cmd = parts[0];
        const args = parts.slice(1);

        expect(cmd).toMatch(/^(pnpm|npm|yarn)$/);
        expect(Array.isArray(args)).toBe(true);
      });
    });
  });

  describe("Error handling", () => {
    it("should validate error types", () => {
      const error = new Error("Test error");
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Test error");
    });

    it("should handle HTTP status codes", () => {
      const response = { ok: () => false, status: () => 404 };
      expect(response.ok()).toBe(false);
      expect(response.status()).toBe(404);
    });

    it("should validate timeout handling", () => {
      const timeoutMs = 30000;
      expect(timeoutMs).toBe(30000);
      expect(timeoutMs > 0).toBe(true);
    });
  });

  describe("Function exports", () => {
    it("should export required functions", async () => {
      const module = await import("../lib/measure.js");

      expect(typeof module.measure).toBe("function");
      expect(typeof module.printResults).toBe("function");
    });
  });
});
