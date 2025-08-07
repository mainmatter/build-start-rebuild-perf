import { execa } from "execa";
import stripAnsi from "strip-ansi";
import { TIMEOUTS } from "./constants.js";
import { PrefixedTransform } from "./stream-utils.js";

let server = null;

export async function startServer(options, extraArgs = "") {
  const command = extraArgs ? `${options.command} ${extraArgs}` : options.command;

  console.log(`Starting dev server with: ${command}`);

  server = execa("sh", ["-c", command], {
    cwd: process.cwd(),
    detached: true,
  });
  server.catch((error) => {
    // Ignore expected termination signals (SIGTERM, SIGKILL)
    if (error.signal === "SIGTERM" || error.signal === "SIGKILL" || error.exitCode === 143) {
      return;
    }
    throw error;
  });

  // Setup output pipes with prefixes
  const stdoutPrefix = new PrefixedTransform("Server", "36"); // Cyan
  const stderrPrefix = new PrefixedTransform("Server", "31"); // Red
  server.stdout.pipe(stdoutPrefix).pipe(process.stdout);
  server.stderr.pipe(stderrPrefix).pipe(process.stderr);

  console.log("Waiting for server to start...");

  // Wait for server to be ready by watching output
  await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Server start timeout"));
    }, TIMEOUTS.SERVER_START);

    const urlToMatch = options.url.replace(/\/$/, "");
    const checkOutput = (line) => {
      const output = stripAnsi(line.toString());
      if (output.includes(urlToMatch)) {
        clearTimeout(timeoutId);
        console.log(`Server ready at ${options.url}`);
        resolve();
      }
    };

    server.stdout.on("data", checkOutput);
    server.stderr.on("data", checkOutput);
  });

  return options.url;
}

export async function terminateServer() {
  if (!server) return;

  try {
    console.log("\nTerminating dev server...");

    // Kill the entire process group to ensure all child processes are terminated
    if (server.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {
        // Fallback to killing just the main process
        server.kill("SIGTERM");
      }
    }

    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!server.killed && server.pid) {
          console.log("Force killing server process group...");
          try {
            process.kill(-server.pid, "SIGKILL");
          } catch {
            server.kill("SIGKILL");
          }
        }
        resolve();
      }, TIMEOUTS.SERVER_SHUTDOWN);

      server.on("exit", () => {
        clearTimeout(timeout);
        console.log("Dev server terminated\n");
        setTimeout(resolve, 100);
      });
    });
  } catch (error) {
    console.error("Error terminating server:", error.message);
  }
}
