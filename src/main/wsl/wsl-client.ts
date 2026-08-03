/**
 * WSL helper client (WINDOWS-ONLY). Imported lazily from main.ts only when
 * `process.platform === 'win32'`, so it is never loaded on macOS/Linux.
 *
 * Spawns the Node helper server inside WSL2 via `wsl.exe`, reads the port it
 * prints to stdout, connects over loopback (127.0.0.1), and exposes a typed
 * RPC client (currently `listDir`).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️  MUST VERIFY ON WINDOWS (this code is not runtime-testable on Linux):
 *   • `wsl.exe` spawn args work (`-e node <server.js>`); add `-d <distro>` if a
 *     specific distro is needed (default uses the WSL default distro).
 *   • The server.js PATH resolution (see resolveServerPath) — the default
 *     assumes the dev project layout; a packaged app must bundle the server as
 *     a resource and resolve its /mnt/c path. Override with the
 *     HELLO_WSL_SERVER_PATH env var for quick testing.
 *   • Loopback connectivity: Windows app → WSL2 server at localhost (per the
 *     MS WSL networking doc, default in NAT mode).
 *   • Lifecycle: app quit → child killed (no orphaned wsl/node process).
 * ─────────────────────────────────────────────────────────────────────────
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import type { ChildProcess } from 'node:child_process';
import type { DirListing } from '../../shared/api';
import { RPC_METHODS } from '../../shared/rpc/protocol';
import type { RpcResponse } from '../../shared/rpc/protocol';
import { LineBuffer } from '../../shared/rpc/framing';

interface ReadyMessage {
  ready: boolean;
  port: number;
  pid: number;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

/** Convert a Windows path (C:\\foo\\bar) to a WSL /mnt/<drive>/foo/bar path. */
const toWslPath = (winPath: string): string => {
  const match = /^([A-Za-z]):[\\/](.*)$/.exec(winPath);
  if (!match) return winPath; // already POSIX / unknown — return as-is
  return `/mnt/${match[1].toLowerCase()}/${match[2].replace(/\\/g, '/')}`;
};

/**
 * Resolve the WSL-side path to the helper server bundle. Override with
 * HELLO_WSL_SERVER_PATH; otherwise derive from this app's location (dev only).
 */
const resolveServerPath = (): string => {
  const envPath = process.env.HELLO_WSL_SERVER_PATH;
  if (envPath) return envPath;
  // dev layout: __dirname = <root>/.vite/build  →  <root>/dist/wsl-server/index.js
  const projectRoot = path.resolve(__dirname, '..', '..');
  return toWslPath(path.join(projectRoot, 'dist', 'wsl-server', 'index.js'));
};

const readReady = (child: ChildProcess): Promise<ReadyMessage> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('WSL server readiness timeout')),
      15000,
    );
    const lines = new LineBuffer();
    const onStdout = (chunk: Buffer): void => {
      for (const line of lines.push(chunk.toString('utf8'))) {
        let msg: ReadyMessage;
        try {
          msg = JSON.parse(line) as ReadyMessage;
        } catch {
          continue; // not a JSON line
        }
        if (msg.ready && typeof msg.port === 'number') {
          clearTimeout(timer);
          child.stdout?.off('data', onStdout);
          resolve(msg);
          return;
        }
      }
    };
    child.stdout?.on('data', onStdout);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`WSL server exited before ready (code ${code})`));
    });
  });

const connectPort = (port: number): Promise<net.Socket> =>
  new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1');
    socket.once('connect', () => resolve(socket));
    socket.once('error', reject);
  });

export class WslClient {
  private nextId = 0;
  private readonly pending = new Map<number, Pending>();
  private readonly lines = new LineBuffer();

  private constructor(
    private readonly child: ChildProcess,
    private readonly socket: net.Socket,
  ) {
    socket.on('data', (chunk: Buffer) => {
      for (const line of this.lines.push(chunk.toString('utf8'))) {
        if (!line.trim()) continue;
        let res: RpcResponse;
        try {
          res = JSON.parse(line) as RpcResponse;
        } catch {
          continue; // ignore malformed lines
        }
        if (typeof res.id !== 'number') continue;
        const entry = this.pending.get(res.id);
        if (!entry) continue;
        this.pending.delete(res.id);
        if (res.error) {
          entry.reject(new Error(res.error.message));
        } else {
          entry.resolve(res.result);
        }
      }
    });
  }

  static async start(): Promise<WslClient> {
    const args = ['-e', 'node', resolveServerPath()];
    const child = spawn('wsl.exe', args, { windowsHide: true });
    const ready = await readReady(child);
    const socket = await connectPort(ready.port);
    return new WslClient(child, socket);
  }

  async listDir(targetPath?: string): Promise<DirListing> {
    const params = targetPath ? { path: targetPath } : undefined;
    const result = await this.request(RPC_METHODS.listDir, params);
    return result as DirListing;
  }

  private request(method: string, params: unknown): Promise<unknown> {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.write(
        `${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`,
      );
    });
  }

  stop(): void {
    try {
      this.socket.destroy();
    } catch {
      // ignore
    }
    try {
      this.child.kill();
    } catch {
      // ignore
    }
  }
}
