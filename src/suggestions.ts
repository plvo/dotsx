import type { KnownLinuxDistro, OsFamily } from './types';

type SuggestionType = 'ide' | 'terminal' | 'ai' | 'others';

export interface Suggestion {
  name: string;
  type: SuggestionType;
  hint: string;
  pathsToCheck: Partial<Record<OsFamily | KnownLinuxDistro, string[]>>;
}

const vscodeSuggestion: Suggestion = {
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

const cursorSuggestion: Suggestion = {
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

const zshSuggestion: Suggestion = {
  name: 'zsh',
  type: 'terminal',
  hint: 'Zsh is not installed',
  pathsToCheck: {
    linux: ['~/.zshrc'],
    macos: ['~/.zshrc'],
  },
};

const tmuxSuggestion: Suggestion = {
  name: 'tmux',
  type: 'terminal',
  hint: 'Tmux is not installed',
  pathsToCheck: {
    linux: ['~/.tmux.conf'],
    macos: ['~/.tmux.conf'],
  },
};

const bashSuggestion: Suggestion = {
  name: 'bash',
  type: 'terminal',
  hint: 'Bash is not installed',
  pathsToCheck: {
    linux: ['~/.bashrc'],
    macos: ['~/.bashrc'],
  },
};

const claudeCodeSuggestion: Suggestion = {
  name: 'claude-code',
  type: 'ai',
  hint: 'Claude Code is not configured',
  pathsToCheck: {
    linux: [
      '~/.claude/CLAUDE.md',
      '~/.claude/commands',
      '~/.claude/agents',
      '~/.claude/scripts',
      '~/.claude/settings.json',
      '~/.claude/settings.local.json',
    ],
    macos: [
      '~/.claude/CLAUDE.md',
      '~/.claude/commands',
      '~/.claude/agents',
      '~/.claude/scripts',
      '~/.claude/settings.json',
      '~/.claude/settings.local.json',
    ],
  },
};

export const suggestions = {
  vscodeSuggestion,
  cursorSuggestion,
  zshSuggestion,
  tmuxSuggestion,
  bashSuggestion,
  claudeCodeSuggestion,
};
