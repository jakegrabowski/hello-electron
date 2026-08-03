/**
 * Buffers a byte stream and yields complete newline-terminated lines. Used by
 * both ends of the RPC channel to frame newline-delimited JSON messages.
 */
export class LineBuffer {
  private buffer = '';

  /** Append a chunk and return any lines that are now complete. */
  push(chunk: string): string[] {
    this.buffer += chunk;
    const lines: string[] = [];
    let newline = this.buffer.indexOf('\n');
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).replace(/\r$/, '');
      this.buffer = this.buffer.slice(newline + 1);
      lines.push(line);
      newline = this.buffer.indexOf('\n');
    }
    return lines;
  }
}
