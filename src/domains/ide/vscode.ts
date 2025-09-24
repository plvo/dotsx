import type { Domain } from '@/types';

export const vscodeDomain: Domain = {
  name: 'vscode',
  type: 'ide',
  availableOs: ['debian', 'macos'],
  pathToSearch: {
    debian: ['~/.config/Code/'],
    macos: ['~/Library/Application Support/Code/'],
  },
  symlinkPaths: {
    debian: [
      '~/.config/Code/User/settings.json',
      '~/.config/Code/User/keybindings.json',
      '~/.config/Code/User/snippets',
    ],
    macos: [
      '~/Library/Application Support/Code/User/snippets',
      '~/Library/Application Support/Code/User/keybindings.json',
      '~/Library/Application Support/Code/User/settings.json',
    ],
  },
};