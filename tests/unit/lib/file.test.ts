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

  describe('isPathExists', () => {
    test('should return true for existing path', () => {
      expect(FileLib.isPathExists(testDir)).toBe(true);
    });

    test('should return false for non-existing path', () => {
      const nonExistentPath = join(testDir, 'non-existent');
      expect(FileLib.isPathExists(nonExistentPath)).toBe(false);
    });
  });

  describe('isFile', () => {
    test('should return true for file', async () => {
      const testFile = join(testDir, 'test.txt');
      await writeFile(testFile, 'test content');
      expect(FileLib.isFile(testFile)).toBe(true);
    });

    test('should return false for directory', () => {
      expect(FileLib.isFile(testDir)).toBe(false);
    });

    test('should return false for non-existent path', () => {
      const nonExistentPath = join(testDir, 'non-existent');
      expect(FileLib.isFile(nonExistentPath)).toBe(false);
    });
  });

  describe('isDirectory', () => {
    test('should return true for directory', () => {
      expect(FileLib.isDirectory(testDir)).toBe(true);
    });

    test('should return false for non-existent path', () => {
      const nonExistentPath = join(testDir, 'non-existent');
      expect(FileLib.isDirectory(nonExistentPath)).toBe(false);
    });

    test('should return false for file', async () => {
      const testFile = join(testDir, 'test.txt');
      await writeFile(testFile, 'test content');
      expect(FileLib.isDirectory(testFile)).toBe(false);
    });
  });

  describe('isSymLink', () => {
    test('should return true for symlink', async () => {
      const sourceFile = join(testDir, 'source.txt');
      const linkFile = join(testDir, 'link.txt');

      await writeFile(sourceFile, 'content');
      await symlink(sourceFile, linkFile);

      expect(FileLib.isSymLink(linkFile)).toBe(true);
    });

    test('should return false for regular file', async () => {
      const testFile = join(testDir, 'test.txt');
      await writeFile(testFile, 'test content');
      expect(FileLib.isSymLink(testFile)).toBe(false);
    });

    test('should return false for non-existent path', () => {
      const nonExistentPath = join(testDir, 'non-existent');
      expect(FileLib.isSymLink(nonExistentPath)).toBe(false);
    });

    test('should return true for broken symlink', async () => {
      const nonExistentTarget = join(testDir, 'non-existent-target.txt');
      const brokenLinkFile = join(testDir, 'broken-link.txt');

      await symlink(nonExistentTarget, brokenLinkFile);

      expect(FileLib.isSymLink(brokenLinkFile)).toBe(true);
    });
  });

  describe('isExecutable', () => {
    test('should return true for executable file', async () => {
      const testFile = join(testDir, 'executable.sh');
      await writeFile(testFile, '#!/bin/bash\\necho "hello"');
      await chmod(testFile, 0o755);

      expect(FileLib.isExecutable(testFile)).toBe(true);
    });

    test('should return false for non-executable file', async () => {
      const testFile = join(testDir, 'non-executable.txt');
      await writeFile(testFile, 'just text');

      expect(FileLib.isExecutable(testFile)).toBe(false);
    });

    test('should return false for non-existent file', () => {
      const nonExistentFile = join(testDir, 'non-existent.txt');
      expect(FileLib.isExecutable(nonExistentFile)).toBe(false);
    });

    test('should return false for directory', () => {
      expect(FileLib.isExecutable(testDir)).toBe(false);
    });
  });

  describe('isSymLinkContentCorrect', () => {
    test('should validate symlink target', async () => {
      const sourceFile = join(testDir, 'source.txt');
      const linkFile = join(testDir, 'link.txt');

      await writeFile(sourceFile, 'content');
      await symlink(sourceFile, linkFile);

      expect(FileLib.isSymLinkContentCorrect(sourceFile, linkFile)).toBe(true);
    });

    test('should return false for incorrect symlink', async () => {
      const sourceFile = join(testDir, 'source.txt');
      const wrongSource = join(testDir, 'wrong.txt');
      const linkFile = join(testDir, 'link.txt');

      await writeFile(sourceFile, 'content');
      await writeFile(wrongSource, 'wrong content');
      await symlink(wrongSource, linkFile);

      expect(FileLib.isSymLinkContentCorrect(sourceFile, linkFile)).toBe(false);
    });

    test('should return false for non-existent destination', () => {
      const sourceFile = join(testDir, 'source.txt');
      const nonExistentDest = join(testDir, 'non-existent');

      expect(FileLib.isSymLinkContentCorrect(sourceFile, nonExistentDest)).toBe(false);
    });

    test('should return false for non-symlink destination', async () => {
      const sourceFile = join(testDir, 'source.txt');
      const regularFile = join(testDir, 'regular.txt');

      await writeFile(sourceFile, 'content');
      await writeFile(regularFile, 'content');

      expect(FileLib.isSymLinkContentCorrect(sourceFile, regularFile)).toBe(false);
    });
  });

  describe('createFile', () => {
    test('should create file with content', () => {
      const testFile = join(testDir, 'new-file.txt');
      const content = 'test content';

      FileLib.createFile(testFile, content);

      expect(FileLib.isFile(testFile)).toBe(true);
      expect(FileLib.readFile(testFile)).toBe(content);
    });

    test('should create file with empty content by default', () => {
      const testFile = join(testDir, 'empty-file.txt');

      FileLib.createFile(testFile);

      expect(FileLib.isFile(testFile)).toBe(true);
      expect(FileLib.readFile(testFile)).toBe('');
    });

    test('should not overwrite existing file', async () => {
      const testFile = join(testDir, 'existing-file.txt');
      const originalContent = 'original content';
      const newContent = 'new content';

      await writeFile(testFile, originalContent);
      FileLib.createFile(testFile, newContent);

      expect(FileLib.readFile(testFile)).toBe(originalContent);
    });
  });

  describe('createDirectory', () => {
    test('should create directory', () => {
      const newDir = join(testDir, 'new-dir');

      FileLib.createDirectory(newDir);

      expect(FileLib.isDirectory(newDir)).toBe(true);
    });

    test('should create nested directories', () => {
      const nestedDir = join(testDir, 'level1', 'level2', 'level3');

      FileLib.createDirectory(nestedDir);

      expect(FileLib.isDirectory(nestedDir)).toBe(true);
    });

    test('should not create directory if it already exists', async () => {
      const existingDir = join(testDir, 'existing-dir');
      await mkdir(existingDir);

      // This should not throw an error
      FileLib.createDirectory(existingDir);

      expect(FileLib.isDirectory(existingDir)).toBe(true);
    });
  });

  describe('copyFile', () => {
    test('should copy existing file', async () => {
      const sourceFile = join(testDir, 'source.txt');
      const destFile = join(testDir, 'dest.txt');
      const content = 'test content';

      await writeFile(sourceFile, content);
      FileLib.copyFile(sourceFile, destFile);

      expect(FileLib.isFile(destFile)).toBe(true);
      expect(FileLib.readFile(destFile)).toBe(content);
    });

    test('should create source file if it does not exist', () => {
      const sourceFile = join(testDir, 'non-existent-source.txt');
      const destFile = join(testDir, 'dest.txt');

      FileLib.copyFile(sourceFile, destFile);

      expect(FileLib.isFile(sourceFile)).toBe(true);
      expect(FileLib.isFile(destFile)).toBe(true);
    });

    test('should handle copy errors gracefully', () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
      const sourceFile = join(testDir, 'source.txt');
      const invalidDest = '/invalid/path/dest.txt';

      FileLib.createFile(sourceFile, 'content');
      FileLib.copyFile(sourceFile, invalidDest);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('copyDirectory', () => {
    test('should copy directory with files and subdirectories', async () => {
      const sourceDir = join(testDir, 'source-dir');
      const destDir = join(testDir, 'dest-dir');
      const subDir = join(sourceDir, 'subdir');
      const file1 = join(sourceDir, 'file1.txt');
      const file2 = join(subDir, 'file2.txt');

      await mkdir(sourceDir);
      await mkdir(subDir);
      await writeFile(file1, 'content1');
      await writeFile(file2, 'content2');

      FileLib.copyDirectory(sourceDir, destDir);

      expect(FileLib.isDirectory(destDir)).toBe(true);
      expect(FileLib.isDirectory(join(destDir, 'subdir'))).toBe(true);
      expect(FileLib.isFile(join(destDir, 'file1.txt'))).toBe(true);
      expect(FileLib.isFile(join(destDir, 'subdir', 'file2.txt'))).toBe(true);
      expect(FileLib.readFile(join(destDir, 'file1.txt'))).toBe('content1');
      expect(FileLib.readFile(join(destDir, 'subdir', 'file2.txt'))).toBe('content2');
    });

    test('should create destination directory if it does not exist', async () => {
      const sourceDir = join(testDir, 'source-dir');
      const destDir = join(testDir, 'dest-dir');
      const file1 = join(sourceDir, 'file1.txt');

      await mkdir(sourceDir);
      await writeFile(file1, 'content1');

      FileLib.copyDirectory(sourceDir, destDir);

      expect(FileLib.isDirectory(destDir)).toBe(true);
      expect(FileLib.isFile(join(destDir, 'file1.txt'))).toBe(true);
    });

    test('should handle file copy errors in directory', async () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
      const sourceDir = join(testDir, 'source-dir');
      const destDir = join(testDir, 'dest-dir');
      const file1 = join(sourceDir, 'file1.txt');

      await mkdir(sourceDir);
      await writeFile(file1, 'content1');

      // Mock copyFile to throw an error
      const originalCopyFile = FileLib.copyFile;
      FileLib.copyFile = () => {
        throw new Error('Copy error');
      };

      FileLib.copyDirectory(sourceDir, destDir);

      expect(consoleSpy).toHaveBeenCalled();

      // Restore original method
      FileLib.copyFile = originalCopyFile;
      consoleSpy.mockRestore();
    });
  });

  describe('deleteFile', () => {
    test('should remove file', async () => {
      const testFile = join(testDir, 'to-delete.txt');
      await writeFile(testFile, 'content');

      FileLib.deleteFile(testFile);

      expect(FileLib.isPathExists(testFile)).toBe(false);
    });

    test('should not error when deleting non-existent file', () => {
      const nonExistentFile = join(testDir, 'non-existent.txt');

      // This should not throw an error
      FileLib.deleteFile(nonExistentFile);

      expect(FileLib.isPathExists(nonExistentFile)).toBe(false);
    });

    test('should not delete directory', async () => {
      const testSubDir = join(testDir, 'test-subdir');
      await mkdir(testSubDir);

      FileLib.deleteFile(testSubDir);

      expect(FileLib.isDirectory(testSubDir)).toBe(true);
    });
  });

  describe('deleteDirectory', () => {
    test('should remove directory', async () => {
      const testSubDir = join(testDir, 'to-delete');
      await mkdir(testSubDir);

      FileLib.deleteDirectory(testSubDir);

      expect(FileLib.isPathExists(testSubDir)).toBe(false);
    });

    test('should not error when deleting non-existent directory', () => {
      const nonExistentDir = join(testDir, 'non-existent');

      // This should not throw an error
      FileLib.deleteDirectory(nonExistentDir);

      expect(FileLib.isPathExists(nonExistentDir)).toBe(false);
    });

    test('should not delete file', async () => {
      const testFile = join(testDir, 'test-file.txt');
      await writeFile(testFile, 'content');

      FileLib.deleteDirectory(testFile);

      expect(FileLib.isFile(testFile)).toBe(true);
    });
  });

  describe('readFile', () => {
    test('should return file content', async () => {
      const testFile = join(testDir, 'test.txt');
      const content = 'test content\\nwith multiple lines';

      await writeFile(testFile, content);

      expect(FileLib.readFile(testFile)).toBe(content);
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

    test('should handle non-existent file', () => {
      const consoleSpy = spyOn(console, 'error').mockImplementation(() => {});
      const nonExistentFile = join(testDir, 'non-existent.txt');

      const result = FileLib.readFileAsArray(nonExistentFile);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
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

  describe('makeExecutable', () => {
    test('should set executable permissions', async () => {
      const testFile = join(testDir, 'script.sh');
      await writeFile(testFile, '#!/bin/bash\\necho "hello"');

      FileLib.makeExecutable(testFile);

      expect(FileLib.isExecutable(testFile)).toBe(true);
    });

    test('should not error on non-existent file', () => {
      const nonExistentFile = join(testDir, 'non-existent.sh');

      // This should not throw an error
      FileLib.makeExecutable(nonExistentFile);
    });

    test('should not make directory executable', async () => {
      const testSubDir = join(testDir, 'test-subdir');
      await mkdir(testSubDir);

      FileLib.makeExecutable(testSubDir);

      expect(FileLib.isExecutable(testSubDir)).toBe(false);
    });
  });

  describe('deleteFilenameExtension', () => {
    test('should remove extension', () => {
      expect(FileLib.deleteFilenameExtension('file.txt')).toBe('file');
      expect(FileLib.deleteFilenameExtension('archive.tar.gz')).toBe('archive.tar');
      expect(FileLib.deleteFilenameExtension('noextension')).toBe('noextension');
      expect(FileLib.deleteFilenameExtension('.hidden')).toBe('');
    });

    test('should handle empty string', () => {
      expect(FileLib.deleteFilenameExtension('')).toBe('');
    });

    test('should handle complex filenames', () => {
      expect(FileLib.deleteFilenameExtension('my.file.with.many.dots.txt')).toBe('my.file.with.many.dots');
      expect(FileLib.deleteFilenameExtension('file.')).toBe('file');
    });
  });

  describe('expandPath', () => {
    test('should expand tilde to home directory', () => {
      const tildeePath = '~/test-path';
      const expanded = FileLib.expandPath(tildeePath);

      expect(expanded).toBe(resolve(homedir(), 'test-path'));
      expect(expanded).not.toContain('~');
    });

    test('should leave absolute paths unchanged', () => {
      const absolutePath = '/absolute/path';
      const expanded = FileLib.expandPath(absolutePath);

      expect(expanded).toBe(absolutePath);
    });

    test('should leave relative paths unchanged', () => {
      const relativePath = 'relative/path';
      const expanded = FileLib.expandPath(relativePath);

      expect(expanded).toBe(relativePath);
    });

    test('should handle tilde only', () => {
      const tildeOnly = '~';
      const expanded = FileLib.expandPath(tildeOnly);

      expect(expanded).toBe('~');
    });
  });

  describe('getFileSymlinkPath', () => {
    test('should return symlink target', async () => {
      const sourceFile = join(testDir, 'source.txt');
      const linkFile = join(testDir, 'link.txt');

      await writeFile(sourceFile, 'content');
      await symlink(sourceFile, linkFile);

      const target = FileLib.getFileSymlinkPath(linkFile);
      expect(target).toBe(sourceFile);
    });
  });

  describe('getDisplayPath', () => {
    test('should replace home with tilde', () => {
      const homePath = join(homedir(), 'some', 'path');
      const displayPath = FileLib.getDisplayPath(homePath);

      expect(displayPath).toBe('~/some/path');
    });

    test('should leave non-home paths unchanged', () => {
      const nonHomePath = '/some/other/path';
      const displayPath = FileLib.getDisplayPath(nonHomePath);

      expect(displayPath).toBe(nonHomePath);
    });
  });

  describe('backupPath', () => {
    test('should backup regular file with correct timestamp format', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const sourceFile = join(testDir, 'source.txt');
      const content = 'test content';

      await writeFile(sourceFile, content);
      
      const beforeBackup = Date.now();
      FileLib.backupPath(sourceFile);
      const afterBackup = Date.now();

      const backupFiles = FileLib.readDirectory(testDir).filter((f) => /\.dotsx\.\d{17}\.backup$/.test(f));
      expect(backupFiles.length).toBe(1);
      
      const backupFileName = backupFiles[0] as string;
      expect(FileLib.readFile(join(testDir, backupFileName))).toBe(content);
      
      // Verify timestamp format (17 digits: YYYYMMDDHHMMSSMMM)
      const timestampMatch = backupFileName.match(/\.dotsx\.(\d{17})\.backup$/);
      expect(timestampMatch).toBeTruthy();
      
      if (timestampMatch) {
        const timestamp = timestampMatch[1] as string;
        expect(timestamp).toBeDefined();
        expect(timestamp).toHaveLength(17);
        
        // Verify year is current
        const year = parseInt(timestamp.substring(0, 4));
        expect(year).toBeGreaterThanOrEqual(new Date().getFullYear());
      }

      consoleSpy.mockRestore();
    });

    test('should backup directory with nested files', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const sourceDir = join(testDir, 'source-dir');
      const nestedDir = join(sourceDir, 'nested');
      const file1 = join(sourceDir, 'file1.txt');
      const file2 = join(nestedDir, 'file2.txt');

      await mkdir(sourceDir);
      await mkdir(nestedDir);
      await writeFile(file1, 'content1');
      await writeFile(file2, 'content2');

      FileLib.backupPath(sourceDir);

      const backupDirs = FileLib.readDirectory(testDir).filter((f) => /\.dotsx\.\d{17}\.backup$/.test(f));
      expect(backupDirs.length).toBe(1);
      
      const backupDirName = backupDirs[0] as string;
      const backupPath = join(testDir, backupDirName);
      
      expect(FileLib.isDirectory(backupPath)).toBe(true);
      expect(FileLib.isFile(join(backupPath, 'file1.txt'))).toBe(true);
      expect(FileLib.isDirectory(join(backupPath, 'nested'))).toBe(true);
      expect(FileLib.isFile(join(backupPath, 'nested', 'file2.txt'))).toBe(true);
      expect(FileLib.readFile(join(backupPath, 'file1.txt'))).toBe('content1');
      expect(FileLib.readFile(join(backupPath, 'nested', 'file2.txt'))).toBe('content2');

      consoleSpy.mockRestore();
    });

    test('should handle recursive symlink backup and remove symlink', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const sourceFile = join(testDir, 'source.txt');
      const linkFile = join(testDir, 'link.txt');
      const content = 'test content';

      await writeFile(sourceFile, content);
      await symlink(sourceFile, linkFile);

      expect(FileLib.isSymLink(linkFile)).toBe(true);

      FileLib.backupPath(linkFile);

      // Verify symlink was removed
      expect(FileLib.isPathExists(linkFile)).toBe(false);
      
      // Verify source file was backed up (recursive backup)
      const backupFiles = FileLib.readDirectory(testDir).filter((f) => /\.dotsx\.\d{17}\.backup$/.test(f));
      expect(backupFiles.length).toBe(1);
      
      const backupFileName = backupFiles[0] as string;
      expect(FileLib.readFile(join(testDir, backupFileName))).toBe(content);

      consoleSpy.mockRestore();
    });

    test('should handle symlink to directory recursively', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const sourceDir = join(testDir, 'source-dir');
      const linkDir = join(testDir, 'link-dir');
      const file1 = join(sourceDir, 'file1.txt');

      await mkdir(sourceDir);
      await writeFile(file1, 'content1');
      await symlink(sourceDir, linkDir);

      FileLib.backupPath(linkDir);

      // Verify symlink was removed
      expect(FileLib.isPathExists(linkDir)).toBe(false);
      
      // Verify source directory was backed up recursively
      const backupDirs = FileLib.readDirectory(testDir).filter((f) => /\.dotsx\.\d{17}\.backup$/.test(f));
      expect(backupDirs.length).toBe(1);
      
      const backupDirName = backupDirs[0] as string;
      expect(FileLib.isDirectory(join(testDir, backupDirName))).toBe(true);
      expect(FileLib.isFile(join(testDir, backupDirName, 'file1.txt'))).toBe(true);
      expect(FileLib.readFile(join(testDir, backupDirName, 'file1.txt'))).toBe('content1');

      consoleSpy.mockRestore();
    });

    test('should handle non-existent path gracefully', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const nonExistentFile = join(testDir, 'non-existent.txt');

      // Should not throw error
      expect(() => FileLib.backupPath(nonExistentFile)).not.toThrow();
      
      // No backup should be created
      const backupFiles = FileLib.readDirectory(testDir).filter((f) => /\.dotsx\.\d{17}\.backup$/.test(f));
      expect(backupFiles.length).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('safeSymlink', () => {
    test('should create symlink when destination does not exist', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const sourceFile = join(testDir, 'source.txt');
      const linkFile = join(testDir, 'link.txt');
      const content = 'test content';

      await writeFile(sourceFile, content);
      FileLib.safeSymlink(sourceFile, linkFile);

      expect(FileLib.isSymLink(linkFile)).toBe(true);
      expect(FileLib.isSymLinkContentCorrect(sourceFile, linkFile)).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔗 Symlink created:'));

      consoleSpy.mockRestore();
    });

    test('should backup existing file and create symlink with content verification', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const sourceFile = join(testDir, 'source.txt');
      const existingFile = join(testDir, 'existing.txt');
      const sourceContent = 'source content';
      const existingContent = 'existing content that should be backed up';

      await writeFile(sourceFile, sourceContent);
      await writeFile(existingFile, existingContent);

      FileLib.safeSymlink(sourceFile, existingFile);

      // Verify symlink was created correctly
      expect(FileLib.isSymLink(existingFile)).toBe(true);
      expect(FileLib.isSymLinkContentCorrect(sourceFile, existingFile)).toBe(true);
      
      // Verify original content was backed up
      const backupFiles = FileLib.readDirectory(testDir).filter((f) => /\.dotsx\.\d{17}\.backup$/.test(f));
      expect(backupFiles.length).toBe(1);
      
      const backupContent = FileLib.readFile(join(testDir, backupFiles[0] as string));
      expect(backupContent).toBe(existingContent);
      
      // Verify console messages
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('💾 Backup created:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔗 Symlink created:'));

      consoleSpy.mockRestore();
    });

    test('should backup existing directory and create symlink', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const sourceDir = join(testDir, 'source-dir');
      const existingDir = join(testDir, 'existing-dir');
      
      // Create source directory
      FileLib.createDirectory(sourceDir);
      await writeFile(join(sourceDir, 'source.txt'), 'source content');
      
      // Create existing directory to replace
      FileLib.createDirectory(existingDir);
      await writeFile(join(existingDir, 'existing.txt'), 'existing content');
      await writeFile(join(existingDir, 'another.txt'), 'another content');

      FileLib.safeSymlink(sourceDir, existingDir);

      // Verify symlink was created correctly
      expect(FileLib.isSymLink(existingDir)).toBe(true);
      expect(FileLib.isSymLinkContentCorrect(sourceDir, existingDir)).toBe(true);
      
      // Verify backup directory exists with all original content
      const backupDirs = FileLib.readDirectory(testDir).filter((f) => /\.dotsx\.\d{17}\.backup$/.test(f));
      expect(backupDirs.length).toBe(1);
      
      const backupPath = join(testDir, backupDirs[0] as string);
      expect(FileLib.isDirectory(backupPath)).toBe(true);
      expect(FileLib.isFile(join(backupPath, 'existing.txt'))).toBe(true);
      expect(FileLib.isFile(join(backupPath, 'another.txt'))).toBe(true);
      expect(FileLib.readFile(join(backupPath, 'existing.txt'))).toBe('existing content');
      expect(FileLib.readFile(join(backupPath, 'another.txt'))).toBe('another content');

      consoleSpy.mockRestore();
    });

    test('should create parent directories when they do not exist', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const sourceFile = join(testDir, 'source.txt');
      const linkFile = join(testDir, 'nested', 'very', 'deep', 'link.txt');
      
      await writeFile(sourceFile, 'content');

      FileLib.safeSymlink(sourceFile, linkFile);

      // Verify parent directories were created
      expect(FileLib.isDirectory(join(testDir, 'nested'))).toBe(true);
      expect(FileLib.isDirectory(join(testDir, 'nested', 'very'))).toBe(true);
      expect(FileLib.isDirectory(join(testDir, 'nested', 'very', 'deep'))).toBe(true);
      
      // Verify symlink was created
      expect(FileLib.isSymLink(linkFile)).toBe(true);
      expect(FileLib.isSymLinkContentCorrect(sourceFile, linkFile)).toBe(true);

      consoleSpy.mockRestore();
    });

    test('should replace existing symlink', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const sourceFile1 = join(testDir, 'source1.txt');
      const sourceFile2 = join(testDir, 'source2.txt');
      const linkFile = join(testDir, 'link.txt');
      
      await writeFile(sourceFile1, 'content1');
      await writeFile(sourceFile2, 'content2');
      
      // Create first symlink
      FileLib.safeSymlink(sourceFile1, linkFile);
      expect(FileLib.isSymLinkContentCorrect(sourceFile1, linkFile)).toBe(true);
      
      // Replace with new symlink
      FileLib.safeSymlink(sourceFile2, linkFile);
      expect(FileLib.isSymLinkContentCorrect(sourceFile2, linkFile)).toBe(true);
      expect(FileLib.isSymLinkContentCorrect(sourceFile1, linkFile)).toBe(false);

      consoleSpy.mockRestore();
    });

    test('should create broken symlink when source does not exist', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const sourceFile = join(testDir, 'non-existent-source.txt');
      const linkFile = join(testDir, 'link.txt');

      FileLib.safeSymlink(sourceFile, linkFile);

      expect(FileLib.isSymLink(linkFile)).toBe(true);
      // This creates a broken symlink, which is valid for the use case
      expect(FileLib.isPathExists(sourceFile)).toBe(false);

      consoleSpy.mockRestore();
    });

    test('should handle symlink creation errors', async () => {
      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock fs.symlinkSync to throw an error
      const originalSymlinkSync = require('fs').symlinkSync;
      const symlinkSyncSpy = spyOn(require('fs'), 'symlinkSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const sourceFile = join(testDir, 'source.txt');
      const linkFile = join(testDir, 'link.txt');
      
      await writeFile(sourceFile, 'content');

      expect(() => FileLib.safeSymlink(sourceFile, linkFile)).toThrow('Permission denied');

      symlinkSyncSpy.mockRestore();
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});
