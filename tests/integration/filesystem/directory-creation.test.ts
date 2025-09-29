import { describe, expect, test } from 'bun:test';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FileLib } from '../../../src/lib/file';
import { withIntegrationEnvironment } from '../setup/test-environment';
import { TestFixtures } from '../setup/test-fixtures';

describe('Directory Creation Integration Tests', () => {
  test('should create complete dotsx directory structure', async () => {
    await withIntegrationEnvironment(async ({ dotsxPath }) => {
      const expectedDirs = [
        dotsxPath,
        join(dotsxPath, 'bin'),
        join(dotsxPath, 'ide'),
        join(dotsxPath, 'ide', 'vscode'),
        join(dotsxPath, 'ide', 'cursor'),
        join(dotsxPath, 'os'),
        join(dotsxPath, 'os', 'debian'),
        join(dotsxPath, 'terminal'),
        join(dotsxPath, 'symlinks'),
      ];

      // Create the directory structure using FileLib
      for (const dir of expectedDirs) {
        FileLib.createDirectory(dir);
      }

      // Verify all directories were created
      for (const dir of expectedDirs) {
        expect(existsSync(dir)).toBe(true);
        expect(statSync(dir).isDirectory()).toBe(true);
      }
    });
  });

  test('should handle existing directories gracefully', async () => {
    await withIntegrationEnvironment(async ({ dotsxPath }) => {
      const testDir = join(dotsxPath, 'bin');

      // Create directory twice
      FileLib.createDirectory(testDir);
      FileLib.createDirectory(testDir); // Should not throw

      expect(existsSync(testDir)).toBe(true);
      expect(statSync(testDir).isDirectory()).toBe(true);
    });
  });

  test('should create nested directories recursively', async () => {
    await withIntegrationEnvironment(async ({ dotsxPath }) => {
      const deepPath = join(dotsxPath, 'ide', 'vscode', 'extensions', 'themes');

      FileLib.createDirectory(deepPath);

      expect(existsSync(deepPath)).toBe(true);
      expect(statSync(deepPath).isDirectory()).toBe(true);

      // Verify all parent directories were created
      expect(existsSync(join(dotsxPath, 'ide'))).toBe(true);
      expect(existsSync(join(dotsxPath, 'ide', 'vscode'))).toBe(true);
      expect(existsSync(join(dotsxPath, 'ide', 'vscode', 'extensions'))).toBe(true);
    });
  });

  test('should work with FileLib utility methods', async () => {
    await withIntegrationEnvironment(async ({ dotsxPath }) => {
      const testDir = join(dotsxPath, 'test-dir');

      // Directory should not exist initially
      expect(FileLib.isPathExists(testDir)).toBe(false);
      expect(FileLib.isDirectory(testDir)).toBe(false);

      // Create directory
      FileLib.createDirectory(testDir);

      // Directory should now exist
      expect(FileLib.isPathExists(testDir)).toBe(true);
      expect(FileLib.isDirectory(testDir)).toBe(true);
      expect(FileLib.isFile(testDir)).toBe(false);
    });
  });

  test('should create directory structure matching constants', async () => {
    await withIntegrationEnvironment(async ({ dotsxPath }) => {
      // Use test-specific constants that dynamically read environment variables
      const { getTestDOTSX } = await import('../setup/test-constants');
      const DOTSX = getTestDOTSX();

      // Create directories using constants
      FileLib.createDirectory(DOTSX.BIN.PATH);
      FileLib.createDirectory(DOTSX.IDE.PATH);
      FileLib.createDirectory(DOTSX.OS.PATH);
      FileLib.createDirectory(DOTSX.TERMINAL.PATH);

      // Verify paths match our test environment
      expect(DOTSX.BIN.PATH.startsWith(dotsxPath)).toBe(true);
      expect(DOTSX.IDE.PATH.startsWith(dotsxPath)).toBe(true);
      expect(DOTSX.OS.PATH.startsWith(dotsxPath)).toBe(true);
      expect(DOTSX.TERMINAL.PATH.startsWith(dotsxPath)).toBe(true);

      // Verify directories exist
      expect(existsSync(DOTSX.BIN.PATH)).toBe(true);
      expect(existsSync(DOTSX.IDE.PATH)).toBe(true);
      expect(existsSync(DOTSX.OS.PATH)).toBe(true);
      expect(existsSync(DOTSX.TERMINAL.PATH)).toBe(true);
    });
  });

  test('should work with test fixtures', async () => {
    await withIntegrationEnvironment(async ({ dotsxPath }) => {
      const fixtures = new TestFixtures();

      // Create complete structure using fixtures
      await fixtures.createCompleteDotsxStructure(dotsxPath);

      // Verify key files and directories exist
      expect(existsSync(join(dotsxPath, 'bin', 'my-script'))).toBe(true);
      expect(existsSync(join(dotsxPath, 'os', 'debian', 'apt.txt'))).toBe(true);
      expect(existsSync(join(dotsxPath, 'terminal', '.zshrc'))).toBe(true);
      expect(existsSync(join(dotsxPath, 'ide', 'vscode', 'settings.json'))).toBe(true);

      // Verify directories
      expect(FileLib.isDirectory(join(dotsxPath, 'bin'))).toBe(true);
      expect(FileLib.isDirectory(join(dotsxPath, 'ide', 'vscode'))).toBe(true);
    });
  });
});
