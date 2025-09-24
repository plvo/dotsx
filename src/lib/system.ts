import os from 'node:os';
import path from 'node:path';
import type { OsType, SystemInfo } from '@/types';
import { DOTSX_PATH } from './constants.ts';
import { FileLib } from './file.ts';

export const SystemLib = {
  isInitialized(): boolean {
    return FileLib.isDirectory(DOTSX_PATH);
  },

  getOs(): string {
    // Possible values are 'aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', and 'win32'.
    return os.platform();
  },

  getCurrentOsType(): OsType {
    const platform = this.getOs();
    switch (platform) {
      case 'linux':
        // Could enhance this to detect specific distros
        return 'debian';
      case 'darwin':
        return 'macos';
      default:
        return 'debian'; // Default fallback
    }
  },

  getArch(): string {
    return os.arch();
  },

  detectShell(): string {
    return process.env.SHELL?.split('/').pop() || 'unknown';
  },

  getRcFilePath(): string {
    const home = os.homedir();
    const shell = this.detectShell();

    return shell === 'zsh'
      ? path.resolve(home, '.zshrc')
      : shell === 'bash'
        ? path.resolve(home, '.bashrc')
        : path.resolve(home, '.bashrc');
  },

  getSystemInfo(): SystemInfo {
    const osInfo = `${os.platform()} ${os.arch()}`;

    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
    const usedMem = (Number(totalMem) - Number(freeMem)).toFixed(1);
    const memPercent = Math.round((Number(usedMem) / Number(totalMem)) * 100);

    const shell = this.detectShell();
    const rcFile = this.getRcFilePath();

    return {
      os: osInfo,
      hostname: os.hostname(),
      memory: `${usedMem}/${totalMem} GB (${memPercent}%)`,
      shell,
      rcFile,
      dotfilesPath: DOTSX_PATH,
    };
  },

  displayInfo() {
    const info = this.getSystemInfo();
    console.log(`🖥️  OS: ${info.os}`);
    console.log(`🏠 Host: ${info.hostname}`);
    console.log(`💾 RAM: ${info.memory}`);
    console.log(`🐚 Detected shell: ${info.shell}`);
    console.log(`📄 RC file: ${info.rcFile}`);
    console.log(`📁 Path: ${info.dotfilesPath}`);
  },
};
