import type { Domain } from '@/types';

export const bashDomain: Domain = {
  name: 'bash',
  type: 'terminal',
  availableOs: ['debian', 'macos'],
  symlinkPaths: {
    debian: ['~/.bashrc'],
    macos: ['~/.bashrc'],
  },
};
