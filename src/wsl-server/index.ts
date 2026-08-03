import net from 'node:net';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { sortDirEntries } from '../shared/dir';
import type { DirListing } from '../shared/api';
import { RPC_METHODS } from '../shared/rpc/protocol';
import type {
  ListDirParams,
  RpcRequest,
  RpcResponse,
} from '../shared/rpc/protocol';
import { LineBuffer } from '../shared/rpc/framing';

/**
 * WSL helper server.
 *
 * Listens on 127.0.0.1 (loopback only — never exposed to the LAN) and serves
 * JSON-RPC over newline-delimited TCP. Started by the Windows Electron client
 * via `wsl.exe`, or manually in dev for testing.
 *
 * On startup it writes a readiness line to stdout: {"ready":true,"port":N,"pid":P}
 * and persists its PID to .wsl-server.pid for `npm run wsl-server:stop`.
 */

const PID_FILE = path.join(process.cwd(), '.wsl-server.pid');

const listDir = async (params?: ListDirParams): Promise<DirListing> => {
  const dir = params?.path ?? os.homedir();
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  return {
    path: dir,
    entries: sortDirEntries(
      dirents.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
      })),
    ),
  };
};

type Handler = (params: unknown) => Promise<unknown>;

const handlers: Record<string, Handler> = {
  [RPC_METHODS.listDir]: (params) =>
    listDir(params as ListDirParams | undefined),
};

const handleRequest = async (req: RpcRequest): Promise<RpcResponse> => {
  const handler = handlers[req.method];
  if (!handler) {
    return {
      jsonrpc: '2.0',
      id: req.id ?? null,
      error: { code: -32601, message: `Method not found: ${req.method}` },
    };
  }
  try {
    const result = await handler(req.params);
    return { jsonrpc: '2.0', id: req.id, result };
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: req.id,
      error: { code: 1, message: (error as Error).message },
    };
  }
};

const server = net.createServer((socket) => {
  const lines = new LineBuffer();
  socket.on('data', async (chunk: Buffer) => {
    for (const line of lines.push(chunk.toString('utf8'))) {
      if (!line.trim()) continue;
      let req: RpcRequest;
      try {
        req = JSON.parse(line) as RpcRequest;
      } catch {
        continue; // ignore malformed lines
      }
      const res = await handleRequest(req);
      socket.write(`${JSON.stringify(res)}\n`);
    }
  });
});

server.listen(0, '127.0.0.1', () => {
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : -1;
  fs.writeFileSync(PID_FILE, String(process.pid));
  process.stdout.write(
    `${JSON.stringify({ ready: true, port, pid: process.pid })}\n`,
  );
});

const shutdown = (): void => {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    // already gone
  }
  server.close(() => process.exit(0));
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
