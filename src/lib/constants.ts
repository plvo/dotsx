import { homedir } from 'node:os';

export const DOTFILES_PATH = `${homedir()}/.dotsx`;

export const DOTFILE_PATH_DIRS = {
  CORE: `${DOTFILES_PATH}/core`,
  IDE: `${DOTFILES_PATH}/ide`,
  BIN: `${DOTFILES_PATH}/bin`,
  LINKS: `${DOTFILES_PATH}/links`,
  TERMINAL: `${DOTFILES_PATH}/terminal`,
} as const;
