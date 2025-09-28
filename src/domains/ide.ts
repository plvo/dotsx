import type { Domain } from '@/types';

export const cursorDomain: Domain = {
  name: 'cursor',
  type: 'ide',
  distro: null,
  availableOs: ['linux', 'macos'],
  symlinkPaths: {
    linux: [
      '~/.config/Cursor/User/settings.json',
      '~/.config/Cursor/User/keybindings.json',
      '~/.config/Cursor/User/snippets',
    ],
    macos: [
      '~/Library/Application Support/Cursor/User/settings.json',
      '~/Library/Application Support/Cursor/User/keybindings.json',
      '~/Library/Application Support/Cursor/User/snippets',
    ],
  },
};

export const vscodeDomain: Domain = {
  name: 'vscode',
  type: 'ide',
  distro: null,
  availableOs: ['linux', 'macos'],
  symlinkPaths: {
    linux: [
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
