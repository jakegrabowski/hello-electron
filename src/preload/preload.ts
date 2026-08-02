import { contextBridge, ipcRenderer } from 'electron';
import type { AppApi } from '../shared/api';
import { READ_DIR_CHANNEL } from '../shared/ipc-channels';

const api: AppApi = {
  readDir: () => ipcRenderer.invoke(READ_DIR_CHANNEL),
};

contextBridge.exposeInMainWorld('app', api);
