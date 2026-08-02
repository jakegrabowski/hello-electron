/**
 * The shape of data exchanged over IPC, shared by main, preload, and renderer.
 * This is the single source of truth for the contextBridge API contract.
 */

export interface DirEntry {
  name: string;
  isDirectory: boolean;
}

export interface DirListing {
  path: string;
  entries: DirEntry[];
}

export interface AppApi {
  readDir(): Promise<DirListing>;
}

declare global {
  interface Window {
    app: AppApi;
  }
}
