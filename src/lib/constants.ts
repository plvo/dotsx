import os from 'node:os';
import path from 'node:path';

export const DOTX_PATH: string = path.resolve(os.homedir(), '.dotsx');

export const DOTX_DIR = {
  BIN: path.resolve(DOTX_PATH, 'bin') satisfies string,
  CORE: path.resolve(DOTX_PATH, 'core') satisfies string,
  IDE: path.resolve(DOTX_PATH, 'ide') satisfies string,
  LINKS: path.resolve(DOTX_PATH, 'links') satisfies string,
  TERMINAL: path.resolve(DOTX_PATH, 'terminal') satisfies string,
} as const;

export const DOTX_FILE = {
  BIN_ALIAS: path.resolve(DOTX_DIR.BIN, '_dotsx-bin.aliases') satisfies string,
  CORE_DEBIAN_APT: path.resolve(DOTX_DIR.CORE, 'debian', 'apt.txt') satisfies string,
  CORE_DEBIAN_SNAP: path.resolve(DOTX_DIR.CORE, 'debian', 'snap.txt') satisfies string,
} as const;
