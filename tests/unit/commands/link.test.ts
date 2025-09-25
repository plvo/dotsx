import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as clackPrompts from '@clack/prompts';
import { DOTSX } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import type { AllLinks } from '@/types';
import { linkCommand } from '../../../src/commands/link';

describe('linkCommand', () => {
  let testDir: string;
  let consoleSpy: ReturnType<typeof spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(path.join(tmpdir(), 'dotsx-link-test-'));
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
  });

  describe('execute', () => {
    test('should handle add link action', async () => {
      const checkStatusSpy = spyOn(linkCommand, 'checkStatus').mockResolvedValue({
        correctSymlinks: [],
        incorrectSymlinks: [],
      });
      const selectSpy = spyOn(clackPrompts, 'select').mockResolvedValue('add');
      const addLinkSpy = spyOn(linkCommand, 'addLink').mockImplementation(async () => {});

      await linkCommand.execute();

      expect(addLinkSpy).toHaveBeenCalled();

      checkStatusSpy.mockRestore();
      selectSpy.mockRestore();
      addLinkSpy.mockRestore();
    });

    test('should handle sync links action', async () => {
      const mockAllLinks: AllLinks = {
        correctSymlinks: [],
        incorrectSymlinks: [{ dotsxPath: '/test/link', systemPath: '/test/target' }],
      };
      const checkStatusSpy = spyOn(linkCommand, 'checkStatus').mockResolvedValue(mockAllLinks);
      const selectSpy = spyOn(clackPrompts, 'select').mockResolvedValue('sync');
      const syncLinksSpy = spyOn(linkCommand, 'syncLinks').mockImplementation(async () => {});

      await linkCommand.execute();

      expect(syncLinksSpy).toHaveBeenCalledWith(mockAllLinks);

      checkStatusSpy.mockRestore();
      selectSpy.mockRestore();
      syncLinksSpy.mockRestore();
    });
  });

  describe('addLink', () => {
    test('should add a new file link', async () => {
      const testFile = path.join(testDir, 'test.txt');
      const textSpy = spyOn(clackPrompts, 'text').mockResolvedValue(testFile);
      const expandPathSpy = spyOn(FileLib, 'expandPath').mockReturnValue(testFile);
      const isPathExistsSpy = spyOn(FileLib, 'isPathExists').mockReturnValue(true);
      const createDirectorySpy = spyOn(FileLib, 'createDirectory').mockImplementation(() => {});
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(false);
      const copyFileSpy = spyOn(FileLib, 'copyFile').mockImplementation(() => {});
      const safeSymlinkSpy = spyOn(FileLib, 'safeSymlink').mockImplementation(() => {});
      const getDotsxPathSpy = spyOn(linkCommand, 'getDotsxPath').mockReturnValue('/dotsx/links/test.txt');

      await linkCommand.addLink();

      expect(safeSymlinkSpy).toHaveBeenCalledWith(expect.any(String), expect.any(String), true);

      textSpy.mockRestore();
      expandPathSpy.mockRestore();
      isPathExistsSpy.mockRestore();
      createDirectorySpy.mockRestore();
      isDirectorySpy.mockRestore();
      copyFileSpy.mockRestore();
      safeSymlinkSpy.mockRestore();
      getDotsxPathSpy.mockRestore();
    });

    test('should add a new directory link', async () => {
      const testDirPath = path.join(testDir, 'testdir');
      const textSpy = spyOn(clackPrompts, 'text').mockResolvedValue(testDirPath);
      const expandPathSpy = spyOn(FileLib, 'expandPath').mockReturnValue(testDirPath);
      const isPathExistsSpy = spyOn(FileLib, 'isPathExists').mockReturnValue(true);
      const createDirectorySpy = spyOn(FileLib, 'createDirectory').mockImplementation(() => {});
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(true);
      const copyDirectorySpy = spyOn(FileLib, 'copyDirectory').mockImplementation(() => {});
      const safeSymlinkSpy = spyOn(FileLib, 'safeSymlink').mockImplementation(() => {});
      const getDotsxPathSpy = spyOn(linkCommand, 'getDotsxPath').mockReturnValue('/dotsx/links/testdir');

      await linkCommand.addLink();

      expect(safeSymlinkSpy).toHaveBeenCalledWith(expect.any(String), expect.any(String), true);

      textSpy.mockRestore();
      expandPathSpy.mockRestore();
      isPathExistsSpy.mockRestore();
      createDirectorySpy.mockRestore();
      isDirectorySpy.mockRestore();
      copyDirectorySpy.mockRestore();
      safeSymlinkSpy.mockRestore();
      getDotsxPathSpy.mockRestore();
    });

    test('should return early if no path input', async () => {
      const textSpy = spyOn(clackPrompts, 'text').mockResolvedValue('');
      const expandPathSpy = spyOn(FileLib, 'expandPath');
      const getDotsxPathSpy = spyOn(linkCommand, 'getDotsxPath');

      await linkCommand.addLink();

      expect(getDotsxPathSpy).not.toHaveBeenCalled();

      textSpy.mockRestore();
      expandPathSpy.mockRestore();
      getDotsxPathSpy.mockRestore();
    });

    test('should validate file exists', async () => {
      const textSpy = spyOn(clackPrompts, 'text').mockImplementation(async ({ validate }) => {
        const result = validate?.('/nonexistent/file');
        expect(result).toBe("File doesn't exist");
        return Promise.resolve('');
      });
      const isPathExistsSpy = spyOn(FileLib, 'isPathExists').mockReturnValue(false);
      const expandPathSpy = spyOn(FileLib, 'expandPath').mockReturnValue('/nonexistent/file');

      await linkCommand.addLink();

      textSpy.mockRestore();
      isPathExistsSpy.mockRestore();
      expandPathSpy.mockRestore();
    });
  });

  describe('syncLinks', () => {
    test('should sync broken links', async () => {
      const links: AllLinks = {
        correctSymlinks: [],
        incorrectSymlinks: [
          { dotsxPath: '/dotsx/link1', systemPath: '/home/target1' },
          { dotsxPath: '/dotsx/link2', systemPath: '/home/target2' },
        ],
      };

      const confirmSpy = spyOn(clackPrompts, 'confirm').mockResolvedValue(true);
      const createDirectorySpy = spyOn(FileLib, 'createDirectory').mockImplementation(() => {});
      const safeSymlinkSpy = spyOn(FileLib, 'safeSymlink').mockImplementation(() => {});
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockImplementation((p) => p);

      await linkCommand.syncLinks(links);

      expect(safeSymlinkSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(`\n🎉 Fixed 2/2 links`);

      confirmSpy.mockRestore();
      createDirectorySpy.mockRestore();
      safeSymlinkSpy.mockRestore();
      getDisplayPathSpy.mockRestore();
    });

    test('should handle sync errors', async () => {
      const links: AllLinks = {
        correctSymlinks: [],
        incorrectSymlinks: [{ systemPath: '/home/target1', dotsxPath: '/dotsx/link1' }],
      };

      const confirmSpy = spyOn(clackPrompts, 'confirm').mockResolvedValue(true);
      const safeSymlinkSpy = spyOn(FileLib, 'safeSymlink').mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockImplementation((p) => p);

      await linkCommand.syncLinks(links);

      expect(consoleSpy).toHaveBeenCalledWith('❌ /dotsx/link1: Error: Permission denied');
      expect(consoleSpy).toHaveBeenCalledWith(`\n🎉 Fixed 0/1 links`);

      confirmSpy.mockRestore();
      safeSymlinkSpy.mockRestore();
      getDisplayPathSpy.mockRestore();
    });

    test('should skip sync if user declines', async () => {
      const links: AllLinks = {
        correctSymlinks: [],
        incorrectSymlinks: [{ systemPath: '/home/target1', dotsxPath: '/dotsx/link1' }],
      };

      const confirmSpy = spyOn(clackPrompts, 'confirm').mockResolvedValue(false);
      const safeSymlinkSpy = spyOn(FileLib, 'safeSymlink');

      await linkCommand.syncLinks(links);

      expect(safeSymlinkSpy).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
      safeSymlinkSpy.mockRestore();
    });

    test('should handle all correct links', async () => {
      const links: AllLinks = {
        correctSymlinks: [{ systemPath: '/home/target1', dotsxPath: '/dotsx/link1' }],
        incorrectSymlinks: [],
      };

      await linkCommand.syncLinks(links);

      expect(consoleSpy).toHaveBeenCalledWith('✅ All links correct');
    });
  });

  describe('checkStatus', () => {
    test('should return empty arrays when no symlinks', async () => {
      const getSymlinksSpy = spyOn(linkCommand, 'getSymlinks').mockReturnValue([]);

      const result = await linkCommand.checkStatus();

      expect(result).toEqual({ correctSymlinks: [], incorrectSymlinks: [] });

      getSymlinksSpy.mockRestore();
    });

    test('should categorize correct and incorrect symlinks', async () => {
      const getSymlinksSpy = spyOn(linkCommand, 'getSymlinks').mockReturnValue([
        { dotsxPath: '/dotsx/link1', systemPath: '/home/target1' },
        { dotsxPath: '/dotsx/link2', systemPath: '/home/target2' },
        { dotsxPath: '/dotsx/link3', systemPath: '/home/target3' },
      ]);
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockImplementation((p) => p);
      const isSymLinkContentCorrectSpy = spyOn(FileLib, 'isSymLinkContentCorrect')
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const result = await linkCommand.checkStatus();

      expect(result.correctSymlinks).toHaveLength(2);
      expect(result.incorrectSymlinks).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(`\n2/3 links correct`);

      getSymlinksSpy.mockRestore();
      getDisplayPathSpy.mockRestore();
      isSymLinkContentCorrectSpy.mockRestore();
    });
  });

  describe('getSymlinks', () => {
    test('should return empty array when symlinks directory does not exist', () => {
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(false);

      const result = linkCommand.getSymlinks();

      expect(result).toEqual([]);

      isDirectorySpy.mockRestore();
    });

    test('should recursively scan symlinks directory', () => {
      const isDirectorySpy = spyOn(FileLib, 'isDirectory')
        .mockReturnValueOnce(true) // DOTSX.SYMLINKS exists
        .mockReturnValueOnce(false) // file1 is not directory
        .mockReturnValueOnce(true) // subdir is directory
        .mockReturnValueOnce(false); // file2 is not directory

      const readDirectorySpy = spyOn(FileLib, 'readDirectory')
        .mockReturnValueOnce(['file1.txt', 'subdir'])
        .mockReturnValueOnce(['file2.txt']);

      const getTargetPathSpy = spyOn(linkCommand, 'getTargetPath')
        .mockReturnValueOnce('/home/file1.txt')
        .mockReturnValueOnce('/home/subdir/file2.txt');

      const result = linkCommand.getSymlinks();

      expect(result).toHaveLength(2);
      expect(result?.[0]?.dotsxPath).toContain('file1.txt');
      expect(result?.[1]?.dotsxPath).toContain('file2.txt');

      isDirectorySpy.mockRestore();
      readDirectorySpy.mockRestore();
      getTargetPathSpy.mockRestore();
    });
  });

  describe('getDotsxPath', () => {
    test('should handle home directory paths', () => {
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockReturnValue('~/.config/test');

      const result = linkCommand.getDotsxPath('/home/user/.config/test');

      expect(result).toBe(path.resolve(DOTSX.SYMLINKS, '~/.config/test'));

      getDisplayPathSpy.mockRestore();
    });

    test('should handle absolute paths', () => {
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockReturnValue('/etc/config');

      const result = linkCommand.getDotsxPath('/etc/config');

      expect(result).toBe(path.resolve(DOTSX.SYMLINKS, 'etc/config'));

      getDisplayPathSpy.mockRestore();
    });

    test('should handle relative paths', () => {
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockReturnValue('config/file');

      const result = linkCommand.getDotsxPath('config/file');

      expect(result).toBe(path.resolve(DOTSX.SYMLINKS, 'config/file'));

      getDisplayPathSpy.mockRestore();
    });
  });

  describe('getTargetPath', () => {
    test('should handle home directory relative paths', () => {
      const expandPathSpy = spyOn(FileLib, 'expandPath').mockReturnValue('/home/user/.config/test');

      const result = linkCommand.getTargetPath('~/.config/test');

      expect(result).toBe('/home/user/.config/test');

      expandPathSpy.mockRestore();
    });

    test('should handle other relative paths', () => {
      const result = linkCommand.getTargetPath('etc/config');

      expect(result).toBe('/etc/config');
    });
  });
});
