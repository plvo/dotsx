import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SymlinkLib } from '@/lib/symlink';

describe('SymlinkLib', () => {
  const testDir = path.join(os.tmpdir(), 'dotsx-test-symlink');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  describe('getFileSymlinkPath', () => {
    it('should return symlink target path', () => {
      const target = path.join(testDir, 'target.txt');
      const link = path.join(testDir, 'link.txt');
      fs.writeFileSync(target, 'test');
      fs.symlinkSync(target, link);

      expect(SymlinkLib.getFileSymlinkPath(link)).toBe(target);
    });

    it('should handle relative symlinks', () => {
      const target = path.join(testDir, 'target.txt');
      const link = path.join(testDir, 'link.txt');
      fs.writeFileSync(target, 'test');
      fs.symlinkSync('target.txt', link);

      expect(SymlinkLib.getFileSymlinkPath(link)).toBe('target.txt');
    });

    it('should throw on non-symlink', () => {
      const file = path.join(testDir, 'regular.txt');
      fs.writeFileSync(file, 'test');

      expect(() => SymlinkLib.getFileSymlinkPath(file)).toThrow();
    });
  });

  describe('isSymLinkContentCorrect', () => {
    it('should return true when symlink points to correct target', () => {
      const src = path.join(testDir, 'dotsx', 'file.txt');
      const dest = path.join(testDir, 'system', 'file.txt');
      fs.mkdirSync(path.dirname(src), { recursive: true });
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(src, 'test');
      fs.symlinkSync(src, dest);

      expect(SymlinkLib.isSymLinkContentCorrect(src, dest)).toBe(true);
    });

    it('should return false when dest does not exist', () => {
      const src = path.join(testDir, 'dotsx', 'file.txt');
      const dest = path.join(testDir, 'system', 'file.txt');

      expect(SymlinkLib.isSymLinkContentCorrect(src, dest)).toBe(false);
    });

    it('should return false when dest is not a symlink', () => {
      const src = path.join(testDir, 'dotsx', 'file.txt');
      const dest = path.join(testDir, 'system', 'file.txt');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, 'test');

      expect(SymlinkLib.isSymLinkContentCorrect(src, dest)).toBe(false);
    });

    it('should return false when symlink points to wrong target', () => {
      const src = path.join(testDir, 'dotsx', 'file.txt');
      const dest = path.join(testDir, 'system', 'file.txt');
      const wrong = path.join(testDir, 'wrong.txt');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(wrong, 'test');
      fs.symlinkSync(wrong, dest);

      expect(SymlinkLib.isSymLinkContentCorrect(src, dest)).toBe(false);
    });

    it('should handle relative symlink paths correctly', () => {
      const src = path.join(testDir, 'dotsx', 'file.txt');
      const dest = path.join(testDir, 'system', 'file.txt');
      fs.mkdirSync(path.dirname(src), { recursive: true });
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(src, 'test');

      // Create relative symlink
      const relativePath = path.relative(path.dirname(dest), src);
      fs.symlinkSync(relativePath, dest);

      expect(SymlinkLib.isSymLinkContentCorrect(src, dest)).toBe(true);
    });
  });

  describe('safeSymlink', () => {
    it('should throw when neither path exists', () => {
      const systemPath = path.join(testDir, 'system', 'file.txt');
      const dotsxPath = path.join(testDir, 'dotsx', 'file.txt');

      expect(() => SymlinkLib.safeSymlink(systemPath, dotsxPath)).toThrow(
        'Neither system path nor dotsx path exists'
      );
    });

    it('should do nothing if symlink already correct', () => {
      const systemPath = path.join(testDir, 'system', 'file.txt');
      const dotsxPath = path.join(testDir, 'dotsx', 'file.txt');
      fs.mkdirSync(path.dirname(dotsxPath), { recursive: true });
      fs.mkdirSync(path.dirname(systemPath), { recursive: true });
      fs.writeFileSync(dotsxPath, 'test');
      fs.symlinkSync(dotsxPath, systemPath);

      SymlinkLib.safeSymlink(systemPath, dotsxPath);

      expect(fs.lstatSync(systemPath).isSymbolicLink()).toBe(true);
      expect(fs.readlinkSync(systemPath)).toBe(dotsxPath);
    });

    it('should move file to dotsx and create symlink', () => {
      const systemPath = path.join(testDir, 'system', 'file.txt');
      const dotsxPath = path.join(testDir, 'dotsx', 'file.txt');
      fs.mkdirSync(path.dirname(systemPath), { recursive: true });
      fs.writeFileSync(systemPath, 'content');

      SymlinkLib.safeSymlink(systemPath, dotsxPath);

      expect(fs.existsSync(dotsxPath)).toBe(true);
      expect(fs.readFileSync(dotsxPath, 'utf8')).toBe('content');
      expect(fs.lstatSync(systemPath).isSymbolicLink()).toBe(true);
      expect(fs.readlinkSync(systemPath)).toBe(dotsxPath);
    });

    it('should move directory to dotsx and create symlink', () => {
      const systemPath = path.join(testDir, 'system', 'dir');
      const dotsxPath = path.join(testDir, 'dotsx', 'dir');
      fs.mkdirSync(systemPath, { recursive: true });
      fs.writeFileSync(path.join(systemPath, 'file.txt'), 'content');

      SymlinkLib.safeSymlink(systemPath, dotsxPath);

      expect(fs.existsSync(path.join(dotsxPath, 'file.txt'))).toBe(true);
      expect(fs.lstatSync(systemPath).isSymbolicLink()).toBe(true);
    });

    it('should handle existing broken symlink', () => {
      const systemPath = path.join(testDir, 'system', 'file.txt');
      const dotsxPath = path.join(testDir, 'dotsx', 'file.txt');
      const brokenTarget = path.join(testDir, 'broken.txt');

      fs.mkdirSync(path.dirname(systemPath), { recursive: true });

      // Create broken symlink with 'file' type to handle broken target
      try {
        fs.symlinkSync(brokenTarget, systemPath, 'file');
      } catch {
        fs.symlinkSync(brokenTarget, systemPath);
      }

      fs.mkdirSync(path.dirname(dotsxPath), { recursive: true });
      fs.writeFileSync(dotsxPath, 'new content');

      SymlinkLib.safeSymlink(systemPath, dotsxPath);

      expect(fs.lstatSync(systemPath).isSymbolicLink()).toBe(true);
      expect(fs.readlinkSync(systemPath)).toBe(dotsxPath);
    });

    it('should follow symlink to actual content before moving', () => {
      const actualFile = path.join(testDir, 'actual.txt');
      const systemPath = path.join(testDir, 'system', 'file.txt');
      const dotsxPath = path.join(testDir, 'dotsx', 'file.txt');

      fs.writeFileSync(actualFile, 'actual content');
      fs.mkdirSync(path.dirname(systemPath), { recursive: true });
      fs.symlinkSync(actualFile, systemPath);

      SymlinkLib.safeSymlink(systemPath, dotsxPath);

      expect(fs.existsSync(dotsxPath)).toBe(true);
      expect(fs.readFileSync(dotsxPath, 'utf8')).toBe('actual content');
      expect(!fs.existsSync(actualFile)).toBe(true); // actual file moved
    });

    it('should create symlink when only dotsxPath exists (sync scenario)', () => {
      const systemPath = path.join(testDir, 'system', 'file.txt');
      const dotsxPath = path.join(testDir, 'dotsx', 'file.txt');

      fs.mkdirSync(path.dirname(dotsxPath), { recursive: true });
      fs.writeFileSync(dotsxPath, 'dotsx content');

      SymlinkLib.safeSymlink(systemPath, dotsxPath);

      expect(fs.lstatSync(systemPath).isSymbolicLink()).toBe(true);
      expect(fs.readlinkSync(systemPath)).toBe(dotsxPath);
      expect(fs.readFileSync(systemPath, 'utf8')).toBe('dotsx content');
    });

    it('should replace incorrect symlink', () => {
      const systemPath = path.join(testDir, 'system', 'file.txt');
      const dotsxPath = path.join(testDir, 'dotsx', 'file.txt');
      const wrongTarget = path.join(testDir, 'wrong.txt');

      // Create wrong target file first
      fs.writeFileSync(wrongTarget, 'wrong');
      fs.mkdirSync(path.dirname(systemPath), { recursive: true });
      fs.symlinkSync(wrongTarget, systemPath);

      // safeSymlink will follow the symlink and move 'wrong' content to dotsxPath
      SymlinkLib.safeSymlink(systemPath, dotsxPath);

      expect(fs.readlinkSync(systemPath)).toBe(dotsxPath);
      // Content is now 'wrong' because it followed the symlink
      expect(fs.readFileSync(systemPath, 'utf8')).toBe('wrong');
    });

    it('should create parent directories for symlink', () => {
      const systemPath = path.join(testDir, 'system', 'nested', 'deep', 'file.txt');
      const dotsxPath = path.join(testDir, 'dotsx', 'file.txt');

      fs.mkdirSync(path.dirname(dotsxPath), { recursive: true });
      fs.writeFileSync(dotsxPath, 'content');

      SymlinkLib.safeSymlink(systemPath, dotsxPath);

      expect(fs.existsSync(path.dirname(systemPath))).toBe(true);
      expect(fs.lstatSync(systemPath).isSymbolicLink()).toBe(true);
    });
  });
});
