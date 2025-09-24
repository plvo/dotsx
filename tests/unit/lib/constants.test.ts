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
});
