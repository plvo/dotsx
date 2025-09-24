import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { FileLib } from '../../../src/lib/file';

describe('FileLib', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'dotsx-test-'));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Path checks', () => {
    test('isPathExists should return true for existing path', () => {
      expect(FileLib.isPathExists(testDir)).toBe(true);
    });

    test('isPathExists should return false for non-existing path', () => {
      const nonExistentPath = join(testDir, 'non-existent');
      expect(FileLib.isPathExists(nonExistentPath)).toBe(false);
    });

    test('isDirectory should return true for directory', () => {
      expect(FileLib.isDirectory(testDir)).toBe(true);
    });

    test('isDirectory should return false for non-existent path', () => {
      const nonExistentPath = join(testDir, 'non-existent');
      expect(FileLib.isDirectory(nonExistentPath)).toBe(false);
    });

    test('isFile should return true for file', async () => {
      const testFile = join(testDir, 'test.txt');
      await writeFile(testFile, 'test content');
      expect(FileLib.isFile(testFile)).toBe(true);
    });

    test('isFile should return false for directory', () => {
      expect(FileLib.isFile(testDir)).toBe(false);
    });

    test('isSymLink should return true for symlink', async () => {
      const sourceFile = join(testDir, 'source.txt');
      const linkFile = join(testDir, 'link.txt');

      await writeFile(sourceFile, 'content');
      await symlink(sourceFile, linkFile);

      expect(FileLib.isSymLink(linkFile)).toBe(true);
    });

    test('isSymLink should return false for regular file', async () => {
      const testFile = join(testDir, 'test.txt');
      await writeFile(testFile, 'test content');
      expect(FileLib.isSymLink(testFile)).toBe(false);
    });
  });

  describe('File operations', () => {
    test('createFile should create file with content', () => {
      const testFile = join(testDir, 'new-file.txt');
      const content = 'test content';

      FileLib.createFile(testFile, content);

      expect(FileLib.isFile(testFile)).toBe(true);
      expect(FileLib.readFile(testFile)).toBe(content);
    });

    test('createFile should not overwrite existing file', async () => {
      const testFile = join(testDir, 'existing-file.txt');
      const originalContent = 'original content';
      const newContent = 'new content';

      await writeFile(testFile, originalContent);
      FileLib.createFile(testFile, newContent);

      expect(FileLib.readFile(testFile)).toBe(originalContent);
    });

    test('createDirectory should create directory', () => {
      const newDir = join(testDir, 'new-dir');

      FileLib.createDirectory(newDir);

      expect(FileLib.isDirectory(newDir)).toBe(true);
    });

    test('createDirectory should create nested directories', () => {
      const nestedDir = join(testDir, 'level1', 'level2', 'level3');

      FileLib.createDirectory(nestedDir);

      expect(FileLib.isDirectory(nestedDir)).toBe(true);
    });

    test('readFile should return file content', async () => {
      const testFile = join(testDir, 'test.txt');
      const content = 'test content\\nwith multiple lines';

      await writeFile(testFile, content);

      expect(FileLib.readFile(testFile)).toBe(content);
    });

    test('deleteFile should remove file', async () => {
      const testFile = join(testDir, 'to-delete.txt');
      await writeFile(testFile, 'content');

      FileLib.deleteFile(testFile);

      expect(FileLib.isPathExists(testFile)).toBe(false);
    });

    test('deleteDirectory should remove directory', async () => {
      const testSubDir = join(testDir, 'to-delete');
      await mkdir(testSubDir);

      FileLib.deleteDirectory(testSubDir);

      expect(FileLib.isPathExists(testSubDir)).toBe(false);
    });
  });

  describe('Path utilities', () => {
    test('expandPath should expand tilde to home directory', () => {
      const tildeePath = '~/test-path';
      const expanded = FileLib.expandPath(tildeePath);

      expect(expanded).toBe(resolve(homedir(), 'test-path'));
      expect(expanded).not.toContain('~');
    });

    test('expandPath should leave absolute paths unchanged', () => {
      const absolutePath = '/absolute/path';
      const expanded = FileLib.expandPath(absolutePath);

      expect(expanded).toBe(absolutePath);
    });

    test('getDisplayPath should replace home with tilde', () => {
      const homePath = join(homedir(), 'some', 'path');
      const displayPath = FileLib.getDisplayPath(homePath);

      expect(displayPath).toBe('~/some/path');
    });

    test('deleteFilenameExtension should remove extension', () => {
      expect(FileLib.deleteFilenameExtension('file.txt')).toBe('file');
      expect(FileLib.deleteFilenameExtension('archive.tar.gz')).toBe('archive.tar');
      expect(FileLib.deleteFilenameExtension('noextension')).toBe('noextension');
      expect(FileLib.deleteFilenameExtension('.hidden')).toBe('');
    });
  });

  describe('readFileAsArray', () => {
    test('should parse file content into array', async () => {
      const testFile = join(testDir, 'list.txt');
      const content = 'line1\nline2\n  line3  \n\n# comment\nline4';

      await writeFile(testFile, content);

      const result = FileLib.readFileAsArray(testFile);
      expect(result).toEqual(['line1', 'line2', 'line3', 'line4']);
    });

    test('should filter out comments and empty lines', async () => {
      const testFile = join(testDir, 'config.txt');
      const content = '# This is a comment\nvalid-line\n\n# Another comment\n  \nanother-valid-line';

      await writeFile(testFile, content);

      const result = FileLib.readFileAsArray(testFile);
      expect(result).toEqual(['valid-line', 'another-valid-line']);
    });
  });

  describe('readDirectory', () => {
    test('should return directory contents', async () => {
      const subDir = join(testDir, 'subdir');
      const file1 = join(testDir, 'file1.txt');
      const file2 = join(testDir, 'file2.txt');

      await mkdir(subDir);
      await writeFile(file1, 'content1');
      await writeFile(file2, 'content2');

      const contents = FileLib.readDirectory(testDir);
      expect(contents).toContain('subdir');
      expect(contents).toContain('file1.txt');
      expect(contents).toContain('file2.txt');
      expect(contents.length).toBe(3);
    });

    test('should return empty array for non-existent directory', () => {
      const nonExistentDir = join(testDir, 'non-existent');
      const contents = FileLib.readDirectory(nonExistentDir);
      expect(contents).toEqual([]);
    });
  });

  describe('Symlink operations', () => {
    test('isSymLinkContentCorrect should validate symlink target', async () => {
      const sourceFile = join(testDir, 'source.txt');
      const linkFile = join(testDir, 'link.txt');

      await writeFile(sourceFile, 'content');
      await symlink(sourceFile, linkFile);

      expect(FileLib.isSymLinkContentCorrect(sourceFile, linkFile)).toBe(true);
    });

    test('isSymLinkContentCorrect should return false for incorrect symlink', async () => {
      const sourceFile = join(testDir, 'source.txt');
      const wrongSource = join(testDir, 'wrong.txt');
      const linkFile = join(testDir, 'link.txt');

      await writeFile(sourceFile, 'content');
      await writeFile(wrongSource, 'wrong content');
      await symlink(wrongSource, linkFile);

      expect(FileLib.isSymLinkContentCorrect(sourceFile, linkFile)).toBe(false);
    });

    test('getFileSymlinkPath should return symlink target', async () => {
      const sourceFile = join(testDir, 'source.txt');
      const linkFile = join(testDir, 'link.txt');

      await writeFile(sourceFile, 'content');
      await symlink(sourceFile, linkFile);

      const target = FileLib.getFileSymlinkPath(linkFile);
      expect(target).toBe(sourceFile);
    });
  });

  describe('File permissions', () => {
    test('makeExecutable should set executable permissions', async () => {
      const testFile = join(testDir, 'script.sh');
      await writeFile(testFile, '#!/bin/bash\\necho "hello"');

      FileLib.makeExecutable(testFile);

      expect(FileLib.isExecutable(testFile)).toBe(true);
    });

    test('isExecutable should return true for executable file', async () => {
      const testFile = join(testDir, 'executable.sh');
      await writeFile(testFile, '#!/bin/bash\\necho "hello"');
      await chmod(testFile, 0o755);

      expect(FileLib.isExecutable(testFile)).toBe(true);
    });

    test('isExecutable should return false for non-executable file', async () => {
      const testFile = join(testDir, 'non-executable.txt');
      await writeFile(testFile, 'just text');

      expect(FileLib.isExecutable(testFile)).toBe(false);
    });
  });

  describe('writeToEndOfFile', () => {
    test('should append content to file', async () => {
      const testFile = join(testDir, 'append-test.txt');
      const initialContent = 'initial content';
      const appendContent = 'appended content';

      await writeFile(testFile, initialContent);
      FileLib.writeToEndOfFile(testFile, appendContent);

      const finalContent = FileLib.readFile(testFile);
      expect(finalContent).toBe(`${initialContent}${appendContent}\n`);
    });
  });

  describe('Error handling', () => {
    test('copyFile should handle errors gracefully', () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
      const nonExistentSource = join(testDir, 'non-existent-source.txt');
      const dest = join(testDir, 'dest.txt');

      // This should trigger the error handling since source doesn't exist initially
      FileLib.copyFile(nonExistentSource, dest);

      consoleSpy.mockRestore();
    });

    test('readFileAsArray should handle non-existent file', () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
      const nonExistentFile = join(testDir, 'non-existent.txt');

      const result = FileLib.readFileAsArray(nonExistentFile);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
