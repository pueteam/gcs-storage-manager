/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { Storage } from '@google-cloud/storage';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let storage: Storage | null = null;

ipcMain.handle('select-credentials-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('save-config', async (event, config) => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config));

  // Initialize Storage instance with new config
  storage = new Storage({
    projectId: config.projectId,
    keyFilename: config.credentialsFile,
  });
});

ipcMain.handle('load-config', async () => {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);

    // Initialize Storage instance with loaded config
    storage = new Storage({
      projectId: config.projectId,
      keyFilename: config.credentialsFile,
    });

    return config;
  }
  return null;
});

ipcMain.handle('list-buckets', async () => {
  if (!storage) throw new Error('Storage not initialized');

  try {
    const [buckets] = await storage.getBuckets();
    return buckets.map((bucket) => bucket.name);
  } catch (error) {
    console.error('Error listing buckets:', error);
    throw error;
  }
});

ipcMain.handle('list-files', async (event, bucketName, prefix = '') => {
  if (!storage) throw new Error('Storage not initialized');

  try {
    const [files] = await storage
      .bucket(bucketName)
      .getFiles({ prefix, delimiter: '/' });
    const [f, nextQuery, folders] = await storage
      .bucket(bucketName)
      .getFiles({ prefix, delimiter: '/', autoPaginate: false });

    const fileDetails = await Promise.all(
      files
        .filter((file) => file.name !== prefix) // Exclude the current directory
        .map(async (file) => {
          const [metadata] = await file.getMetadata();
          return {
            name: path.basename(file.name),
            size: parseInt(metadata.size),
            updated: metadata.updated,
            isFolder: false,
          };
        }),
    );

    const folderDetails =
      folders.prefixes?.map((folderName: string) => ({
        name: path.basename(folderName),
        size: 0,
        updated: '',
        isFolder: true,
      })) || [];

    return [...folderDetails, ...fileDetails];
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
});

ipcMain.handle(
  'upload-file',
  async (event, { bucketName, filePath, destination }) => {
    if (!storage) throw new Error('Storage not initialized');

    try {
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(destination);

      const fileStream = fs.createReadStream(filePath);
      const totalSize = fs.statSync(filePath).size;
      let uploadedSize = 0;

      const uploadStream = file.createWriteStream({
        resumable: false,
        validation: false,
      });

      fileStream.on('data', (chunk) => {
        uploadedSize += chunk.length;
        const progress = Math.round((uploadedSize / totalSize) * 100);
        event.sender.send('upload-progress', {
          fileName: path.basename(filePath),
          progress,
        });
      });

      await new Promise((resolve, reject) => {
        fileStream.pipe(uploadStream).on('error', reject).on('finish', resolve);
      });

      return true;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },
);

ipcMain.handle('download-file', async (event, { bucketName, filePath }) => {
  if (!storage) throw new Error('Storage not initialized');

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    // Get the file metadata to know the total size
    const [metadata] = await file.getMetadata();
    const totalSize = parseInt(metadata.size);

    const downloadPath = path.join(
      app.getPath('downloads'),
      path.basename(filePath),
    );
    const writeStream = fs.createWriteStream(downloadPath);

    let downloadedSize = 0;

    // Create a read stream from the file
    const readStream = file.createReadStream();

    // Pipe the read stream to the write stream
    readStream.pipe(writeStream);

    // Listen for data events to track progress
    readStream.on('data', (chunk) => {
      downloadedSize += chunk.length;
      const progress = Math.round((downloadedSize / totalSize) * 100);
      event.sender.send('download-progress', { filePath, progress });
    });

    // Wait for the download to complete
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      readStream.on('error', reject);
    });

    return downloadPath;
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
});

ipcMain.handle('delete-file', async (event, { bucketName, filePath }) => {
  if (!storage) throw new Error('Storage not initialized');

  try {
    await storage.bucket(bucketName).file(filePath).delete();
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
});

ipcMain.handle('create-folder', async (event, { bucketName, folderPath }) => {
  if (!storage) throw new Error('Storage not initialized');

  try {
    // Create an empty file with the folder name ending in a slash
    await storage
      .bucket(bucketName)
      .file(folderPath + '/')
      .save('');
    return true;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
});

ipcMain.handle('create-folder-tree', async (event, { bucketName, path }) => {
  if (!storage) throw new Error('Storage not initialized');

  try {
    let p = path;
    if (path.startsWith('/')) {
      p = p.substring(1);
    }
    await storage
      .bucket(bucketName)
      .file(p + '/')
      .save('');
    return true;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
});

ipcMain.handle('delete-folder', async (event, { bucketName, path }) => {
  if (!storage) throw new Error('Storage not initialized');

  try {
    await storage.bucket(bucketName).deleteFiles({
      prefix: path + '/',
    });
    return true;
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
});

ipcMain.handle(
  'rename-folder',
  async (event, { bucketName, oldPath, newName }) => {
    if (!storage) throw new Error('Storage not initialized');

    try {
      const [files] = await storage.bucket(bucketName).getFiles({
        prefix: oldPath + '/',
      });

      for (const file of files) {
        const newPath = file.name.replace(
          oldPath,
          oldPath.split('/').slice(0, -1).concat(newName).join('/'),
        );
        await storage.bucket(bucketName).file(file.name).move(newPath);
      }

      return true;
    } catch (error) {
      console.error('Error renaming folder:', error);
      throw error;
    }
  },
);

ipcMain.handle('get-file-details', async (event, { bucketName, filePath }) => {
  if (!storage) throw new Error('Storage not initialized');

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    const [metadata] = await file.getMetadata();

    return {
      name: file.name,
      size: parseInt(metadata.size),
      updated: metadata.updated,
      contentType: metadata.contentType,
      isFolder: file.name.endsWith('/'),
    };
  } catch (error) {
    console.error('Error getting file details:', error);
    throw error;
  }
});

ipcMain.handle('get-file-preview', async (event, { bucketName, filePath }) => {
  if (!storage) throw new Error('Storage not initialized');

  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);
    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType;

    if (contentType.startsWith('image/') || contentType === 'application/pdf') {
      const [fileContents] = await file.download();
      return {
        contentType,
        data: fileContents.toString('base64'),
      };
    } else {
      throw new Error('File type not supported for preview');
    }
  } catch (error) {
    console.error('Error getting file preview:', error);
    throw error;
  }
});

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

ipcMain.handle('get-folder-structure', async (event, { bucketName }) => {
  if (!storage) throw new Error('Storage not initialized');

  try {
    const [files] = await storage.bucket(bucketName).getFiles();

    const folderSet = new Set<string>();

    // Normalize paths and collect all folder paths
    files.forEach((file) => {
      const filePath = file.name;

      // Normalize the path by removing trailing slash
      const normalizedPath = filePath.endsWith('/')
        ? filePath.slice(0, -1)
        : filePath;

      const parts = normalizedPath.split('/');
      let currentPath = '';
      parts.forEach((part, index) => {
        currentPath += (currentPath ? '/' : '') + part;
        if (index < parts.length - 1 || filePath.endsWith('/')) {
          folderSet.add(currentPath);
        }
      });
    });

    // Convert Set to Array and sort
    const sortedFolders = Array.from(folderSet).sort();

    // Build tree structure
    const root: FolderNode = { name: bucketName, path: '', children: [] };
    const folderMap = new Map<string, FolderNode>();
    folderMap.set('', root);

    sortedFolders.forEach((folderPath) => {
      const parts = folderPath.split('/');
      const name = parts[parts.length - 1];
      const parentPath = parts.slice(0, -1).join('/');

      const node: FolderNode = { name, path: folderPath, children: [] };
      folderMap.set(folderPath, node);

      const parent = folderMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
      } else if (folderPath !== '') {
        root.children.push(node);
      }
    });

    return root;
  } catch (error) {
    console.error('Error getting folder structure:', error);
    throw error;
  }
});

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1600,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
