import type { Domain } from '@/types';

export const cursorDomain: Domain = {
  name: 'cursor',
  type: 'ide',
  availableOs: ['debian', 'macos'],
  pathToSearch: {
    debian: ['~/.config/Cursor/'],
    macos: ['~/Library/Application Support/Cursor/'],
  },
  symlinkPaths: {
    debian: [
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