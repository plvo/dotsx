import { homedir } from 'node:os';

export const DOTFILES_PATH = `${homedir()}/.dotfiles`;

export const DOTFILE_PATH_DIRS = {
  CORE: `${DOTFILES_PATH}/core`,
  IDE: `${DOTFILES_PATH}/ide`,
  BINS: `${DOTFILES_PATH}/bin`,
  LINKS: `${DOTFILES_PATH}/links`,
} as const;
