// ===== 黑马记账 · 主进程入口 =====
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import * as db from './db'

function createWindow() {
  const win = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 900,
    minHeight: 620,
    title: '黑马记账',
    autoHideMenuBar: true,
    backgroundColor: '#f5f7fa',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // 开发模式加载本地调试服务，打包后加载构建文件
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// ===== IPC 接口（渲染进程通过 preload 安全调用） =====
ipcMain.handle('db:getCategories', (_e, type) => db.getCategories(type))
ipcMain.handle('db:addCategory', (_e, data) => db.addCategory(data))
ipcMain.handle('db:addRecord', (_e, data) => db.addRecord(data))
ipcMain.handle('db:updateRecord', (_e, data) => db.updateRecord(data))
ipcMain.handle('db:deleteRecord', (_e, id) => db.deleteRecord(id))
ipcMain.handle('db:getRecordsByMonth', (_e, month) => db.getRecordsByMonth(month))
ipcMain.handle('db:getSummary', (_e, month) => db.getSummary(month))
ipcMain.handle('db:getCategoryStats', (_e, month, type) => db.getCategoryStats(month, type))
ipcMain.handle('db:getTrend', (_e, startMonth) => db.getTrend(startMonth))

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
