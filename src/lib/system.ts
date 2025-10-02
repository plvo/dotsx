import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { KnownLinuxDistro, OsFamily } from '@/types';

export interface OsInfo {
  platform: NodeJS.Platform;
  family: OsFamily;
  distro?: KnownLinuxDistro | null;
  release?: string | null;
}

export namespace SystemLib {
  export function detectShell(): string {
    return process.env.SHELL ? path.basename(process.env.SHELL) : 'unknown';
  }

  export function getRcFilePath(): string | null {
    const home = os.homedir();
    const shell = detectShell();

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
  }

  export function getLinuxDistro(): KnownLinuxDistro | null {
    try {
      const data = fs.readFileSync('/etc/os-release', 'utf-8');
      const idMatch = data.match(/^ID=(.+)$/m);
      if (idMatch?.[1]) {
        return idMatch[1].replace(/"/g, '').toLowerCase() as KnownLinuxDistro;
      }
    } catch {
      return null;
    }
    return null;
  }

  export function getOsInfo(): OsInfo {
    const platform = os.platform();
    const release = os.release();

    switch (platform) {
      case 'linux': {
        const distro = getLinuxDistro();
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
      case 'win32':
        return { platform, family: 'windows', release, distro: null };
      case 'freebsd':
      case 'openbsd':
      case 'netbsd':
        return { platform, family: 'bsd', release, distro: null };
      case 'aix':
      case 'sunos':
        return { platform, family: 'unix', release, distro: null };
      default:
        return { platform, family: 'unknown', release, distro: null };
    }
  }

  export function getSystemInfo() {
    return {
      ...getOsInfo(),
      arch: os.arch(),
      hostname: os.hostname(),
      shell: detectShell(),
      rcFile: getRcFilePath() ?? 'unknown',
    };
  }
}
