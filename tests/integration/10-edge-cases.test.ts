import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { FileLib } from '@/lib/file';
import { SymlinkLib } from '@/lib/symlink';
import {
  assertFileExists,
  cleanupTestEnv,
  createDotsxStructure,
  createFakeFiles,
  createTestEnv,
  type TestEnv,
} from './setup';

describe('Integration: Edge Cases', () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv('edge-cases');
  });

  afterEach(() => {
    cleanupTestEnv(env);
  });

  describe('Existing dotsx directory', () => {
    it('should not fail if dotsx directory already exists', () => {
      createDotsxStructure(env);

      // Try to create again
      expect(() => {
        createDotsxStructure(env);
      }).not.toThrow();

      assertFileExists(env.dotsxPath.config);
    });

    it('should not overwrite existing config', () => {
      createDotsxStructure(env);

      const customConfig = '{"custom": "config"}';
      fs.writeFileSync(env.dotsxPath.config, customConfig);

      // Try to create again (should not overwrite)
      FileLib.File.create(env.dotsxPath.config, '{}');

      const content = fs.readFileSync(env.dotsxPath.config, 'utf8');
      expect(content).toBe(customConfig);
    });
  });

  describe('Special characters in paths', () => {
    it('should handle paths with spaces', () => {
      createDotsxStructure(env);

      const testFile = path.join(env.homeDir, 'My Config File.txt');
      createFakeFiles(env.homeDir, { 'My Config File.txt': 'content' });

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      expect(() => {
        SymlinkLib.safeSymlink(testFile, dotsxPath);
      }).not.toThrow();

      assertFileExists(dotsxPath);
    });

    it('should handle paths with special characters', () => {
      createDotsxStructure(env);

      const testFile = path.join(env.homeDir, 'file-with_special.chars!.txt');
      createFakeFiles(env.homeDir, { 'file-with_special.chars!.txt': 'content' });

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      expect(() => {
        SymlinkLib.safeSymlink(testFile, dotsxPath);
      }).not.toThrow();

      assertFileExists(dotsxPath);
    });

    it('should handle unicode in filenames', () => {
      createDotsxStructure(env);

      const testFile = path.join(env.homeDir, 'файл.txt');
      createFakeFiles(env.homeDir, { 'файл.txt': 'content' });

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      expect(() => {
        SymlinkLib.safeSymlink(testFile, dotsxPath);
      }).not.toThrow();

      assertFileExists(dotsxPath);
    });
  });

  describe('Large files', () => {
    it('should handle large file content', () => {
      createDotsxStructure(env);

      const testFile = path.join(env.homeDir, '.large-config');
      const largeContent = 'x'.repeat(1024 * 100); // 100KB
      createFakeFiles(env.homeDir, { '.large-config': largeContent });

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      SymlinkLib.safeSymlink(testFile, dotsxPath);

      const content = fs.readFileSync(dotsxPath, 'utf8');
      expect(content.length).toBe(largeContent.length);
    });
  });

  describe('Circular symlinks', () => {
    it('should detect circular symlink', () => {
      createDotsxStructure(env);

      const file1 = path.join(env.homeDir, 'file1.txt');
      const file2 = path.join(env.homeDir, 'file2.txt');

      // Create circular symlinks
      try {
        fs.symlinkSync(file2, file1);
        fs.symlinkSync(file1, file2);
      } catch {
        // May fail immediately on some systems
      }

      // Should not crash when detecting
      expect(FileLib.isSymLink(file1)).toBe(true);
    });
  });

  describe('Nested __home__ paths', () => {
    it('should handle deeply nested paths', () => {
      createDotsxStructure(env);

      const deepPath = path.join(env.homeDir, '.config/app/deeply/nested/config.json');
      FileLib.Directory.create(path.dirname(deepPath));
      fs.writeFileSync(deepPath, '{}');

      const dotsxPath = FileLib.toDotsxPath(deepPath, env.dotsxPath.symlinks);

      SymlinkLib.safeSymlink(deepPath, dotsxPath);

      assertFileExists(dotsxPath);
      expect(dotsxPath).toContain('__home__');
    });
  });

  describe('Path expansion', () => {
    it('should expand ~ correctly', () => {
      const expanded = FileLib.expand('~/.testrc');
      expect(expanded).toBe(path.join(env.homeDir, '.testrc'));
    });

    it('should expand __home__ correctly', () => {
      const expanded = FileLib.expand('__home__/.testrc');
      expect(expanded).toBe(path.join(env.homeDir, '.testrc'));
    });

    it('should not modify absolute paths', () => {
      const absolutePath = '/absolute/path/file.txt';
      const expanded = FileLib.expand(absolutePath);
      expect(expanded).toBe(absolutePath);
    });

    it('should handle __home__ without trailing slash', () => {
      const expanded = FileLib.expand('__home__');
      expect(expanded).toBe(env.homeDir);
    });
  });

  describe('File display paths', () => {
    it('should display path without __home__ prefix', () => {
      const fullPath = '__home__/.zshrc';
      const displayed = FileLib.display(fullPath);
      expect(displayed).toBe('.zshrc');
    });

    it('should return original path if no __home__', () => {
      const fullPath = '/etc/config';
      const displayed = FileLib.display(fullPath);
      expect(displayed).toBe(fullPath);
    });
  });

  describe('toDotsxPath conversion', () => {
    it('should convert home paths to __home__ format', () => {
      const systemPath = path.join(env.homeDir, '.zshrc');
      const dotsxPath = FileLib.toDotsxPath(systemPath, env.dotsxPath.symlinks);

      expect(dotsxPath).toContain('__home__');
      expect(dotsxPath).toContain('.zshrc');
    });

    it('should handle non-home paths', () => {
      const systemPath = '/etc/config';
      const dotsxPath = FileLib.toDotsxPath(systemPath, env.dotsxPath.symlinks);

      expect(dotsxPath).not.toContain('__home__');
      expect(dotsxPath).toContain('etc/config');
    });
  });

  describe('Empty files and directories', () => {
    it('should handle empty file', () => {
      createDotsxStructure(env);

      const testFile = path.join(env.homeDir, '.empty');
      createFakeFiles(env.homeDir, { '.empty': '' });

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      SymlinkLib.safeSymlink(testFile, dotsxPath);

      assertFileExists(dotsxPath);
      const content = fs.readFileSync(dotsxPath, 'utf8');
      expect(content).toBe('');
    });

    it('should handle empty directory', () => {
      createDotsxStructure(env);

      const testDir = path.join(env.homeDir, '.config/empty');
      fs.mkdirSync(testDir, { recursive: true });

      const dotsxPath = FileLib.toDotsxPath(testDir, env.dotsxPath.symlinks);

      SymlinkLib.safeSymlink(testDir, dotsxPath);

      expect(fs.existsSync(dotsxPath)).toBe(true);
      expect(fs.statSync(dotsxPath).isDirectory()).toBe(true);
    });
  });

  describe('Permissions', () => {
    it('should preserve file permissions', () => {
      createDotsxStructure(env);

      const testFile = path.join(env.homeDir, '.testrc');
      createFakeFiles(env.homeDir, { '.testrc': 'content' });
      fs.chmodSync(testFile, 0o600);

      const originalMode = fs.statSync(testFile).mode;
      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      SymlinkLib.safeSymlink(testFile, dotsxPath);

      const newMode = fs.statSync(dotsxPath).mode;
      expect(newMode & 0o777).toBe(originalMode & 0o777);
    });
  });

  describe('File type detection', () => {
    it('should correctly identify files', () => {
      createDotsxStructure(env);

      const testFile = path.join(env.homeDir, '.testrc');
      createFakeFiles(env.homeDir, { '.testrc': 'test' });

      expect(FileLib.isFile(testFile)).toBe(true);
      expect(FileLib.isDirectory(testFile)).toBe(false);
      expect(FileLib.isSymLink(testFile)).toBe(false);
    });

    it('should correctly identify directories', () => {
      const testDir = path.join(env.homeDir, '.config');
      fs.mkdirSync(testDir, { recursive: true });

      expect(FileLib.isDirectory(testDir)).toBe(true);
      expect(FileLib.isFile(testDir)).toBe(false);
      expect(FileLib.isSymLink(testDir)).toBe(false);
    });

    it('should correctly identify symlinks', () => {
      createDotsxStructure(env);

      const testFile = path.join(env.homeDir, '.testrc');
      createFakeFiles(env.homeDir, { '.testrc': 'test' });

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);
      SymlinkLib.safeSymlink(testFile, dotsxPath);

      expect(FileLib.isSymLink(testFile)).toBe(true);
      expect(FileLib.isFile(testFile)).toBe(true); // Symlink to file
    });
  });
});
