import { describe, expect, test } from 'bun:test';
import os from 'node:os';
import path from 'node:path';
import { DOTSX, DOTSX_PATH } from '../../../src/lib/constants';

describe('Constants', () => {
  describe('DOTSX_PATH', () => {
    test('should resolve to home directory with .dotsx', () => {
      const expectedPath = path.resolve(os.homedir(), '.dotsx');
      expect(DOTSX_PATH).toBe(expectedPath);
    });

    test('should be an absolute path', () => {
      expect(path.isAbsolute(DOTSX_PATH)).toBe(true);
    });
  });

  describe('DOTSX.BIN', () => {
    test('should have correct bin path', () => {
      const expectedPath = path.resolve(DOTSX_PATH, 'bin');
      expect(DOTSX.BIN.PATH).toBe(expectedPath);
    });

    test('should have correct alias file path', () => {
      const expectedPath = path.resolve(DOTSX_PATH, 'bin', '_dotsx-bin.aliases');
      expect(DOTSX.BIN.ALIAS).toBe(expectedPath);
    });
  });

  describe('DOTSX.IDE', () => {
    test('should have correct IDE paths', () => {
      expect(DOTSX.IDE.PATH).toBe(path.resolve(DOTSX_PATH, 'ide'));
      expect(DOTSX.IDE.CURSOR).toBe(path.resolve(DOTSX_PATH, 'ide', 'cursor'));
      expect(DOTSX.IDE.VSCODE).toBe(path.resolve(DOTSX_PATH, 'ide', 'vscode'));
    });
  });

  describe('DOTSX.OS', () => {
    test('should have correct OS path', () => {
      expect(DOTSX.OS.PATH).toBe(path.resolve(DOTSX_PATH, 'os'));
    });

    test('should have correct Debian paths', () => {
      const debianPath = path.resolve(DOTSX_PATH, 'os', 'debian');
      expect(DOTSX.OS.DEBIAN.PATH).toBe(debianPath);
      expect(DOTSX.OS.DEBIAN.APT).toBe(path.resolve(debianPath, 'apt.txt'));
      expect(DOTSX.OS.DEBIAN.SNAP).toBe(path.resolve(debianPath, 'snap.txt'));
    });
  });

  describe('DOTSX.TERMINAL', () => {
    test('should have correct terminal paths', () => {
      const terminalPath = path.resolve(DOTSX_PATH, 'terminal');
      expect(DOTSX.TERMINAL.PATH).toBe(terminalPath);
      expect(DOTSX.TERMINAL.ZSHRC).toBe(path.resolve(terminalPath, '.zshrc'));
      expect(DOTSX.TERMINAL.BASHRC).toBe(path.resolve(terminalPath, '.bashrc'));
      expect(DOTSX.TERMINAL.TMUX_CONF).toBe(path.resolve(terminalPath, '.tmux.conf'));
    });
  });

  describe('DOTSX.SYMLINKS', () => {
    test('should have correct symlinks path', () => {
      expect(DOTSX.SYMLINKS).toBe(path.resolve(DOTSX_PATH, 'symlinks'));
    });
  });

  describe('Path consistency', () => {
    test('all paths should be absolute', () => {
      const allPaths = [
        DOTSX_PATH,
        DOTSX.BIN.PATH,
        DOTSX.BIN.ALIAS,
        DOTSX.IDE.PATH,
        DOTSX.IDE.CURSOR,
        DOTSX.IDE.VSCODE,
        DOTSX.OS.PATH,
        DOTSX.OS.DEBIAN.PATH,
        DOTSX.OS.DEBIAN.APT,
        DOTSX.OS.DEBIAN.SNAP,
        DOTSX.SYMLINKS,
        DOTSX.TERMINAL.PATH,
        DOTSX.TERMINAL.ZSHRC,
        DOTSX.TERMINAL.BASHRC,
        DOTSX.TERMINAL.TMUX_CONF,
      ];

      allPaths.forEach((pathValue) => {
        expect(path.isAbsolute(pathValue)).toBe(true);
      });
    });

    test('all paths should start with DOTSX_PATH', () => {
      const subPaths = [
        DOTSX.BIN.PATH,
        DOTSX.BIN.ALIAS,
        DOTSX.IDE.PATH,
        DOTSX.IDE.CURSOR,
        DOTSX.IDE.VSCODE,
        DOTSX.OS.PATH,
        DOTSX.OS.DEBIAN.PATH,
        DOTSX.OS.DEBIAN.APT,
        DOTSX.OS.DEBIAN.SNAP,
        DOTSX.SYMLINKS,
        DOTSX.TERMINAL.PATH,
        DOTSX.TERMINAL.ZSHRC,
        DOTSX.TERMINAL.BASHRC,
        DOTSX.TERMINAL.TMUX_CONF,
      ];

      subPaths.forEach((pathValue) => {
        expect(pathValue.startsWith(DOTSX_PATH)).toBe(true);
      });
    });
  });
});
