// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer } from 'electron';

export type Channels =
  | 'ipc-example'
  | 'load-config'
  | 'save-config'
  | 'select-credentials-file'
  | 'list-buckets'
  | 'upload-file'
  | 'download-file'
  | 'delete-file'
  | 'create-folder'
  | 'get-file-details'
  | 'get-file-preview'
  | 'list-files'
  | 'get-folder-structure'
  | 'create-folder-tree'
  | 'rename-folder'
  | 'delete-folder'
  | 'list-buckets-with-info';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on: (channel: string, func: (...args: any[]) => void) =>
      ipcRenderer.on(channel, (_event, ...args) => func(...args)),
    removeListener: (channel: string, func: (...args: any[]) => void) =>
      ipcRenderer.removeListener(channel, (_event, ...args) => func(...args)),
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    openFile: () => ipcRenderer.invoke('select-credentials-file'),
    invoke: (channel: Channels, ...args: unknown[]) =>
      ipcRenderer.invoke(channel, ...args),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
