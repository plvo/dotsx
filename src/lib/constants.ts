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
    },
  },
  SYMLINKS: path.resolve(DOTSX_PATH, 'symlinks'),
  TERMINAL: {
    PATH: path.resolve(DOTSX_PATH, 'terminal'),
    ZSHRC: path.resolve(DOTSX_PATH, 'terminal', '.zshrc') satisfies string,
    BASHRC: path.resolve(DOTSX_PATH, 'terminal', '.bashrc') satisfies string,
    TMUX_CONF: path.resolve(DOTSX_PATH, 'terminal', '.tmux.conf') satisfies string,
  },
} as const;
