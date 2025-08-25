import { resolve } from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 *
 * @param {string[]} extraArgs an array of args to pass to the script
 * @returns
 */
function runCommand(extraArgs) {
  return execa("node", ["../bin/cli.js", "--command", "pnpm start", ...extraArgs], {
    cwd: resolve(import.meta.dirname, "..", "test-ember-app"),
  });
}

describe("CLI Tests", () => {
  describe(
    "Returns result for an Ember CLI app",
    {
      timeout: 120000,
    },
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
        const cmd = await runCommand(["--wait-for", "h1", "--file", "./app/router.js"]);

        console.log(cmd.stdout);
        console.error(cmd.stderr);

        expect(cmd.stdout).toContain("Measurement completed successfully!");
        expect(cmd.stdout).toContain("# Performance Results");
        expect(cmd.stdout).toContain(
          "| Dev Server Ready | First Paint | App Loaded | Reload after change |",
        );
      });

      it("should throw an error if --page-load-timeout is passed as something very low", async () => {
        let cmd;
        try {
          cmd = await runCommand([
            "--wait-for",
            "h1",
            "--file",
            "./app/router.js",
            "--page-load-timeout",
            "100",
          ]);
        } catch (err) {
          expect(err.stderr).toContain(`TimeoutError: Navigation timeout of 100 ms exceeded`);
        }
        // we expect the runCommand to throw. This is to make sure that we go into the catch block and don't "accidentally succeed"
        expect(cmd).to.be.undefined;
      });
    },
  );
});
