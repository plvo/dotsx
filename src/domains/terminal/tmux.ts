import type { Domain } from '@/types';

export const tmuxDomain: Domain = {
  name: 'tmux',
  type: 'terminal',
  availableOs: ['debian', 'macos'],
  symlinkPaths: {
    debian: ['~/.tmux.conf'],
    macos: ['~/.tmux.conf'],
  },
};
