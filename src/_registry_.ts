

/**
 * Used to check the files path to check
 * <dotsx dir path>: os:  [file path to check]
 */
export const FILES_PATH_TO_CHECK: Record<string, Record<string, string[]>> = {
  'ide/cursor/': {
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
  'ide/vscode/': {
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
  'terminal/.zshrc': {
    debian: ['~/.zshrc'],
    macos: ['~/.zshrc'],
  },
  'terminal/.bashrc': {
    debian: ['~/.bashrc'],
    macos: ['~/.bashrc'],
  },
  'terminal/.tmux.conf': {
    debian: ['~/.tmux.conf'],
    macos: ['~/.tmux.conf'],
  },
};
