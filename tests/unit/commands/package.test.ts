import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as clackPrompts from '@clack/prompts';
import * as domains from '@/domains';
import { ConsoleLib } from '@/lib/console';
import { FileLib } from '@/lib/file';
import type { Domain, PackageManagerConfig } from '@/types';

// Mock child_process module
const mockExecSync = mock(() => '');
mock.module('node:child_process', () => ({
  execSync: mockExecSync,
}));

import { packageCommand } from '../../../src/commands/package';

describe('packageCommand', () => {
  let testDir: string;
  let consoleSpy: ReturnType<typeof spyOn>;

  beforeEach(async () => {
    testDir = await mkdtemp(path.join(tmpdir(), 'dotsx-package-test-'));
    consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    consoleSpy.mockRestore();
  });

  describe('execute', () => {
    test('should handle no OS domains with package managers', async () => {
      const getDomainsByTypeSpy = spyOn(domains, 'getDomainsByType').mockReturnValue([]);

      await packageCommand.execute();

      expect(consoleSpy).toHaveBeenCalledWith('ℹ️ No OS domains with package managers found');

      getDomainsByTypeSpy.mockRestore();
    });

    test('should handle domain selection and processing', async () => {
      const mockDomain = {
        name: 'debian',
        type: 'os',
        distro: 'debian',
        availableOs: ['linux'],
        packageManagers: {
          apt: {
            configPath: '/test/apt.txt',
            install: 'apt install',
            remove: 'apt remove',
            status: 'apt list --installed %s',
            defaultContent: 'vim\ngit',
          },
        },
      } as Domain;

      const getDomainsByTypeSpy = spyOn(domains, 'getDomainsByType').mockReturnValue([mockDomain]);
      const selectSpy = spyOn(clackPrompts, 'select').mockResolvedValue(mockDomain);
      const handleDomainSpy = spyOn(packageCommand, 'handleDomain').mockImplementation(async () => {});

      await packageCommand.execute();

      expect(consoleSpy).toHaveBeenCalledWith('Available OS: debian');
      expect(handleDomainSpy).toHaveBeenCalledWith(mockDomain);

      getDomainsByTypeSpy.mockRestore();
      selectSpy.mockRestore();
      handleDomainSpy.mockRestore();
    });

    test('should handle no domain selection', async () => {
      const mockDomain = {
        name: 'debian',
        type: 'os',
        distro: 'debian',
        availableOs: ['linux'],
        packageManagers: {},
      } as Domain;

      const getDomainsByTypeSpy = spyOn(domains, 'getDomainsByType').mockReturnValue([mockDomain]);
      const selectSpy = spyOn(clackPrompts, 'select').mockResolvedValue(null);
      const handleDomainSpy = spyOn(packageCommand, 'handleDomain');

      await packageCommand.execute();

      expect(handleDomainSpy).not.toHaveBeenCalled();

      getDomainsByTypeSpy.mockRestore();
      selectSpy.mockRestore();
      handleDomainSpy.mockRestore();
    });
  });

  describe('handleDomain', () => {
    test('should handle package manager selection', async () => {
      const mockDomain = {
        name: 'debian',
        type: 'os',
        distro: 'debian',
        availableOs: ['linux'],
        packageManagers: {
          apt: {
            configPath: '/test/apt.txt',
            install: 'apt install',
            remove: 'apt remove',
            status: 'apt list --installed %s',
            defaultContent: 'vim',
          },
          snap: {
            configPath: '/test/snap.txt',
            install: 'snap install',
            remove: 'snap remove',
            status: 'snap list %s',
            defaultContent: 'code',
          },
        },
      } as Domain;

      const selectSpy = spyOn(clackPrompts, 'select').mockResolvedValue('apt');
      const handlePackageManagerSpy = spyOn(packageCommand, 'handlePackageManager').mockImplementation(async () => {});

      await packageCommand.handleDomain(mockDomain);

      expect(handlePackageManagerSpy).toHaveBeenCalledWith(mockDomain.packageManagers?.apt);

      selectSpy.mockRestore();
      handlePackageManagerSpy.mockRestore();
    });

    test('should handle domain without package managers', async () => {
      const mockDomain = { name: 'test' } as Domain;

      const result = await packageCommand.handleDomain(mockDomain);

      expect(result).toBeUndefined();
    });

    test('should handle no package manager selection', async () => {
      const mockDomain = {
        name: 'debian',
        type: 'os',
        distro: 'debian',
        availableOs: ['linux'],
        packageManagers: {
          apt: {
            configPath: '/test/apt.txt',
            install: 'apt install',
            remove: 'apt remove',
            status: 'apt list --installed %s',
            defaultContent: 'vim',
          },
        },
      } as Domain;

      const selectSpy = spyOn(clackPrompts, 'select').mockResolvedValue(null);
      const handlePackageManagerSpy = spyOn(packageCommand, 'handlePackageManager');

      await packageCommand.handleDomain(mockDomain);

      expect(handlePackageManagerSpy).not.toHaveBeenCalled();

      selectSpy.mockRestore();
      handlePackageManagerSpy.mockRestore();
    });
  });

  describe('handlePackageManager', () => {
    const mockConfig: PackageManagerConfig = {
      configPath: '/test/packages.txt',
      install: 'apt install',
      remove: 'apt remove',
      status: 'apt list --installed %s',
      defaultContent: 'vim\ngit',
    };

    test('should handle install action', async () => {
      const readFileAsArraySpy = spyOn(FileLib, 'readFileAsArray').mockReturnValue(['vim', 'git']);
      const handleStatusSpy = spyOn(packageCommand, 'handleStatus').mockReturnValue({
        installed: ['vim'],
        notInstalled: ['git'],
      });
      const selectSpy = spyOn(clackPrompts, 'select').mockResolvedValue('install');
      const handleInstallSpy = spyOn(packageCommand, 'handleInstall').mockImplementation(async () => {});

      await packageCommand.handlePackageManager(mockConfig);

      expect(handleInstallSpy).toHaveBeenCalledWith(['git'], mockConfig);

      readFileAsArraySpy.mockRestore();
      handleStatusSpy.mockRestore();
      selectSpy.mockRestore();
      handleInstallSpy.mockRestore();
    });

    test('should handle remove action', async () => {
      const readFileAsArraySpy = spyOn(FileLib, 'readFileAsArray').mockReturnValue(['vim', 'git']);
      const handleStatusSpy = spyOn(packageCommand, 'handleStatus').mockReturnValue({
        installed: ['vim', 'git'],
        notInstalled: [],
      });
      const selectSpy = spyOn(clackPrompts, 'select').mockResolvedValue('remove');
      const handleRemoveSpy = spyOn(packageCommand, 'handleRemove').mockImplementation(async () => {});

      await packageCommand.handlePackageManager(mockConfig);

      expect(handleRemoveSpy).toHaveBeenCalledWith(['vim', 'git'], mockConfig);

      readFileAsArraySpy.mockRestore();
      handleStatusSpy.mockRestore();
      selectSpy.mockRestore();
      handleRemoveSpy.mockRestore();
    });

    test('should handle empty package list', async () => {
      const readFileAsArraySpy = spyOn(FileLib, 'readFileAsArray').mockReturnValue([]);
      const handleStatusSpy = spyOn(packageCommand, 'handleStatus').mockReturnValue({
        installed: [],
        notInstalled: [],
      });
      const getDisplayPathSpy = spyOn(FileLib, 'getDisplayPath').mockReturnValue('/test/packages.txt');

      await packageCommand.handlePackageManager(mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith('ℹ️ No packages found in /test/packages.txt');

      readFileAsArraySpy.mockRestore();
      handleStatusSpy.mockRestore();
      getDisplayPathSpy.mockRestore();
    });
  });

  describe('handleInstall', () => {
    const mockConfig: PackageManagerConfig = {
      configPath: '/test/packages.txt',
      install: 'apt install',
      remove: 'apt remove',
      status: 'apt list --installed %s',
      defaultContent: 'vim',
    };

    test('should install packages when confirmed', async () => {
      mockExecSync.mockReturnValue('');
      const confirmSpy = spyOn(clackPrompts, 'confirm').mockResolvedValue(true);

      await packageCommand.handleInstall(['vim', 'git'], mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith('\n🔄 Installing packages...');
      expect(consoleSpy).toHaveBeenCalledWith('📦 Installing vim...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ vim');

      mockExecSync.mockRestore();
      confirmSpy.mockRestore();
    });

    test('should handle installation errors', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Package not found');
      });
      const confirmSpy = spyOn(clackPrompts, 'confirm').mockResolvedValue(true);

      await packageCommand.handleInstall(['nonexistent'], mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith('❌ nonexistent: Error: Package not found');

      mockExecSync.mockRestore();
      confirmSpy.mockRestore();
    });

    test('should handle all packages already installed', async () => {
      await packageCommand.handleInstall([], mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith('✅ All packages are already installed');
    });

    test('should handle cancelled installation', async () => {
      const confirmSpy = spyOn(clackPrompts, 'confirm').mockResolvedValue(false);

      await packageCommand.handleInstall(['vim'], mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith('❌ Installation cancelled');

      confirmSpy.mockRestore();
    });
  });

  describe('handleRemove', () => {
    const mockConfig: PackageManagerConfig = {
      configPath: '/test/packages.txt',
      install: 'apt install',
      remove: 'apt remove',
      status: 'apt list --installed %s',
      defaultContent: 'vim',
    };

    test('should remove selected packages when confirmed', async () => {
      const multiselectSpy = spyOn(clackPrompts, 'multiselect').mockResolvedValue(['vim']);
      const confirmSpy = spyOn(clackPrompts, 'confirm').mockResolvedValue(true);
      mockExecSync.mockReturnValue('');

      await packageCommand.handleRemove(['vim', 'git'], mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith('\n🔄 Removing packages...');
      expect(consoleSpy).toHaveBeenCalledWith('📦 Removing vim...');
      expect(consoleSpy).toHaveBeenCalledWith('✅ vim');

      multiselectSpy.mockRestore();
      confirmSpy.mockRestore();
      mockExecSync.mockRestore();
    });

    test('should handle no packages to remove', async () => {
      await packageCommand.handleRemove([], mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith('ℹ️ No packages installed to remove');
    });

    test('should handle no packages selected', async () => {
      const multiselectSpy = spyOn(clackPrompts, 'multiselect').mockResolvedValue([]);

      await packageCommand.handleRemove(['vim'], mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith('❌ No packages selected');

      multiselectSpy.mockRestore();
    });

    test('should handle cancelled removal', async () => {
      const multiselectSpy = spyOn(clackPrompts, 'multiselect').mockResolvedValue(['vim']);
      const confirmSpy = spyOn(clackPrompts, 'confirm').mockResolvedValue(false);

      await packageCommand.handleRemove(['vim'], mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith('❌ Removal cancelled');

      multiselectSpy.mockRestore();
      confirmSpy.mockRestore();
    });

    test('should handle removal errors', async () => {
      const multiselectSpy = spyOn(clackPrompts, 'multiselect').mockResolvedValue(['vim']);
      const confirmSpy = spyOn(clackPrompts, 'confirm').mockResolvedValue(true);
      mockExecSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await packageCommand.handleRemove(['vim'], mockConfig);

      expect(consoleSpy).toHaveBeenCalledWith('❌ vim: Error: Permission denied');

      multiselectSpy.mockRestore();
      confirmSpy.mockRestore();
      mockExecSync.mockRestore();
    });
  });

  describe('handleStatus', () => {
    const mockConfig: PackageManagerConfig = {
      configPath: '/test/packages.txt',
      install: 'apt install',
      remove: 'apt remove',
      status: 'apt list --installed %s',
      defaultContent: 'vim',
    };

    test('should categorize installed and not installed packages', () => {
      const isPackageInstalledSpy = spyOn(packageCommand, 'isPackageInstalled')
        .mockReturnValueOnce(true) // vim is installed (1st call)
        .mockReturnValueOnce(false) // git is not installed (2nd call)
        .mockReturnValueOnce(true) // curl is installed (3rd call)
        .mockReturnValueOnce(false) // docker is not installed (4th call)
        .mockReturnValueOnce(true) // vim is installed (5th call - 2nd filter)
        .mockReturnValueOnce(false) // git is not installed (6th call - 2nd filter)
        .mockReturnValueOnce(true) // curl is installed (7th call - 2nd filter)
        .mockReturnValueOnce(false); // docker is not installed (8th call - 2nd filter)

      const logListWithTitleSpy = spyOn(ConsoleLib, 'logListWithTitle').mockImplementation(() => {});

      const result = packageCommand.handleStatus(['vim', 'git', 'curl', 'docker'], mockConfig);

      expect(isPackageInstalledSpy).toHaveBeenCalledTimes(8); // 4 packages * 2 calls each (installed + notInstalled filters)
      expect(result.installed).toEqual(['vim', 'curl']);
      expect(result.notInstalled).toEqual(['git', 'docker']);
      expect(logListWithTitleSpy).toHaveBeenCalledWith('✅ Installed', ['vim', 'curl']);
      expect(logListWithTitleSpy).toHaveBeenCalledWith('📋 Not installed', ['git', 'docker']);

      isPackageInstalledSpy.mockRestore();
      logListWithTitleSpy.mockRestore();
    });
  });

  describe('isPackageInstalled', () => {
    const mockConfig: PackageManagerConfig = {
      configPath: '/test/packages.txt',
      install: 'apt install',
      remove: 'apt remove',
      status: 'apt list --installed %s',
      defaultContent: 'vim',
    };

    test('should return true for installed package', () => {
      mockExecSync.mockReturnValue('vim/stable,now 8.2.2434-3+deb11u1 amd64 [installed]');

      const result = packageCommand.isPackageInstalled('vim', mockConfig);

      expect(result).toBe(true);

      mockExecSync.mockRestore();
    });

    test('should return false for not installed package', () => {
      mockExecSync.mockReturnValue('');

      const result = packageCommand.isPackageInstalled('nonexistent', mockConfig);

      expect(result).toBe(false);

      mockExecSync.mockRestore();
    });

    test('should handle command errors', () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      const result = packageCommand.isPackageInstalled('vim', mockConfig);

      expect(result).toBe(false);

      mockExecSync.mockRestore();
    });

    test('should replace %s placeholder in status command', () => {
      mockExecSync.mockReturnValue('output');

      packageCommand.isPackageInstalled('testpkg', mockConfig);

      expect(mockExecSync).toHaveBeenCalledWith('apt list --installed testpkg', { stdio: 'pipe' });

      mockExecSync.mockRestore();
    });
  });
});
