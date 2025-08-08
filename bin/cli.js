import { cleanupBrowser } from "../lib/browser.js";
import { setLogLevel } from "../lib/log.js";
import { formatResults, measure } from "../lib/measure.js";
import program from "../lib/program.js";
import { terminateServer } from "../lib/server.js";

// Parse arguments and run measurement
program.parse();
const options = program.opts();
// get defaults like this: const DEFAULTS = program.options.map((option) => option.defaultValue);

setLogLevel(options.level);

["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\nReceived ${signal}, cleaning up...`);
    await terminateServer();
    await cleanupBrowser();
    process.exit(0);
  });
});

try {
  let results = await measure(options);

  console.log(
    `
Measurement completed successfully!

# Performance Results

${formatResults(results)}

`,
  );
  process.exit(0);
} catch (err) {
  console.error("Measurement failed");
  console.error(err);
  process.exit(1);
}
