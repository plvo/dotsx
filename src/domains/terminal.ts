import type { Domain } from '@/types';

export const zshDomain: Domain = {
  name: 'zsh',
  type: 'terminal',
  distro: null,
  symlinkPaths: {
    linux: ['~/.zshrc'],
    macos: ['~/.zshrc'],
  },
};

export const tmuxDomain: Domain = {
  name: 'tmux',
  type: 'terminal',
  distro: null,
  symlinkPaths: {
    linux: ['~/.tmux.conf'],
    macos: ['~/.tmux.conf'],
  },
};

export const bashDomain: Domain = {
  name: 'bash',
  type: 'terminal',
  distro: null,
  symlinkPaths: {
    linux: ['~/.bashrc'],
    macos: ['~/.bashrc'],
  },
};
