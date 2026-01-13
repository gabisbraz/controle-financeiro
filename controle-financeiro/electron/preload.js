const { contextBridge } = require('electron');

// Expor APIs seguras para o renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: () => process.env.ELECTRON_ENV === 'true',
  platform: () => process.platform,
  getAppVersion: () => require('electron').app.getVersion(),
  
  // APIs futuras podem ser adicionadas aqui
  // Exemplo: notifications, file system, etc.
});

