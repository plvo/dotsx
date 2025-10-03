import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { symlinkCommand } from '@/commands/symlink';
import { FileLib } from '@/lib/file';
import { SymlinkLib } from '@/lib/symlink';
import {
  assertFileExists,
  assertSymlink,
  cleanupTestEnv,
  createDotsxStructure,
  createFakeFiles,
  createTestEnv,
  type TestEnv,
} from './setup';

describe('Integration: Symlink Management', () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv('symlink');
    createDotsxStructure(env);
  });

  afterEach(() => {
    cleanupTestEnv(env);
  });

  describe('Adding new symlinks', () => {
    it('should create symlink for a file', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      createFakeFiles(env.homeDir, { '.testrc': '# Test content' });

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      SymlinkLib.safeSymlink(testFile, dotsxPath);

      // Check symlink exists
      expect(fs.lstatSync(testFile).isSymbolicLink()).toBe(true);

      // Check content is in dotsx
      assertFileExists(dotsxPath);
      const content = fs.readFileSync(dotsxPath, 'utf8');
      expect(content).toBe('# Test content');

      // Verify symlink points to dotsx
      assertSymlink(dotsxPath, testFile);
    });

    it('should create symlink for a directory', () => {
      const testDir = path.join(env.homeDir, '.config/testapp');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'config.json'), '{"key": "value"}');

      const dotsxPath = FileLib.toDotsxPath(testDir, env.dotsxPath.symlinks);

      SymlinkLib.safeSymlink(testDir, dotsxPath);

      // Check symlink exists
      expect(fs.lstatSync(testDir).isSymbolicLink()).toBe(true);

      // Check content is in dotsx
      assertFileExists(path.join(dotsxPath, 'config.json'));

      // Verify symlink points to dotsx
      assertSymlink(dotsxPath, testDir);
    });

    it('should handle paths with spaces', () => {
      const testFile = path.join(env.homeDir, 'My Config.txt');
      createFakeFiles(env.homeDir, { 'My Config.txt': 'content' });

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      SymlinkLib.safeSymlink(testFile, dotsxPath);

      assertFileExists(dotsxPath);
      expect(fs.lstatSync(testFile).isSymbolicLink()).toBe(true);
    });

    it('should handle special characters in path', () => {
      const testFile = path.join(env.homeDir, 'test-file_123.json');
      createFakeFiles(env.homeDir, { 'test-file_123.json': '{}' });

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      SymlinkLib.safeSymlink(testFile, dotsxPath);

      assertFileExists(dotsxPath);
      expect(fs.lstatSync(testFile).isSymbolicLink()).toBe(true);
    });
  });

  describe('Symlink status checking', () => {
    it('should detect correct symlinks', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      createFakeFiles(env.homeDir, { '.testrc': 'test' });

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);
      SymlinkLib.safeSymlink(testFile, dotsxPath);

      const isCorrect = SymlinkLib.isSymLinkContentCorrect(dotsxPath, testFile);
      expect(isCorrect).toBe(true);
    });

    it('should detect incorrect symlinks', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      const wrongTarget = path.join(env.homeDir, 'wrong.txt');

      createFakeFiles(env.homeDir, {
        '.testrc': 'original',
        'wrong.txt': 'wrong',
      });

      // Create symlink to wrong target
      fs.unlinkSync(testFile);
      fs.symlinkSync(wrongTarget, testFile);

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);
      FileLib.Directory.create(path.dirname(dotsxPath));
      fs.writeFileSync(dotsxPath, 'correct');

      const isCorrect = SymlinkLib.isSymLinkContentCorrect(dotsxPath, testFile);
      expect(isCorrect).toBe(false);
    });

    it('should detect broken symlinks', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      const brokenTarget = path.join(env.homeDir, 'nonexistent');

      // Create broken symlink
      try {
        fs.symlinkSync(brokenTarget, testFile, 'file');
      } catch {
        fs.symlinkSync(brokenTarget, testFile);
      }

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);

      const isCorrect = SymlinkLib.isSymLinkContentCorrect(dotsxPath, testFile);
      expect(isCorrect).toBe(false);
    });
  });

  describe('Getting symlinks from dotsx', () => {
    it('should list all symlinks', () => {
      createFakeFiles(env.homeDir, {
        '.zshrc': '# zsh',
        '.bashrc': '# bash',
      });

      const files = ['.zshrc', '.bashrc'];
      files.forEach(f => {
        const systemPath = path.join(env.homeDir, f);
        const dotsxPath = FileLib.toDotsxPath(systemPath, env.dotsxPath.symlinks);
        SymlinkLib.safeSymlink(systemPath, dotsxPath);
      });

      const links = symlinkCommand.getSymlinks(env.dotsxPath);
      expect(links.length).toBe(2);

      const linkPaths = links.map(l => path.basename(l.systemPath));
      expect(linkPaths).toContain('.zshrc');
      expect(linkPaths).toContain('.bashrc');
    });

    it('should handle nested directory structure', () => {
      createFakeFiles(env.homeDir, {
        '.config/app1/settings.json': '{}',
        '.config/app2/config.ini': '',
      });

      const files = [
        '.config/app1/settings.json',
        '.config/app2/config.ini',
      ];

      files.forEach(f => {
        const systemPath = path.join(env.homeDir, f);
        const dotsxPath = FileLib.toDotsxPath(systemPath, env.dotsxPath.symlinks);
        SymlinkLib.safeSymlink(systemPath, dotsxPath);
      });

      const links = symlinkCommand.getSymlinks(env.dotsxPath);
      expect(links.length).toBe(2);
    });

    it('should return empty array if no symlinks', () => {
      const links = symlinkCommand.getSymlinks(env.dotsxPath);
      expect(links.length).toBe(0);
    });
  });

  describe('Symlink already correct', () => {
    it('should not modify already correct symlink', () => {
      const testFile = path.join(env.homeDir, '.testrc');
      createFakeFiles(env.homeDir, { '.testrc': 'content' });

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);
      SymlinkLib.safeSymlink(testFile, dotsxPath);

      // Get inode of symlink
      const beforeInode = fs.lstatSync(testFile).ino;

      // Run again
      SymlinkLib.safeSymlink(testFile, dotsxPath);

      // Check inode is same (symlink not recreated)
      const afterInode = fs.lstatSync(testFile).ino;
      expect(afterInode).toBe(beforeInode);
    });
  });

  describe('Following existing symlinks', () => {
    it('should follow symlink to actual content', () => {
      const actualFile = path.join(env.homeDir, 'actual.txt');
      const testFile = path.join(env.homeDir, '.testrc');

      createFakeFiles(env.homeDir, { 'actual.txt': 'actual content' });
      fs.symlinkSync(actualFile, testFile);

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);
      SymlinkLib.safeSymlink(testFile, dotsxPath);

      // Check content was moved from actual file
      const content = fs.readFileSync(dotsxPath, 'utf8');
      expect(content).toBe('actual content');

      // Check actual file was moved (no longer exists)
      expect(fs.existsSync(actualFile)).toBe(false);

      // Check testFile is now symlink to dotsx
      assertSymlink(dotsxPath, testFile);
    });
  });

  describe('Directory symlink detection', () => {
    it('should identify empty directory as symlink candidate', () => {
      const emptyDir = path.join(env.dotsxPath.symlinks, '__home__', '.config/empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const isCandidate = symlinkCommand.isDirSymlinkCandidate(emptyDir);
      expect(isCandidate).toBe(true);
    });

    it('should identify directory with only files as symlink candidate', () => {
      const dir = path.join(env.dotsxPath.symlinks, '__home__', '.config/snippets');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'file1.json'), '{}');
      fs.writeFileSync(path.join(dir, 'file2.json'), '{}');

      const isCandidate = symlinkCommand.isDirSymlinkCandidate(dir);
      expect(isCandidate).toBe(true);
    });

    it('should not identify directory with subdirs as symlink candidate', () => {
      const dir = path.join(env.dotsxPath.symlinks, '__home__', '.config/app');
      fs.mkdirSync(path.join(dir, 'subdir'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'file.json'), '{}');

      const isCandidate = symlinkCommand.isDirSymlinkCandidate(dir);
      expect(isCandidate).toBe(false);
    });
  });

  describe('Sync broken links', () => {
    it('should fix incorrect symlinks', async () => {
      const testFile = path.join(env.homeDir, '.testrc');
      const wrongTarget = path.join(env.homeDir, 'wrong.txt');

      createFakeFiles(env.homeDir, { 'wrong.txt': 'wrong' });
      fs.symlinkSync(wrongTarget, testFile);

      const dotsxPath = FileLib.toDotsxPath(testFile, env.dotsxPath.symlinks);
      FileLib.Directory.create(path.dirname(dotsxPath));
      fs.writeFileSync(dotsxPath, 'correct');

      // Check status
      const links = await symlinkCommand.checkStatus(env.dotsxPath);
      expect(links.incorrectSymlinks.length).toBe(1);

      // Fix symlink
      SymlinkLib.safeSymlink(testFile, dotsxPath);

      // Check is now correct
      const isCorrect = SymlinkLib.isSymLinkContentCorrect(dotsxPath, testFile);
      expect(isCorrect).toBe(true);
    });
  });
});
