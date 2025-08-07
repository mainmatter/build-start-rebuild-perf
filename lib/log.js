let logLevel = "warn";

/**
 * @param level {'log' | 'warn'  | 'error'}
 */
export function setLogLevel(level) {
  logLevel = level;
}

export function log(message) {
  if (logLevel === "log") {
    console.log(message);
  }
}

export function warn(message) {
  if (logLevel === "log" || logLevel === "warn") {
    console.warn(message);
  }
}

export function error(message) {
  console.error(message);
}
