export const TIMEOUTS = {
  SERVER_START: 30000,
  PAGE_LOAD: 30000,
  SERVER_SHUTDOWN: 3000,
  NETWORK_IDLE: 500,
};

export const DEFAULT_OPTIONS = {
  url: "http://localhost:4200",
  file: null,
  command: "pnpm start",
  waitFor: "body",
};
