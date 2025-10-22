const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  readFile: (p) => ipcRenderer.invoke('fs:readFile', p),
  writeFile: (p, c) => ipcRenderer.invoke('fs:writeFile', p, c),
  listDir: (p) => ipcRenderer.invoke('fs:listDir', p),
  createFile: (p, c) => ipcRenderer.invoke('fs:createFile', p, c),
  deletePath: (p) => ipcRenderer.invoke('fs:deletePath', p),
  renamePath: (o, n) => ipcRenderer.invoke('fs:renamePath', o, n),
  mkdir: (p) => ipcRenderer.invoke('fs:mkdir', p),
  exists: (p) => ipcRenderer.invoke('fs:exists', p),
  watchFolder: (p) => ipcRenderer.send('watch:folder', p),
  onFsChanged: (cb) => ipcRenderer.on('fs:changed', (e, d) => cb(d)),
  // debug feature removed
  // Get current working directory from main
  getCwd: () => ipcRenderer.invoke('app:getCwd'),
  compileFile: (p) => ipcRenderer.invoke('compile:file', p),
  runBinary: (b, input) => ipcRenderer.invoke('run:binary', b, input)
});
