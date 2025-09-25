import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as clackPrompts from '@clack/prompts';
import * as domains from '@/domains';
import { DOTSX } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';
import type { Domain } from '@/types';
import { initCommand } from '../../../src/commands/init';

describe('initCommand', () => {
  let testDir: string;
  let consoleSpy: ReturnType<typeof spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(path.join(tmpdir(), 'dotsx-init-test-'));
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
  });

  describe('execute', () => {
    test('should initialize dotfiles when not already initialized', async () => {
      const isInitializedSpy = spyOn(SystemLib, 'isInitialized').mockReturnValue(false);
      const selectSpy = spyOn(clackPrompts, 'select').mockResolvedValue('debian');
      const multiselectSpy = spyOn(clackPrompts, 'multiselect')
        .mockResolvedValueOnce(['zsh'])
        .mockResolvedValueOnce(['vscode']);
      const getDomainsByTypeSpy = spyOn(domains, 'getDomainsByType').mockReturnValue([
        { name: 'zsh', type: 'terminal' } as Domain
      ]);
      const getDomainByNameSpy = spyOn(domains, 'getDomainByName').mockReturnValue({
        name: 'debian',
        type: 'os',
        availableOs: ['debian'],
        packageManagers: {
          apt: {
            configPath: '/test/apt.txt',
            install: 'apt install',
            remove: 'apt remove',
            status: 'apt list',
            defaultContent: 'test content'
          }
        }
      } as Domain);
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(false);
      const createDirectorySpy = spyOn(FileLib, 'createDirectory').mockImplementation(() => {});
      const createFileSpy = spyOn(FileLib, 'createFile').mockImplementation(() => {});
      const getCurrentOsTypeSpy = spyOn(SystemLib, 'getCurrentOsType').mockReturnValue('debian');

      await initCommand.execute();

      expect(consoleSpy).toHaveBeenCalledWith('❌ DotX not initialized');
      expect(createDirectorySpy).toHaveBeenCalledWith(DOTSX.BIN.PATH);
      expect(createFileSpy).toHaveBeenCalledWith(DOTSX.BIN.ALIAS);

      isInitializedSpy.mockRestore();
      selectSpy.mockRestore();
      multiselectSpy.mockRestore();
      getDomainsByTypeSpy.mockRestore();
      getDomainByNameSpy.mockRestore();
      isDirectorySpy.mockRestore();
      createDirectorySpy.mockRestore();
      createFileSpy.mockRestore();
      getCurrentOsTypeSpy.mockRestore();
    });

    test('should show already initialized message when already set up', async () => {
      const isInitializedSpy = spyOn(SystemLib, 'isInitialized').mockReturnValue(true);
      const selectSpy = spyOn(clackPrompts, 'select').mockResolvedValue('debian');
      const multiselectSpy = spyOn(clackPrompts, 'multiselect')
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      const getDomainsByTypeSpy = spyOn(domains, 'getDomainsByType').mockReturnValue([]);
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(true);

      await initCommand.execute();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ DotX initialized on'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Bin directory already exists'));

      isInitializedSpy.mockRestore();
      selectSpy.mockRestore();
      multiselectSpy.mockRestore();
      getDomainsByTypeSpy.mockRestore();
      isDirectorySpy.mockRestore();
    });

    test('should handle errors during initialization', async () => {
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
      const isInitializedSpy = spyOn(SystemLib, 'isInitialized').mockImplementation(() => {
        throw new Error('Test error');
      });

      await initCommand.execute();

      expect(errorSpy).toHaveBeenCalledWith('❌ Error during initialization: Error: Test error');

      errorSpy.mockRestore();
      isInitializedSpy.mockRestore();
    });
  });

  describe('getDotfilesPath', () => {
    test('should return correct dotfiles path', () => {
      const domain = { name: 'vscode' } as Domain;
      const symlinkPath = '/home/user/.config/Code/User/settings.json';

      const result = initCommand.getDotfilesPath(domain, symlinkPath);

      expect(result).toBe(path.resolve(DOTSX.IDE.PATH, 'vscode', 'settings.json'));
    });

    test('should handle paths without filename', () => {
      const domain = { name: 'vscode' } as Domain;
      const symlinkPath = '/home/user/.config/Code/';

      const result = initCommand.getDotfilesPath(domain, symlinkPath);

      expect(result).toBe(path.resolve(DOTSX.IDE.PATH, 'vscode', ''));
    });
  });

  describe('initOs', () => {
    test('should initialize OS package management', async () => {
      const domain = {
        name: 'debian',
        type: 'os',
        availableOs: ['debian'],
        packageManagers: {
          apt: {
            configPath: path.join(testDir, 'apt.txt'),
            install: 'apt install',
            remove: 'apt remove',
            status: 'apt list',
            defaultContent: 'test apt content'
          },
          snap: {
            configPath: path.join(testDir, 'snap.txt'),
            install: 'snap install',
            remove: 'snap remove',
            status: 'snap list',
            defaultContent: 'test snap content'
          }
        }
      } as Domain;

      const createDirectorySpy = spyOn(FileLib, 'createDirectory').mockImplementation(() => {});
      const isPathExistsSpy = spyOn(FileLib, 'isPathExists').mockReturnValue(false);
      const createFileSpy = spyOn(FileLib, 'createFile').mockImplementation(() => {});
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockImplementation((p) => p);

      await initCommand.initOs(domain);

      expect(createDirectorySpy).toHaveBeenCalled();
      expect(createFileSpy).toHaveBeenCalledWith(domain.packageManagers?.apt?.configPath, 'test apt content');
      expect(createFileSpy).toHaveBeenCalledWith(domain.packageManagers?.snap?.configPath, 'test snap content');
      expect(consoleSpy).toHaveBeenCalledWith(`✅ Created: ${domain.packageManagers?.apt?.configPath}`);

      createDirectorySpy.mockRestore();
      isPathExistsSpy.mockRestore();
      createFileSpy.mockRestore();
      getDisplayPathSpy.mockRestore();
    });

    test('should handle domain without package managers', async () => {
      const domain = { name: 'test' } as Domain;

      await initCommand.initOs(domain);

      expect(consoleSpy).toHaveBeenCalledWith('❌ No package managers defined for test');
    });

    test('should skip existing package files', async () => {
      const domain = {
        name: 'debian',
        type: 'os',
        availableOs: ['debian'],
        packageManagers: {
          apt: {
            configPath: path.join(testDir, 'existing.txt'),
            install: 'apt install',
            remove: 'apt remove',
            status: 'apt list',
            defaultContent: 'content'
          }
        }
      } as Domain;

      const createDirectorySpy = spyOn(FileLib, 'createDirectory').mockImplementation(() => {});
      const isPathExistsSpy = spyOn(FileLib, 'isPathExists').mockReturnValue(true);
      const createFileSpy = spyOn(FileLib, 'createFile').mockImplementation(() => {});
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockImplementation((p) => p);

      await initCommand.initOs(domain);

      expect(createFileSpy).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(`✅ Already exists: ${domain.packageManagers?.apt?.configPath}`);

      createDirectorySpy.mockRestore();
      isPathExistsSpy.mockRestore();
      createFileSpy.mockRestore();
      getDisplayPathSpy.mockRestore();
    });
  });

  describe('initTerminal', () => {
    test('should initialize terminal domain', async () => {
      const domain = {
        name: 'zsh',
        symlinkPaths: {
          debian: ['/home/user/.zshrc']
        }
      } as Domain;

      const expandPathSpy = spyOn(FileLib, 'expandPath').mockReturnValue('/home/user/.zshrc');
      const createDirectorySpy = spyOn(FileLib, 'createDirectory').mockImplementation(() => {});
      const isPathExistsSpy = spyOn(FileLib, 'isPathExists').mockReturnValue(true);
      const safeSymlinkSpy = spyOn(FileLib, 'safeSymlink').mockImplementation(() => {});

      await initCommand.initTerminal(domain, 'debian');

      expect(safeSymlinkSpy).toHaveBeenCalledWith('/home/user/.zshrc', path.resolve(DOTSX.TERMINAL.PATH, '.zshrc'), true);

      expandPathSpy.mockRestore();
      createDirectorySpy.mockRestore();
      isPathExistsSpy.mockRestore();
      safeSymlinkSpy.mockRestore();
    });

    test('should handle missing system files', async () => {
      const domain = {
        name: 'zsh',
        symlinkPaths: {
          debian: ['/home/user/.zshrc']
        }
      } as Domain;

      const expandPathSpy = spyOn(FileLib, 'expandPath').mockReturnValue('/home/user/.zshrc');
      const createDirectorySpy = spyOn(FileLib, 'createDirectory').mockImplementation(() => {});
      const isPathExistsSpy = spyOn(FileLib, 'isPathExists').mockReturnValue(false);
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockImplementation((p) => p);

      await initCommand.initTerminal(domain, 'debian');

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ File not found: /home/user/.zshrc (ignoring)');

      expandPathSpy.mockRestore();
      createDirectorySpy.mockRestore();
      isPathExistsSpy.mockRestore();
      getDisplayPathSpy.mockRestore();
    });

    test('should handle domain without symlink paths for current OS', async () => {
      const domain = {
        name: 'zsh',
        symlinkPaths: {}
      } as Domain;

      await initCommand.initTerminal(domain, 'debian');

      expect(consoleSpy).toHaveBeenCalledWith('❌ No symlink paths for zsh on debian');
    });
  });

  describe('importIdeConfigs', () => {
    test('should import IDE configurations', async () => {
      const domain = {
        name: 'vscode',
        symlinkPaths: {
          debian: ['/home/user/.config/Code/User/settings.json']
        }
      } as Domain;

      const expandPathSpy = spyOn(FileLib, 'expandPath').mockReturnValue('/home/user/.config/Code/User/settings.json');
      const isPathExistsSpy = spyOn(FileLib, 'isPathExists').mockReturnValue(true);
      const createDirectorySpy = spyOn(FileLib, 'createDirectory').mockImplementation(() => {});
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(false);
      const copyFileSpy = spyOn(FileLib, 'copyFile').mockImplementation(() => {});
      const safeSymlinkSpy = spyOn(FileLib, 'safeSymlink').mockImplementation(() => {});
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockImplementation((p) => p);

      await initCommand.importIdeConfigs(domain, 'debian');

      expect(safeSymlinkSpy).toHaveBeenCalledWith('/home/user/.config/Code/User/settings.json', path.resolve(DOTSX.IDE.PATH, 'vscode', 'settings.json'), true);
      expect(consoleSpy).toHaveBeenCalledWith('✅ Imported: /home/user/.config/Code/User/settings.json');

      expandPathSpy.mockRestore();
      isPathExistsSpy.mockRestore();
      createDirectorySpy.mockRestore();
      isDirectorySpy.mockRestore();
      copyFileSpy.mockRestore();
      safeSymlinkSpy.mockRestore();
      getDisplayPathSpy.mockRestore();
    });

    test('should handle directory imports', async () => {
      const domain = {
        name: 'vscode',
        symlinkPaths: {
          debian: ['/home/user/.config/Code/User/']
        }
      } as Domain;

      const expandPathSpy = spyOn(FileLib, 'expandPath').mockReturnValue('/home/user/.config/Code/User/');
      const isPathExistsSpy = spyOn(FileLib, 'isPathExists').mockReturnValue(true);
      const createDirectorySpy = spyOn(FileLib, 'createDirectory').mockImplementation(() => {});
      const isDirectorySpy = spyOn(FileLib, 'isDirectory').mockReturnValue(true);
      const copyDirectorySpy = spyOn(FileLib, 'copyDirectory').mockImplementation(() => {});
      const safeSymlinkSpy = spyOn(FileLib, 'safeSymlink').mockImplementation(() => {});
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockImplementation((p) => p);

      await initCommand.importIdeConfigs(domain, 'debian');

      expect(safeSymlinkSpy).toHaveBeenCalledWith('/home/user/.config/Code/User/', path.resolve(DOTSX.IDE.PATH, 'vscode'), true);

      expandPathSpy.mockRestore();
      isPathExistsSpy.mockRestore();
      createDirectorySpy.mockRestore();
      isDirectorySpy.mockRestore();
      copyDirectorySpy.mockRestore();
      safeSymlinkSpy.mockRestore();
      getDisplayPathSpy.mockRestore();
    });

    test('should handle missing IDE configurations', async () => {
      const domain = {
        name: 'vscode',
        symlinkPaths: {
          debian: ['/home/user/.config/Code/User/settings.json']
        }
      } as Domain;

      const expandPathSpy = spyOn(FileLib, 'expandPath').mockReturnValue('/home/user/.config/Code/User/settings.json');
      const isPathExistsSpy = spyOn(FileLib, 'isPathExists').mockReturnValue(false);
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockImplementation((p) => p);

      await initCommand.importIdeConfigs(domain, 'debian');

      expect(consoleSpy).toHaveBeenCalledWith('⚠️ File not found: /home/user/.config/Code/User/settings.json (ignoring)');

      expandPathSpy.mockRestore();
      isPathExistsSpy.mockRestore();
      getDisplayPathSpy.mockRestore();
    });

    test('should handle domain without symlink paths', async () => {
      const domain = {
        name: 'vscode',
        symlinkPaths: {}
      } as Domain;

      await initCommand.importIdeConfigs(domain, 'debian');

      expect(consoleSpy).toHaveBeenCalledWith('❌ No symlink paths defined for vscode on debian');
    });
  });
});