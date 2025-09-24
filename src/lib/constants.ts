import os from 'node:os';
import path from 'node:path';

export const REGISTRY_PATH: string = path.resolve(process.cwd(), 'registry');

export const REGISTRY_DIR = {
  BIN: path.resolve(REGISTRY_PATH, 'bin') satisfies string,
  IDE: path.resolve(REGISTRY_PATH, 'ide') satisfies string,
  OS: path.resolve(REGISTRY_PATH, 'os') satisfies string,
  TERMINAL: path.resolve(REGISTRY_PATH, 'terminal') satisfies string,
} as const;

export const DOTX_PATH: string = path.resolve(os.homedir(), '.dotsx');

export const DOTX_DIR = {
  BIN: path.resolve(DOTX_PATH, 'bin') satisfies string,
  IDE: path.resolve(DOTX_PATH, 'ide') satisfies string,
  OS: path.resolve(DOTX_PATH, 'os') satisfies string,
  SYMLINKS: path.resolve(DOTX_PATH, 'symlinks') satisfies string,
  TERMINAL: path.resolve(DOTX_PATH, 'terminal') satisfies string,
} as const;

export const DOTX_FILE = {
  BIN_ALIAS: path.resolve(DOTX_DIR.BIN, '_dotsx-bin.aliases') satisfies string,
  OS_DEBIAN_APT: path.resolve(DOTX_DIR.OS, 'debian', 'apt.txt') satisfies string,
  OS_DEBIAN_SNAP: path.resolve(DOTX_DIR.OS, 'debian', 'snap.txt') satisfies string,
} as const;

export const OS_CONFIG: Record<string, Record<string, PackageManagerConfig>> = {
  debian: {
    apt: {
      packages: DOTX_FILE.OS_DEBIAN_APT,
      install: 'sudo apt install -y',
      remove: 'sudo apt remove -y',
      status: 'dpkg -l | grep "^ii" | grep -w " %s "',
    },
    snap: {
      packages: DOTX_FILE.OS_DEBIAN_SNAP,
      install: 'sudo snap install',
      remove: 'sudo snap remove',
      status: 'snap list',
    },
  },
};

export const FILES_PATH_TO_CHECK: Record<string, string[]> = {
  'ide/cursor/': [
    '~/.config/Cursor/User/settings.json',
    '~/.config/Cursor/User/keybindings.json',
    '~/.config/Cursor/User/snippets',
    '~/Library/Application Support/Cursor/User/settings.json',
    '~/Library/Application Support/Cursor/User/keybindings.json',
    '~/Library/Application Support/Cursor/User/snippets',
  ],
  'ide/vscode/': [
    '~/.config/Code/User/settings.json',
    '~/.config/Code/User/keybindings.json',
    '~/.config/Code/User/snippets',
    '~/Library/Application Support/Code/User/snippets',
    '~/Library/Application Support/Code/User/keybindings.json',
    '~/Library/Application Support/Code/User/settings.json',
  ],
  'terminal/.zshrc': ['~/.zshrc', '~/Library/Application Support/Terminal/.zshrc', '~/.oh-my-zsh'],
  'terminal/.bashrc': ['~/.bashrc', '~/Library/Application Support/Terminal/.bashrc'],
  'terminal/.tmux.conf': ['~/.tmux.conf', '~/Library/Application Support/Terminal/.tmux.conf'],
};
