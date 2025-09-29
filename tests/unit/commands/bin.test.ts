import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as clackPrompts from '@clack/prompts';
import { DOTSX } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';
import { binCommand } from '../../../src/commands/bin';

describe('binCommand', () => {
  let testDir: string;
  let consoleSpy: ReturnType<typeof spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(path.join(tmpdir(), 'dotsx-bin-test-'));
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
  });

  describe('execute', () => {
    test('should handle missing bin directory', async () => {
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(false);

      await binCommand.execute();

      expect(consoleSpy).toHaveBeenCalledWith(`❌ Directory ${DOTSX.BIN.PATH} does not exist`);

      isDirectorySpy.mockRestore();
    });

    test('should create alias file if missing', async () => {
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(true);
      const isFileSpy = spyOn(FileLib, 'isFile').mockReturnValue(false);
      const createFileSpy = spyOn(FileLib, 'createFile').mockImplementation(() => {});

      await binCommand.execute();

      expect(createFileSpy).toHaveBeenCalledWith(DOTSX.BIN.ALIAS);
      expect(consoleSpy).toHaveBeenCalledWith(`✅ File ${DOTSX.BIN.ALIAS} created, relaunch the cli`);

      isDirectorySpy.mockRestore();
      isFileSpy.mockRestore();
      createFileSpy.mockRestore();
    });

    test('should handle no scripts found', async () => {
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(true);
      const isFileSpy = spyOn(FileLib, 'isFile').mockReturnValue(true);
      const checkOrWriteSourceSpy = spyOn(binCommand, 'checkOrWriteSourceInRcFile').mockReturnValue(true);
      const readBinDirectorySpy = spyOn(binCommand, 'readBinDirectory').mockReturnValue([]);

      await binCommand.execute();

      expect(consoleSpy).toHaveBeenCalledWith('ℹ️ No shell scripts found');

      isDirectorySpy.mockRestore();
      isFileSpy.mockRestore();
      checkOrWriteSourceSpy.mockRestore();
      readBinDirectorySpy.mockRestore();
    });

    test('should process scripts and setup when needed', async () => {
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(true);
      const isFileSpy = spyOn(FileLib, 'isFile').mockReturnValue(true);
      const checkOrWriteSourceSpy = spyOn(binCommand, 'checkOrWriteSourceInRcFile').mockReturnValue(true);
      const readBinDirectorySpy = spyOn(binCommand, 'readBinDirectory').mockReturnValue(['script1.sh']);
      const deleteFilenameExtensionSpy = spyOn(FileLib, 'deleteFilenameExtension').mockReturnValue('script1');
      const isExecutableSpy = spyOn(FileLib, 'isExecutable').mockReturnValue(false);
      const checkAliasInFileSpy = spyOn(binCommand, 'checkAliasInFile').mockReturnValue(false);
      const confirmSpy = spyOn(clackPrompts, 'confirm').mockResolvedValue(true);
      const addAliasSpy = spyOn(binCommand, 'addAlias').mockImplementation(() => {});
      const makeExecutableSpy = spyOn(FileLib, 'makeExecutable').mockImplementation(() => {});

      await binCommand.execute();

      expect(confirmSpy).toHaveBeenCalledWith({
        message: 'Are you sure you want to setup not configured bin scripts?',
        initialValue: false,
      });
      expect(addAliasSpy).toHaveBeenCalled();
      expect(makeExecutableSpy).toHaveBeenCalled();

      isDirectorySpy.mockRestore();
      isFileSpy.mockRestore();
      checkOrWriteSourceSpy.mockRestore();
      readBinDirectorySpy.mockRestore();
      deleteFilenameExtensionSpy.mockRestore();
      isExecutableSpy.mockRestore();
      checkAliasInFileSpy.mockRestore();
      confirmSpy.mockRestore();
      addAliasSpy.mockRestore();
      makeExecutableSpy.mockRestore();
    });

    test('should handle already configured scripts', async () => {
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(true);
      const isFileSpy = spyOn(FileLib, 'isFile').mockReturnValue(true);
      const checkOrWriteSourceSpy = spyOn(binCommand, 'checkOrWriteSourceInRcFile').mockReturnValue(true);
      const readBinDirectorySpy = spyOn(binCommand, 'readBinDirectory').mockReturnValue(['script1.sh']);
      const deleteFilenameExtensionSpy = spyOn(FileLib, 'deleteFilenameExtension').mockReturnValue('script1');
      const isExecutableSpy = spyOn(FileLib, 'isExecutable').mockReturnValue(true);
      const checkAliasInFileSpy = spyOn(binCommand, 'checkAliasInFile').mockReturnValue(true);

      await binCommand.execute();

      expect(consoleSpy).toHaveBeenCalledWith('\n✅ All scripts are already configured');

      isDirectorySpy.mockRestore();
      isFileSpy.mockRestore();
      checkOrWriteSourceSpy.mockRestore();
      readBinDirectorySpy.mockRestore();
      deleteFilenameExtensionSpy.mockRestore();
      isExecutableSpy.mockRestore();
      checkAliasInFileSpy.mockRestore();
    });

    test('should handle user declining setup', async () => {
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(true);
      const isFileSpy = spyOn(FileLib, 'isFile').mockReturnValue(true);
      const checkOrWriteSourceSpy = spyOn(binCommand, 'checkOrWriteSourceInRcFile').mockReturnValue(true);
      const readBinDirectorySpy = spyOn(binCommand, 'readBinDirectory').mockReturnValue(['script1.sh']);
      const deleteFilenameExtensionSpy = spyOn(FileLib, 'deleteFilenameExtension').mockReturnValue('script1');
      const isExecutableSpy = spyOn(FileLib, 'isExecutable').mockReturnValue(false);
      const checkAliasInFileSpy = spyOn(binCommand, 'checkAliasInFile').mockReturnValue(false);
      const confirmSpy = spyOn(clackPrompts, 'confirm').mockResolvedValue(false);
      const addAliasSpy = spyOn(binCommand, 'addAlias');

      await binCommand.execute();

      expect(addAliasSpy).not.toHaveBeenCalled();

      isDirectorySpy.mockRestore();
      isFileSpy.mockRestore();
      checkOrWriteSourceSpy.mockRestore();
      readBinDirectorySpy.mockRestore();
      deleteFilenameExtensionSpy.mockRestore();
      isExecutableSpy.mockRestore();
      checkAliasInFileSpy.mockRestore();
      confirmSpy.mockRestore();
      addAliasSpy.mockRestore();
    });
  });

  describe('readBinDirectory', () => {
    test('should return empty array when directory does not exist', () => {
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(false);

      const result = binCommand.readBinDirectory();

      expect(result).toEqual([]);

      isDirectorySpy.mockRestore();
    });

    test('should filter and sort script files', () => {
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(true);
      const readDirectorySpy = spyOn(FileLib, 'readDirectory').mockReturnValue([
        'script1.sh',
        '_private.sh',
        'script2.py',
        'subdir',
        'script3.js',
      ]);
      const isFileSpy = spyOn(FileLib, 'isFile')
        .mockReturnValueOnce(true) // script1.sh
        .mockReturnValueOnce(true) // script2.py
        .mockReturnValueOnce(false) // subdir
        .mockReturnValueOnce(true); // script3.js

      const result = binCommand.readBinDirectory();

      expect(result).toEqual(['script1.sh', 'script2.py', 'script3.js']);
      expect(result).not.toContain('_private.sh'); // filtered out
      expect(result).not.toContain('subdir'); // filtered out

      isDirectorySpy.mockRestore();
      readDirectorySpy.mockRestore();
      isFileSpy.mockRestore();
    });
  });

  describe('checkOrWriteSourceInRcFile', () => {
    test('should return true if source already exists', () => {
      const getRcFilePathSpy = spyOn(SystemLib, 'getRcFilePath').mockReturnValue('/home/user/.zshrc');
      const readFileSpy = spyOn(FileLib, 'readFile').mockReturnValue(`source ${DOTSX.BIN.ALIAS}`);

      const result = binCommand.checkOrWriteSourceInRcFile();

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('✅ Source exists in /home/user/.zshrc');

      getRcFilePathSpy.mockRestore();
      readFileSpy.mockRestore();
    });

    test('should add source and return false if not exists', () => {
      const getRcFilePathSpy = spyOn(SystemLib, 'getRcFilePath').mockReturnValue('/home/user/.zshrc');
      const readFileSpy = spyOn(FileLib, 'readFile').mockReturnValue('# other content');
      const writeToEndOfFileSpy = spyOn(FileLib, 'writeToEndOfFile').mockImplementation(() => {});

      const result = binCommand.checkOrWriteSourceInRcFile();

      expect(result).toBe(false);
      expect(writeToEndOfFileSpy).toHaveBeenCalledWith('/home/user/.zshrc', `source ${DOTSX.BIN.ALIAS}`);
      expect(consoleSpy).toHaveBeenCalledWith('✅ Source added to /home/user/.zshrc');

      getRcFilePathSpy.mockRestore();
      readFileSpy.mockRestore();
      writeToEndOfFileSpy.mockRestore();
    });
  });

  describe('checkAliasInFile', () => {
    test('should return true if alias exists', () => {
      const readFileSpy = spyOn(FileLib, 'readFile').mockReturnValue('alias testscript="/path/to/script"');

      const result = binCommand.checkAliasInFile('testscript');

      expect(result).toBe(true);

      readFileSpy.mockRestore();
    });

    test('should return false if alias does not exist', () => {
      const readFileSpy = spyOn(FileLib, 'readFile').mockReturnValue('alias othershit="/path/to/other"');

      const result = binCommand.checkAliasInFile('testscript');

      expect(result).toBe(false);

      readFileSpy.mockRestore();
    });

    test('should handle file read errors', () => {
      const readFileSpy = spyOn(FileLib, 'readFile').mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = binCommand.checkAliasInFile('testscript');

      expect(result).toBe(false);

      readFileSpy.mockRestore();
    });
  });

  describe('addAlias', () => {
    test('should add alias to existing file', () => {
      const isFileSpy = spyOn(FileLib, 'isFile').mockReturnValue(true);
      const writeToEndOfFileSpy = spyOn(FileLib, 'writeToEndOfFile').mockImplementation(() => {});

      binCommand.addAlias('testscript', '/path/to/script');

      expect(writeToEndOfFileSpy).toHaveBeenCalledWith(DOTSX.BIN.ALIAS, 'alias testscript="/path/to/script"');

      isFileSpy.mockRestore();
      writeToEndOfFileSpy.mockRestore();
    });

    test('should create file and add alias if file does not exist', () => {
      const isFileSpy = spyOn(FileLib, 'isFile').mockReturnValue(false);
      const createFileSpy = spyOn(FileLib, 'createFile').mockImplementation(() => {});
      const writeToEndOfFileSpy = spyOn(FileLib, 'writeToEndOfFile').mockImplementation(() => {});

      binCommand.addAlias('testscript', '/path/to/script');

      expect(createFileSpy).toHaveBeenCalledWith(DOTSX.BIN.ALIAS);
      expect(writeToEndOfFileSpy).toHaveBeenCalledWith(DOTSX.BIN.ALIAS, 'alias testscript="/path/to/script"');

      isFileSpy.mockRestore();
      createFileSpy.mockRestore();
      writeToEndOfFileSpy.mockRestore();
    });

    test('should handle errors when adding alias', () => {
      const isFileSpy = spyOn(FileLib, 'isFile').mockReturnValue(true);
      const writeToEndOfFileSpy = spyOn(FileLib, 'writeToEndOfFile').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => binCommand.addAlias('testscript', '/path/to/script')).toThrow(
        `Failed to add alias to ${DOTSX.BIN.ALIAS}: Error: Permission denied`,
      );

      isFileSpy.mockRestore();
      writeToEndOfFileSpy.mockRestore();
    });
  });
});
