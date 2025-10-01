import type { Suggestion } from './types';

export const vscodeSuggestion: Suggestion = {
  name: 'vscode',
  type: 'ide',
  hint: 'VSCode is not installed',
  pathsToCheck: {
    linux: [
      '~/.config/Code/User/settings.json',
      '~/.config/Code/User/keybindings.json',
      '~/.config/Code/User/snippets',
    ],
    macos: [
      '~/Library/Application Support/Code/User/settings.json',
      '~/Library/Application Support/Code/User/keybindings.json',
      '~/Library/Application Support/Code/User/snippets',
    ],
  },
};

export const cursorSuggestion: Suggestion = {
  name: 'cursor',
  type: 'ide',
  hint: 'Cursor is not installed',
  pathsToCheck: {
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

export const zshSuggestion: Suggestion = {
  name: 'zsh',
  type: 'terminal',
  hint: 'Zsh is not installed',
  pathsToCheck: {
    linux: ['~/.zshrc'],
    macos: ['~/.zshrc'],
  },
};

export const tmuxSuggestion: Suggestion = {
  name: 'tmux',
  type: 'terminal',
  hint: 'Tmux is not installed',
  pathsToCheck: {
    linux: ['~/.tmux.conf'],
    macos: ['~/.tmux.conf'],
  },
};

export const bashSuggestion: Suggestion = {
  name: 'bash',
  type: 'terminal',
  hint: 'Bash is not installed',
  pathsToCheck: {
    linux: ['~/.bashrc'],
    macos: ['~/.bashrc'],
  },
};
