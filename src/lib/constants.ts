import os from 'node:os';
import path from 'node:path';

export const DOTFILES_PATH: string = path.resolve(os.homedir(), '.dotsx');

export const DOTFILE_PATH_DIRS = {
  CORE: path.resolve(DOTFILES_PATH, 'core') satisfies string,
  IDE: path.resolve(DOTFILES_PATH, 'ide') satisfies string,
  BIN: path.resolve(DOTFILES_PATH, 'bin') satisfies string,
  LINKS: path.resolve(DOTFILES_PATH, 'links') satisfies string,
  TERMINAL: path.resolve(DOTFILES_PATH, 'terminal') satisfies string,
} as const;
