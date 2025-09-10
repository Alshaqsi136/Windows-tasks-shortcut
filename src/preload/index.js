const { contextBridge, ipcRenderer } = require('electron')

// Custom APIs for renderer
const api = {
  // Task management
  loadTasks: () => ipcRenderer.invoke('load-tasks'),
  saveTasks: (tasks) => ipcRenderer.invoke('save-tasks', tasks),
  
  // Task execution
  executeTask: (task) => ipcRenderer.invoke('execute-task', task),
  executeMultipleTasks: (tasks) => ipcRenderer.invoke('execute-multiple-tasks', tasks),
  
  // Task Group Shortcuts
  createTaskGroupShortcut: (groupData) => ipcRenderer.invoke('create-task-group-shortcut', groupData),
  
  // Platform information
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Program management
  getInstalledPrograms: () => ipcRenderer.invoke('get-installed-programs'),
  browseForExecutable: () => ipcRenderer.invoke('browse-for-executable'),
  
  // Window management
  arrangeWindows: (arrangement) => ipcRenderer.invoke('arrange-windows', arrangement)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electronAPI = api
}
