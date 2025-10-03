import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FileLib } from '@/lib/file';

describe('FileLib', () => {
  const testDir = path.join(os.tmpdir(), 'dotsx-test-file');

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

  describe('isExists', () => {
    it('should return true for existing file', () => {
      const file = path.join(testDir, 'test.txt');
      fs.writeFileSync(file, 'test');
      expect(FileLib.isExists(file)).toBe(true);
    });

    it('should return false for non-existing file', () => {
      expect(FileLib.isExists('/non/existing/path')).toBe(false);
    });
  });

  describe('isFile', () => {
    it('should return true for file', () => {
      const file = path.join(testDir, 'test.txt');
      fs.writeFileSync(file, 'test');
      expect(FileLib.isFile(file)).toBe(true);
    });

    it('should return false for directory', () => {
      expect(FileLib.isFile(testDir)).toBe(false);
    });

    it('should return false for non-existing path', () => {
      expect(FileLib.isFile('/non/existing')).toBe(false);
    });
  });

  describe('isDirectory', () => {
    it('should return true for directory', () => {
      expect(FileLib.isDirectory(testDir)).toBe(true);
    });

    it('should return false for file', () => {
      const file = path.join(testDir, 'test.txt');
      fs.writeFileSync(file, 'test');
      expect(FileLib.isDirectory(file)).toBe(false);
    });

    it('should return false for non-existing path', () => {
      expect(FileLib.isDirectory('/non/existing')).toBe(false);
    });
  });

  describe('isSymLink', () => {
    it('should return true for symlink', () => {
      const file = path.join(testDir, 'test.txt');
      const link = path.join(testDir, 'link.txt');
      fs.writeFileSync(file, 'test');
      fs.symlinkSync(file, link);
      expect(FileLib.isSymLink(link)).toBe(true);
    });

    it('should return false for regular file', () => {
      const file = path.join(testDir, 'test.txt');
      fs.writeFileSync(file, 'test');
      expect(FileLib.isSymLink(file)).toBe(false);
    });
  });

  describe('expand', () => {
    it('should expand ~/path to home directory', () => {
      const home = os.homedir();
      expect(FileLib.expand('~/test')).toBe(path.join(home, 'test'));
    });

    it('should expand __home__/path to home directory', () => {
      const home = os.homedir();
      expect(FileLib.expand('__home__/test')).toBe(path.join(home, 'test'));
    });

    it('should expand __home__ to home directory', () => {
      const home = os.homedir();
      expect(FileLib.expand('__home__')).toBe(home);
    });

    it('should return absolute paths unchanged', () => {
      expect(FileLib.expand('/absolute/path')).toBe('/absolute/path');
    });
  });

  describe('display', () => {
    it('should extract path after __home__/', () => {
      expect(FileLib.display('__home__/.zshrc')).toBe('.zshrc');
    });

    it('should return original path if no __home__/', () => {
      expect(FileLib.display('/etc/config')).toBe('/etc/config');
    });
  });

  describe('toDotsxPath', () => {
    it('should convert home path to __home__ format', () => {
      const home = os.homedir();
      const systemPath = path.join(home, '.zshrc');
      const result = FileLib.toDotsxPath(systemPath, testDir);
      expect(result).toBe(path.join(testDir, '__home__', '.zshrc'));
    });

    it('should handle non-home paths', () => {
      const result = FileLib.toDotsxPath('/etc/config', testDir);
      expect(result).toBe(path.join(testDir, 'etc/config'));
    });

    it('should handle paths with leading slash', () => {
      const result = FileLib.toDotsxPath('/absolute/path', testDir);
      expect(result).toBe(path.join(testDir, 'absolute/path'));
    });
  });

  describe('File.isExecutable', () => {
    it('should return true for executable file', () => {
      const file = path.join(testDir, 'script.sh');
      fs.writeFileSync(file, '#!/bin/bash');
      fs.chmodSync(file, 0o755);
      expect(FileLib.File.isExecutable(file)).toBe(true);
    });

    it('should return false for non-executable file', () => {
      const file = path.join(testDir, 'test.txt');
      fs.writeFileSync(file, 'test');
      expect(FileLib.File.isExecutable(file)).toBe(false);
    });
  });

  describe('File.create', () => {
    it('should create new file with content', () => {
      const file = path.join(testDir, 'new.txt');
      FileLib.File.create(file, 'content');
      expect(fs.existsSync(file)).toBe(true);
      expect(fs.readFileSync(file, 'utf8')).toBe('content');
    });

    it('should create parent directories', () => {
      const file = path.join(testDir, 'nested/dir/file.txt');
      FileLib.File.create(file);
      expect(fs.existsSync(file)).toBe(true);
    });

    it('should not overwrite existing file', () => {
      const file = path.join(testDir, 'existing.txt');
      fs.writeFileSync(file, 'original');
      FileLib.File.create(file, 'new');
      expect(fs.readFileSync(file, 'utf8')).toBe('original');
    });
  });

  describe('File.deleteFile', () => {
    it('should delete existing file', () => {
      const file = path.join(testDir, 'delete.txt');
      fs.writeFileSync(file, 'test');
      FileLib.File.deleteFile(file);
      expect(fs.existsSync(file)).toBe(false);
    });

    it('should not throw on non-existing file', () => {
      expect(() => FileLib.File.deleteFile('/non/existing')).not.toThrow();
    });
  });

  describe('File.read', () => {
    it('should read file content', () => {
      const file = path.join(testDir, 'read.txt');
      fs.writeFileSync(file, 'test content');
      expect(FileLib.File.read(file)).toBe('test content');
    });
  });

  describe('File.readAsArray', () => {
    it('should read file as array of lines', () => {
      const file = path.join(testDir, 'lines.txt');
      fs.writeFileSync(file, 'line1\nline2\nline3');
      expect(FileLib.File.readAsArray(file)).toEqual(['line1', 'line2', 'line3']);
    });

    it('should filter empty lines and comments', () => {
      const file = path.join(testDir, 'lines.txt');
      fs.writeFileSync(file, 'line1\n# comment\n\nline2');
      expect(FileLib.File.readAsArray(file)).toEqual(['line1', 'line2']);
    });

    it('should return empty array on error', () => {
      expect(FileLib.File.readAsArray('/non/existing')).toEqual([]);
    });
  });

  describe('File.write', () => {
    it('should write to existing file', () => {
      const file = path.join(testDir, 'write.txt');
      fs.writeFileSync(file, 'old');
      FileLib.File.write(file, 'new');
      expect(fs.readFileSync(file, 'utf8')).toBe('new');
    });
  });

  describe('File.writeAppend', () => {
    it('should append to existing file', () => {
      const file = path.join(testDir, 'append.txt');
      fs.writeFileSync(file, 'line1');
      FileLib.File.writeAppend(file, 'line2');
      expect(fs.readFileSync(file, 'utf8')).toBe('line1line2\n');
    });
  });

  describe('File.writeReplacing', () => {
    it('should replace content in file', () => {
      const file = path.join(testDir, 'replace.txt');
      fs.writeFileSync(file, 'hello world');
      FileLib.File.writeReplacing(file, 'hi', 'hello');
      expect(fs.readFileSync(file, 'utf8')).toBe('hi world');
    });

    it('should handle non-existing file gracefully', () => {
      expect(() => FileLib.File.writeReplacing('/non/existing', 'new', 'old')).not.toThrow();
    });
  });

  describe('File.makeExecutable', () => {
    it('should make file executable', () => {
      const file = path.join(testDir, 'script.sh');
      fs.writeFileSync(file, '#!/bin/bash');
      FileLib.File.makeExecutable(file);
      const mode = fs.statSync(file).mode;
      expect((mode & 0o111) !== 0).toBe(true);
    });
  });

  describe('File.deleteExtension', () => {
    it('should remove file extension', () => {
      expect(FileLib.File.deleteExtension('script.sh')).toBe('script');
    });

    it('should handle multiple extensions', () => {
      expect(FileLib.File.deleteExtension('script.sh.txt')).toBe('script.sh');
    });

    it('should handle no extension', () => {
      expect(FileLib.File.deleteExtension('script')).toBe('script');
    });
  });

  describe('File.copy', () => {
    it('should copy file', () => {
      const src = path.join(testDir, 'src.txt');
      const dest = path.join(testDir, 'dest.txt');
      fs.writeFileSync(src, 'content');
      FileLib.File.copy(src, dest);
      expect(fs.readFileSync(dest, 'utf8')).toBe('content');
    });
  });

  describe('Directory.create', () => {
    it('should create directory', () => {
      const dir = path.join(testDir, 'newdir');
      FileLib.Directory.create(dir);
      expect(fs.existsSync(dir)).toBe(true);
    });

    it('should create nested directories', () => {
      const dir = path.join(testDir, 'a/b/c');
      FileLib.Directory.create(dir);
      expect(fs.existsSync(dir)).toBe(true);
    });

    it('should not throw if directory exists', () => {
      FileLib.Directory.create(testDir);
      expect(() => FileLib.Directory.create(testDir)).not.toThrow();
    });
  });

  describe('Directory.deleteDirectory', () => {
    it('should delete directory recursively', () => {
      const dir = path.join(testDir, 'todelete');
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, 'file.txt'), 'test');
      FileLib.Directory.deleteDirectory(dir);
      expect(fs.existsSync(dir)).toBe(false);
    });
  });

  describe('Directory.read', () => {
    it('should read directory contents', () => {
      fs.writeFileSync(path.join(testDir, 'file1.txt'), 'test');
      fs.writeFileSync(path.join(testDir, 'file2.txt'), 'test');
      const files = FileLib.Directory.read(testDir);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
    });

    it('should return empty array for non-existing directory', () => {
      expect(FileLib.Directory.read('/non/existing')).toEqual([]);
    });
  });

  describe('Directory.copy', () => {
    it('should copy directory recursively', () => {
      const src = path.join(testDir, 'src');
      const dest = path.join(testDir, 'dest');
      fs.mkdirSync(src);
      fs.writeFileSync(path.join(src, 'file.txt'), 'content');
      fs.mkdirSync(path.join(src, 'subdir'));
      fs.writeFileSync(path.join(src, 'subdir', 'nested.txt'), 'nested');

      FileLib.Directory.copy(src, dest);

      expect(fs.existsSync(path.join(dest, 'file.txt'))).toBe(true);
      expect(fs.existsSync(path.join(dest, 'subdir', 'nested.txt'))).toBe(true);
      expect(fs.readFileSync(path.join(dest, 'file.txt'), 'utf8')).toBe('content');
    });
  });
});
