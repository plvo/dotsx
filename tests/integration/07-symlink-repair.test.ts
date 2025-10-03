import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { FileLib } from '@/lib/file';
import { SymlinkLib } from '@/lib/symlink';
import {
  assertSymlink,
  cleanupTestEnv,
  createDotsxStructure,
  createFakeFiles,
  createTestEnv,
  type TestEnv,
} from './setup';

describe('Integration: Symlink Repair', () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv('repair');
    createDotsxStructure(env);
  });

  afterEach(() => {
    cleanupTestEnv(env);
  });

  describe('Detecting broken symlinks', () => {
    it('should detect when symlink target does not exist', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      const brokenTarget = path.join(env.homeDir, 'nonexistent');

      try {
        fs.symlinkSync(brokenTarget, testFile, 'file');
      } catch {
        fs.symlinkSync(brokenTarget, testFile);
      }

      // Check symlink exists but is broken
      expect(fs.lstatSync(testFile).isSymbolicLink()).toBe(true);
      expect(fs.existsSync(testFile)).toBe(false);
    });

    it('should detect when symlink points to wrong target', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      const wrongTarget = path.join(env.homeDir, 'wrong.txt');
      const correctTarget = path.join(env.dotsxPath.symlinks, '__home__', '.testrc');

      createFakeFiles(env.homeDir, { 'wrong.txt': 'wrong' });
      fs.symlinkSync(wrongTarget, testFile);

      FileLib.Directory.create(path.dirname(correctTarget));
      fs.writeFileSync(correctTarget, 'correct');

      const isCorrect = SymlinkLib.isSymLinkContentCorrect(correctTarget, testFile);
      expect(isCorrect).toBe(false);
    });
  });

  describe('Repairing broken symlinks', () => {
    it('should repair broken symlink', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);
      const brokenTarget = path.join(env.homeDir, 'nonexistent');

      // Create broken symlink
      try {
        fs.symlinkSync(brokenTarget, testFile, 'file');
      } catch {
        fs.symlinkSync(brokenTarget, testFile);
      }

      // Create correct content in dotsx
      FileLib.Directory.create(path.dirname(dotsxPath));
      fs.writeFileSync(dotsxPath, 'correct content');

      // Repair symlink
      SymlinkLib.safeSymlink(testFile, dotsxPath);

      // Verify repaired
      assertSymlink(dotsxPath, testFile);
      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).toBe('correct content');
    });

    it('should repair incorrect symlink target', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      const wrongTarget = path.join(env.homeDir, 'wrong.txt');
      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      createFakeFiles(env.homeDir, { 'wrong.txt': 'wrong content' });
      fs.symlinkSync(wrongTarget, testFile);

      // Repair symlink (will follow existing symlink and move content)
      SymlinkLib.safeSymlink(testFile, dotsxPath);

      // Verify repaired
      assertSymlink(dotsxPath, testFile);
      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).toBe('wrong content'); // Content followed from wrong.txt
    });
  });

  describe('System file missing scenarios', () => {
    it('should recreate symlink when system file deleted', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      // Create content in dotsx (as if symlink existed before)
      FileLib.Directory.create(path.dirname(dotsxPath));
      fs.writeFileSync(dotsxPath, 'preserved content');

      // System file missing (simulating deletion)
      // safeSymlink should recreate it

      SymlinkLib.safeSymlink(testFile, dotsxPath);

      // Verify recreated
      expect(fs.existsSync(testFile)).toBe(true);
      expect(fs.lstatSync(testFile).isSymbolicLink()).toBe(true);
      assertSymlink(dotsxPath, testFile);

      const content = fs.readFileSync(testFile, 'utf8');
      expect(content).toBe('preserved content');
    });

    it('should fail when both files missing', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      // Both system and dotsx files missing
      expect(() => {
        SymlinkLib.safeSymlink(testFile, dotsxPath);
      }).toThrow('Neither system path nor dotsx path exists');
    });
  });

  describe('Dotsx file missing scenarios', () => {
    it('should move system file to dotsx when dotsx missing', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      createFakeFiles(env.homeDir, { '.testrc': 'system content' });

      // Dotsx file missing (first time setup)
      SymlinkLib.safeSymlink(testFile, dotsxPath);

      // Verify system file moved to dotsx
      expect(fs.existsSync(dotsxPath)).toBe(true);
      expect(fs.lstatSync(testFile).isSymbolicLink()).toBe(true);

      const content = fs.readFileSync(dotsxPath, 'utf8');
      expect(content).toBe('system content');

      assertSymlink(dotsxPath, testFile);
    });
  });

  describe('Directory symlink repair', () => {
    it('should repair broken directory symlink', () => {
      const testDir = path.join(env.homeDir, '.config/testapp');
      const dotsxPath = FileLib.toDotsxPath(testDir, env.dotsxPath.symlinks);
      const brokenTarget = path.join(env.homeDir, 'nonexistent');

      // Create broken symlink
      fs.mkdirSync(path.dirname(testDir), { recursive: true });
      try {
        fs.symlinkSync(brokenTarget, testDir, 'dir');
      } catch {
        fs.symlinkSync(brokenTarget, testDir);
      }

      // Create correct content in dotsx
      FileLib.Directory.create(dotsxPath);
      fs.writeFileSync(path.join(dotsxPath, 'config.json'), '{"test": true}');

      // Repair symlink
      SymlinkLib.safeSymlink(testDir, dotsxPath);

      // Verify repaired
      assertSymlink(dotsxPath, testDir);
      expect(fs.existsSync(path.join(testDir, 'config.json'))).toBe(true);
    });
  });

  describe('Concurrent symlink modifications', () => {
    it('should handle symlink being modified during operation', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      createFakeFiles(env.homeDir, { '.testrc': 'content' });

      // Create initial symlink
      SymlinkLib.safeSymlink(testFile, dotsxPath);

      // Simulate external modification (delete symlink)
      fs.unlinkSync(testFile);

      // Repair should recreate
      SymlinkLib.safeSymlink(testFile, dotsxPath);

      expect(fs.lstatSync(testFile).isSymbolicLink()).toBe(true);
      assertSymlink(dotsxPath, testFile);
    });
  });

  describe('Symlink permission handling', () => {
    it('should preserve file permissions after repair', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      createFakeFiles(env.homeDir, { '.testrc': '#!/bin/bash\necho test' });
      fs.chmodSync(testFile, 0o755);

      const originalMode = fs.statSync(testFile).mode;

      // Create symlink
      SymlinkLib.safeSymlink(testFile, dotsxPath);

      // Check dotsx file has same permissions
      const dotsxMode = fs.statSync(dotsxPath).mode;
      expect(dotsxMode & 0o777).toBe(originalMode & 0o777);
    });
  });
});
