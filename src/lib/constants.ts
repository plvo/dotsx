import os from 'node:os';
import path from 'node:path';

function getDOTSX_PATH(): string {
  return process.env.DOTSX_PATH || path.resolve(process.env.HOME || os.homedir(), '.dotsx');
}

export const DOTSX_PATH: string = getDOTSX_PATH();

export const DOTSX = {
  BIN: {
    PATH: path.resolve(DOTSX_PATH, 'bin'),
    ALIAS: path.resolve(DOTSX_PATH, 'bin', '_dotsx-bin.aliases') satisfies string,
  },
  IDE: {
    PATH: path.resolve(DOTSX_PATH, 'ide'),
    CURSOR: path.resolve(DOTSX_PATH, 'ide', 'cursor'),
    VSCODE: path.resolve(DOTSX_PATH, 'ide', 'vscode'),
  },
  OS: {
    PATH: path.resolve(DOTSX_PATH, 'os'),
    DEBIAN: {
      PATH: path.resolve(DOTSX_PATH, 'os', 'debian'),
      APT: path.resolve(DOTSX_PATH, 'os', 'debian', 'apt.txt') satisfies string,
      SNAP: path.resolve(DOTSX_PATH, 'os', 'debian', 'snap.txt') satisfies string,
      FLATPAK: path.resolve(DOTSX_PATH, 'os', 'debian', 'flatpak.txt') satisfies string,
    },
    FEDORA: {
      PATH: path.resolve(DOTSX_PATH, 'os', 'fedora'),
      DNF: path.resolve(DOTSX_PATH, 'os', 'fedora', 'dnf.txt') satisfies string,
    },
    ARCH: {
      PATH: path.resolve(DOTSX_PATH, 'os', 'arch'),
      PACMAN: path.resolve(DOTSX_PATH, 'os', 'arch', 'pacman.txt') satisfies string,
      YAY: path.resolve(DOTSX_PATH, 'os', 'arch', 'yay.txt') satisfies string,
    },
    ALPINE: {
      PATH: path.resolve(DOTSX_PATH, 'os', 'alpine'),
      APK: path.resolve(DOTSX_PATH, 'os', 'alpine', 'apk.txt') satisfies string,
    },
    SUSE: {
      PATH: path.resolve(DOTSX_PATH, 'os', 'suse'),
      ZYPPER: path.resolve(DOTSX_PATH, 'os', 'suse', 'zypper.txt') satisfies string,
    },
    MACOS: {
      PATH: path.resolve(DOTSX_PATH, 'os', 'macos'),
      BREW: path.resolve(DOTSX_PATH, 'os', 'macos', 'brew.txt') satisfies string,
    },
  },

  SYMLINKS: path.resolve(DOTSX_PATH, 'symlinks'),

  TERMINAL: {
    PATH: path.resolve(DOTSX_PATH, 'terminal'),
    ZSH: path.resolve(DOTSX_PATH, 'terminal', 'zsh'),
    BASH: path.resolve(DOTSX_PATH, 'terminal', 'bash'),
    TMUX: path.resolve(DOTSX_PATH, 'terminal', 'tmux'),
  },
} as const;
