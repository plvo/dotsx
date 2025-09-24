import os from 'node:os';
import path from 'node:path';

export const REGISTRY_PATH: string = path.resolve(process.cwd(), 'registry');

export const REGISTRY_DIR = {
  BIN: path.resolve(REGISTRY_PATH, 'bin') satisfies string,
  IDE: path.resolve(REGISTRY_PATH, 'ide') satisfies string,
  OS: path.resolve(REGISTRY_PATH, 'os') satisfies string,
  TERMINAL: path.resolve(REGISTRY_PATH, 'terminal') satisfies string,
} as const;

export const DOTSX_PATH: string = path.resolve(os.homedir(), '.dotsx');

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
