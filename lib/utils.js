import { Transform } from "node:stream";

export class PrefixedTransform extends Transform {
  constructor(prefix, color = null) {
    super({ objectMode: false });
    this.prefix = prefix;
    this.color = color;
    this.buffer = "";
  }

  _formatPrefix(text) {
    return this.color
      ? `\x1b[${this.color}m[${this.prefix}]\x1b[0m ${text}\n`
      : `[${this.prefix}] ${text}\n`;
  }

  _transform(chunk, _encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        this.push(this._formatPrefix(line));
      }
    }
    callback();
  }

  _flush(callback) {
    if (this.buffer.trim()) {
      this.push(this._formatPrefix(this.buffer));
    }
    callback();
  }
}

const formatter = Intl.NumberFormat("en-US", {
  style: "unit",
  unit: "millisecond",
});

export function formatMs(timeMs) {
  return formatter.format(Math.round(timeMs));
}
