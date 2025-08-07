import { Command, Option } from "commander";

// Setup commander
const program = new Command();

program
  .name("build-start-perf-test")
  .description("Measures build and load performance for web applications")
  .option("-u, --url <url>", "URL to load", "http://localhost:4200")
  .option("-f, --file <path>", "File to touch to trigger a reload")
  .option("-c, --command <cmd>", "Command to start dev server", "pnpm start")
  .option("-w, --wait-for <selector>", "Element selector to wait for", "body")
  .addOption(
    new Option("-l, --log-level <level>", "Set the log level", "warn").choices([
      "log",
      "warn",
      "error",
    ]),
  )
  .addHelpText(
    "after",
    `
Measures:
- Build time
- Time to first paint
- Time to app load (waiting for specified element)
- Time to finished reload after file changes

Examples:
  $ build-start-perf-test --url http://localhost:3000 --command "npm run dev"
  $ build-start-perf-test --file app.js --wait-for ".app-container"
`,
  );

export default program;
