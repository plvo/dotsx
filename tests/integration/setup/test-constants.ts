import os from 'node:os';
import path from 'node:path';

/**
 * Test-specific constants that dynamically read environment variables
 * This ensures they pick up overridden values in integration tests
 */
export function getTestDOTSX_PATH(): string {
  // If DOTSX_PATH is set, use it directly (it already points to the .dotsx directory)
  // Otherwise, use HOME or homedir and append .dotsx
  return process.env.DOTSX_PATH || path.resolve(process.env.HOME || os.homedir(), '.dotsx');
}

export function getTestDOTSX() {
  const DOTSX_PATH = getTestDOTSX_PATH();

  return {
    BIN: {
      PATH: path.resolve(DOTSX_PATH, 'bin'),
      ALIAS: path.resolve(DOTSX_PATH, 'bin', '_dotsx-bin.aliases'),
    },
    IDE: {
      PATH: path.resolve(DOTSX_PATH, 'ide'),
      CURSOR: path.resolve(DOTSX_PATH, 'ide', 'cursor'),
      VSCODE: path.resolve(DOTSX_PATH, 'ide', 'vscode'),
    },
    OS: {
      PATH: path.resolve(DOTSX_PATH, 'os'),
      DEBIAN: {
        PATH: path.resolve(DOTSX_PATH, 'os', 'debian'),
        APT: path.resolve(DOTSX_PATH, 'os', 'debian', 'apt.txt'),
        SNAP: path.resolve(DOTSX_PATH, 'os', 'debian', 'snap.txt'),
      },
    },
    SYMLINKS: path.resolve(DOTSX_PATH, 'symlinks'),
    TERMINAL: {
      PATH: path.resolve(DOTSX_PATH, 'terminal'),
      ZSHRC: path.resolve(DOTSX_PATH, 'terminal', '.zshrc'),
      BASHRC: path.resolve(DOTSX_PATH, 'terminal', '.bashrc'),
      TMUX_CONF: path.resolve(DOTSX_PATH, 'terminal', '.tmux.conf'),
    },
  } as const;
}