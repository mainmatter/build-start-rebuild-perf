import { resolve } from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("CLI Tests", () => {
  describe(
    "Returns result for an Ember CLI app",
    () => {
      const killStrays = async () => {
        try {
          await execa("pkill", ["-9", "-f", "ember"], { reject: false });
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch {}
      };

      beforeEach(killStrays);
      afterEach(killStrays);

      it("should return measurements", async () => {
        const cmd = await execa(
          "node",
          [
            "../bin/cli.js",
            "--command",
            "pnpm start",
            "--wait-for",
            "h1",
            "--file",
            "./app/router.js",
          ],
          {
            cwd: resolve(import.meta.dirname, "..", "test-ember-app"),
          },
        );

        console.log(cmd.stdout);
        console.error(cmd.stderr);

        expect(cmd.stdout).toContain("Measurement completed successfully!");
        expect(cmd.stdout).toContain("# Performance Results");
        expect(cmd.stdout).toContain(
          "| Dev Server Ready | First Paint | App Loaded | Reload after change |",
        );
      });
    },
    {
      timeout: 120000,
    },
  );
});
