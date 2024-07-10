import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

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
  | 'list-buckets-with-info'
  | 'navigate-to-config'
  | 'select-directory'
  | 'bulk-upload'
  | 'bulk-upload-progress'
  | 'bulk-upload-complete'
  | 'upload-progress'
  | 'download-progress';

type IpcRendererListener<T> = (event: IpcRendererEvent, ...args: T[]) => void;

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on<T>(channel: Channels, func: IpcRendererListener<T>) {
      const subscription = (_event: IpcRendererEvent, ...args: T[]) =>
        func(_event, ...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    removeListener(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.removeListener(channel, func);
    },
    removeAllListeners(channel: Channels) {
      ipcRenderer.removeAllListeners(channel);
    },
    invoke: (channel: Channels, ...args: unknown[]) =>
      ipcRenderer.invoke(channel, ...args),
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
