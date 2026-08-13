// ===== 黑马记账 · 预加载脚本（安全桥接：渲染页面只能通过这里访问数据库） =====
import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getCategories: (type) => ipcRenderer.invoke('db:getCategories', type),
  addCategory: (data) => ipcRenderer.invoke('db:addCategory', data),
  addRecord: (data) => ipcRenderer.invoke('db:addRecord', data),
  updateRecord: (data) => ipcRenderer.invoke('db:updateRecord', data),
  deleteRecord: (id) => ipcRenderer.invoke('db:deleteRecord', id),
  getRecordsByMonth: (month) => ipcRenderer.invoke('db:getRecordsByMonth', month),
  getSummary: (month) => ipcRenderer.invoke('db:getSummary', month),
  getCategoryStats: (month, type) => ipcRenderer.invoke('db:getCategoryStats', month, type),
  getTrend: (startMonth) => ipcRenderer.invoke('db:getTrend', startMonth)
}

contextBridge.exposeInMainWorld('ledger', api)
