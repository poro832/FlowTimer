/**
 * FlowTimer — Electron Preload (contextBridge)
 * 렌더러에서 안전하게 IPC 호출
 */

const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// 패키징 여부 판별
const isPackaged = __dirname.includes('app.asar');

// basePath: AudioManager가 음악 파일 경로를 조합할 때 사용
// 패키징: resources/ 디렉터리 (extraResources로 복사된 위치)
// 개발: 프로젝트 루트 (electron-app/../)
const basePath = isPackaged
  ? path.join(process.resourcesPath) + path.sep
  : path.join(__dirname, '..') + path.sep;

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  getAssetPath: (...segments) => path.join(basePath, ...segments),
  basePath: basePath,
});
