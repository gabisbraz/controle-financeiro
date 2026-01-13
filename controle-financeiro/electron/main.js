const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let serverProcess = null;

function isServerRunning() {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.get('http://localhost:3000', (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const running = await isServerRunning();
    if (running) {
      console.log('✅ Servidor está rodando!');
      return true;
    }
    console.log(`⏳ Aguardando servidor... (tentativa ${i + 1}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

async function startServer() {
  return new Promise((resolve) => {
    // Verificar se o servidor já está rodando
    isServerRunning().then((running) => {
      if (running) {
        console.log('✅ Servidor já está rodando!');
        resolve();
        return;
      }

      // Iniciar o servidor
      const serverScript = path.join(__dirname, '../backend/server.js');
      console.log('🚀 Iniciando servidor backend...');
      console.log('📂 Script:', serverScript);

      // Usar node diretamente para executar o servidor
      serverProcess = spawn('node', [serverScript], {
        env: { ...process.env, PORT: 3000 },
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '../backend')
      });

      let serverOutput = '';
      
      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        serverOutput += output;
        console.log(`[Servidor] ${output.trim()}`);
        if (output.includes('API rodando')) {
          resolve();
        }
      });

      serverProcess.stderr.on('data', (data) => {
        console.error(`[Servidor Error] ${data}`);
      });

      serverProcess.on('error', (err) => {
        console.error('❌ Erro ao iniciar servidor:', err);
      });

      serverProcess.on('close', (code) => {
        if (code !== 0) {
          console.log(`⚠️ Servidor encerrado com código ${code}`);
        }
      });

      // Timeout de segurança
      setTimeout(() => {
        if (serverOutput.includes('API rodando')) {
          resolve();
        }
      }, 10000);
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'Controle Financeiro',
    icon: path.join(__dirname, 'icons/icon.icns'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true
    },
    show: false,
    backgroundColor: '#f3f4f6'
  });

  // Detectar se estamos no Electron
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.executeJavaScript(`
      try {
        window.isElectron = true;
        localStorage.setItem('electron', 'true');
      } catch(e) {
        console.log('localStorage não disponível:', e);
        window.isElectron = true;
      }
    `).catch(() => {});
  });

  // Carregar a interface
  const url = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../frontend/index.html')}`;
    
  console.log(`📱 Carregando interface: ${url}`);
  mainWindow.loadURL(url);

  // Mostrar janela quando estiver pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    console.log('✅ Janela principal aberta!');
  });

  // Tratar erros de carregamento
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('❌ Erro ao carregar página:', errorCode, errorDescription);
  });

  // Abrir links externos no navegador padrão
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  console.log('🚀 Electron pronto!');
  
  // Sempre tentar iniciar o servidor automaticamente
  console.log('📦 Iniciando servidor backend...');
  await startServer();
  
  // Aguardar servidor estar pronto
  const servidorOk = await waitForServer(15);
  
  if (servidorOk) {
    createWindow();
  } else {
    console.error('❌ Servidor não iniciou corretamente!');
    // Ainda assim criar a janela para mostrar erro
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

