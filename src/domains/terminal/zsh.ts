import type { Domain } from '@/types';

export const zshDomain: Domain = {
  name: 'zsh',
  type: 'terminal',
  availableOs: ['debian', 'macos'],
  symlinkPaths: {
    debian: ['~/.zshrc'],
    macos: ['~/.zshrc'],
  },
};
