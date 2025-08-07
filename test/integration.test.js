import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import { beforeAll, beforeEach, afterEach, afterAll, describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const emberAppPath = resolve(projectRoot, "test-ember-app");

describe("Integration Tests", () => {
  beforeAll(async () => {
    // Ensure Ember app dependencies are installed
    try {
      await fs.access(resolve(emberAppPath, "node_modules"));
    } catch {
      console.log("Installing Ember app dependencies...");
      await execa("pnpm", ["install"], { cwd: emberAppPath });
    }
  }, 60000);

  describe("CLI tool", () => {
    it("should show help message", async () => {
      const result = await execa("node", ["bin/build-start-rebuild-perf", "--help"], {
        cwd: projectRoot,
      });

      expect(result.stdout).toContain("Measures build and load performance for web applications");
      expect(result.stdout).toContain("--url");
      expect(result.stdout).toContain("--file");
      expect(result.stdout).toContain("--command");
      expect(result.stdout).toContain("--wait-for");
    });

    it("should validate required dependencies are available", async () => {
      const packageJsonPath = resolve(projectRoot, "package.json");
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

      expect(packageJson.dependencies).toHaveProperty("puppeteer-core");
      expect(packageJson.dependencies).toHaveProperty("chrome-launcher");
      expect(packageJson.dependencies).toHaveProperty("execa");
      expect(packageJson.dependencies).toHaveProperty("strip-ansi");
    });

    it("should have executable bin script", async () => {
      const binPath = resolve(projectRoot, "bin/build-start-rebuild-perf");
      const binContent = await fs.readFile(binPath, "utf8");

      expect(binContent).toContain("#!/usr/bin/env node");
      expect(binContent).toContain("measure");
    });
  });

  describe("Ember test app", () => {
    // Clean up any leftover ember processes before and after each test
    beforeEach(async () => {
      try {
        await execa("pkill", ["-f", "ember"], { reject: false });
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch {
        // Ignore errors - no processes to kill is fine
      }
    });

    afterEach(async () => {
      try {
        // More aggressive cleanup
        await execa("pkill", ["-9", "-f", "ember"], { reject: false });
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch {
        // Ignore errors - no processes to kill is fine
      }
    });

    it("should have valid package.json", async () => {
      const packageJsonPath = resolve(emberAppPath, "package.json");
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

      expect(packageJson.name).toBe("test-ember-app");
      expect(packageJson.scripts).toHaveProperty("start");
      expect(packageJson.scripts).toHaveProperty("build");
      expect(packageJson.devDependencies).toHaveProperty("ember-cli");
      expect(packageJson.devDependencies).toHaveProperty("ember-source");
    });

    it("should build successfully", async () => {
      const result = await execa("pnpm", ["run", "build"], {
        cwd: emberAppPath,
        timeout: 120000, // 2 minutes timeout for build
      });

      expect(result.exitCode).toBe(0);

      // Check that dist directory was created
      const distPath = resolve(emberAppPath, "dist");
      await expect(fs.access(distPath)).resolves.not.toThrow();
    }, 120000);

    it("should have proper file structure", async () => {
      const expectedFiles = [
        "app/app.js",
        "app/router.js",
        "app/index.html",
        "app/templates/application.hbs",
        "ember-cli-build.js",
        "config/environment.js",
      ];

      for (const file of expectedFiles) {
        const filePath = resolve(emberAppPath, file);
        await expect(fs.access(filePath)).resolves.not.toThrow();
      }
    });

    // This test requires Chrome to be available and may be flaky in CI
    it("should start server and be accessible", async () => {
      const controller = new AbortController();
      let serverProcess;

      try {
        // Start the Ember server with detached mode for proper process group management
        serverProcess = execa("pnpm", ["start"], {
          cwd: emberAppPath,
          cancelSignal: controller.signal,
          detached: true,
        });

        // Wait for server to start by looking for build success
        await new Promise((resolve, reject) => {
          let hasSeenBuild = false;
          const timeout = setTimeout(() => {
            reject(new Error("Server start timeout after 20 seconds"));
          }, 20000);

          const checkOutput = (data) => {
            const output = data.toString();
            
            // First look for build completion
            if (output.includes("Build successful") || output.includes("built in")) {
              hasSeenBuild = true;
            }
            
            // Then look for server ready message
            if (hasSeenBuild && (
                output.includes("Serving on") || 
                output.includes("http://localhost:4200")
            )) {
              clearTimeout(timeout);
              resolve();
            }
          };

          serverProcess.stdout?.on("data", checkOutput);
          serverProcess.stderr?.on("data", checkOutput);

          serverProcess.catch((error) => {
            if (error.name !== "AbortError" && !error.isCanceled) {
              clearTimeout(timeout);
              reject(error);
            }
          });
        });

        // Server should be running now
        expect(serverProcess.killed).toBe(false);
        expect(serverProcess.pid).toBeTypeOf("number");
      } finally {
        // Clean up - use aggressive process termination
        if (serverProcess && serverProcess.pid && !serverProcess.killed) {
          try {
            // First try graceful shutdown
            controller.abort();
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // If still running, force kill the process group
            if (!serverProcess.killed) {
              try {
                // Kill the entire process group (negative PID)
                process.kill(-serverProcess.pid, 'SIGTERM');
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Force kill if still running
                if (!serverProcess.killed) {
                  process.kill(-serverProcess.pid, 'SIGKILL');
                }
              } catch (killError) {
                // Fallback to killing just the main process
                try {
                  serverProcess.kill('SIGTERM');
                  await new Promise(resolve => setTimeout(resolve, 500));
                  if (!serverProcess.killed) {
                    serverProcess.kill('SIGKILL');
                  }
                } catch (fallbackError) {
                  console.warn('Failed to kill server process:', fallbackError.message);
                }
              }
            }
          } catch (cleanupError) {
            console.warn('Error during server cleanup:', cleanupError.message);
          }
        }
      }
    }, 30000);
  });

  describe("File structure validation", () => {
    it("should have all required project files", async () => {
      const expectedFiles = [
        "package.json",
        "bin/build-start-rebuild-perf",
        "lib/measure.js",
        "vitest.config.js",
        "test/performance-measurement.test.js",
        "test/integration.test.js",
        "test-ember-app/package.json",
      ];

      for (const file of expectedFiles) {
        const filePath = resolve(projectRoot, file);
        await expect(fs.access(filePath)).resolves.not.toThrow();
      }
    });

    it("should have correct module type configuration", async () => {
      const packageJsonPath = resolve(projectRoot, "package.json");
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));

      expect(packageJson.type).toBe("module");
      expect(packageJson.bin).toHaveProperty("build-start-rebuild-perf");
    });
  });
});

// Global cleanup after all tests
afterAll(async () => {
  try {
    // Kill any remaining ember processes  
    await execa("pkill", ["-f", "ember"], { reject: false });
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch {
    // Ignore errors
  }
});
