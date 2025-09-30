import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Domain, OsInfo, SystemInfo } from '@/types';
import { BACKUP_PATH, DOTSX, DOTSX_PATH } from './constants.ts';
import { FileLib } from './file.ts';

export const DotsxInfoLib = {
  isInitialized(): boolean {
    return FileLib.isDirectory(DOTSX_PATH);
  },

  isBinInitialized(): boolean {
    return FileLib.isDirectory(DOTSX.BIN.PATH);
  },

  getInitializedOs(): string[] | null {
    if (!FileLib.isDirectory(DOTSX.OS.PATH)) {
      return null;
    }
    return FileLib.readDirectory(DOTSX.OS.PATH);
  },

  getInitializedTerminal(): string[] | null {
    if (!FileLib.isDirectory(DOTSX.TERMINAL.PATH)) {
      return null;
    }
    return FileLib.readDirectory(DOTSX.TERMINAL.PATH);
  },

  getInitializedIde(): string[] | null {
    if (!FileLib.isDirectory(DOTSX.IDE.PATH)) {
      return null;
    }
    return FileLib.readDirectory(DOTSX.IDE.PATH);
  },

  hasBackups(): boolean {
    return FileLib.isDirectory(BACKUP_PATH) && FileLib.readDirectory(BACKUP_PATH).length > 0;
  },

  getDotsxPath(domain: Domain, symlinkPath: string, dotsxDirPath: string): string {
    const fileName = path.basename(symlinkPath);
    return path.resolve(dotsxDirPath, domain.name, fileName);
  },

  getDotsxState() {
    const isInitialized = this.isInitialized();
    const isBinInitialized = this.isBinInitialized();
    const isOsInitialized = this.getInitializedOs() !== null;
    const isTerminalInitialized = this.getInitializedTerminal() !== null;
    const isIdeInitialized = this.getInitializedIde() !== null;
    const hasBackups = this.hasBackups();

    return {
      isInitialized,
      isBinInitialized,
      isOsInitialized,
      isTerminalInitialized,
      isIdeInitialized,
      hasBackups,
      isAllInitialized: isBinInitialized && isOsInitialized && isTerminalInitialized && isIdeInitialized,
    };
  },
};

export const SystemLib = {
  detectShell(): string {
    return process.env.SHELL ? path.basename(process.env.SHELL) : 'unknown';
  },

  getRcFilePath(): string | null {
    const home = os.homedir();
    const shell = this.detectShell();

    switch (shell) {
      case 'zsh':
        return path.join(home, '.zshrc');
      case 'bash':
        return path.join(home, '.bashrc');
      case 'fish':
        return path.join(home, '.config', 'fish', 'config.fish');
      case 'ksh':
        return path.join(home, '.kshrc');
      case 'csh':
      case 'tcsh':
        return path.join(home, '.cshrc');
      case 'sh':
        return path.join(home, '.profile');
      default:
        return null;
    }
  },

  getLinuxDistro(): string | null {
    try {
      const data = fs.readFileSync('/etc/os-release', 'utf-8');
      const idMatch = data.match(/^ID=(.+)$/m);
      if (idMatch?.[1]) {
        return idMatch[1].replace(/"/g, '').toLowerCase();
      }
    } catch {
      return null;
    }
    return null;
  },

  getOsInfo(): OsInfo {
    const platform = os.platform();
    const release = os.release();

    switch (platform) {
      case 'linux': {
        const distro = this.getLinuxDistro();
        return { platform, family: 'linux', distro, release };
      }

      case 'darwin': {
        let darwinRelease: string;
        try {
          darwinRelease = execSync('sw_vers -productVersion').toString().trim();
        } catch {
          darwinRelease = release;
        }
        return { platform, family: 'macos', release: darwinRelease, distro: null };
      }

      case 'win32': {
        return { platform, family: 'windows', release, distro: null };
      }

      case 'freebsd':
      case 'openbsd':
      case 'netbsd': {
        return { platform, family: 'bsd', release, distro: null };
      }

      case 'aix':
      case 'sunos': {
        return { platform, family: 'unix', release, distro: null };
      }

      default:
        return { platform, family: 'unknown', release, distro: null };
    }
  },

  getSystemInfo(): SystemInfo {
    return {
      ...this.getOsInfo(),
      arch: os.arch(),
      hostname: os.hostname(),
      shell: this.detectShell(),
      rcFile: this.getRcFilePath() ?? 'unknown',
    };
  },
};
