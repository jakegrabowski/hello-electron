/**
 * JSON-RPC 2.0 protocol types, shared by the WSL helper server and the Windows
 * client. Transport is newline-delimited JSON over a localhost TCP socket.
 */

export const RPC_METHODS = {
  listDir: 'fs.listDir',
} as const;

export interface RpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

export interface RpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface RpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: RpcError;
}

/** Parameters for the `fs.listDir` method. `path` defaults to WSL `$HOME`. */
export interface ListDirParams {
  path?: string;
}
