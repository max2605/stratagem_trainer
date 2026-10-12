'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trainer', Object.freeze({
  platform: process.platform,
  downloadPack: (url) => ipcRenderer.invoke('trainer:download-pack', url),
}));
