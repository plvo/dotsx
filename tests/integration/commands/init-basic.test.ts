import { describe, expect, mock, spyOn, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Domain } from '@/types';
import { getTestDOTSX } from '../setup/test-constants';
import { withIntegrationEnvironment } from '../setup/test-environment';

// No global mocks - we'll mock per test to avoid interference

describe('Init Command Basic Integration Tests', () => {
  test('should create basic dotsx directory structure', async () => {
    await withIntegrationEnvironment(async () => {
      // IMPORTANT: Clear module cache first to ensure fresh imports use test environment
      delete require.cache[require.resolve('../../../src/commands/init')];
      delete require.cache[require.resolve('../../../src/lib/system')];
      delete require.cache[require.resolve('../../../src/lib/constants')];

      // Import command after environment setup and cache clearing
      const { initCommand } = await import('../../../src/commands/init');
      const { SystemLib } = await import('../../../src/lib/system');

      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
      const isInitializedSpy = spyOn(SystemLib, 'isInitialized').mockReturnValue(false);
      const getCurrentOsTypeSpy = spyOn(SystemLib, 'getCurrentOsType').mockReturnValue('debian');

      // Mock clack prompts for this test
      const mockSelect = mock(() => Promise.resolve('debian'));
      const mockMultiselect = mock(() => Promise.resolve([]));
      const selectSpy = spyOn(await import('@clack/prompts'), 'select').mockImplementation(mockSelect as any);
      const multiselectSpy = spyOn(await import('@clack/prompts'), 'multiselect').mockImplementation(mockMultiselect);

      // Mock dangerous operations
      const mockExecSync = mock(() => '');
      const execSyncSpy = spyOn(await import('node:child_process'), 'execSync').mockImplementation(mockExecSync as any);

      const DOTSX = getTestDOTSX();

      // Execute the init command
      await initCommand.execute();

      // Verify basic directory structure was created
      expect(existsSync(DOTSX.BIN.PATH)).toBe(true);
      expect(existsSync(join(DOTSX.OS.PATH, 'debian'))).toBe(true);

      // Verify bin directory initialization
      expect(existsSync(DOTSX.BIN.ALIAS)).toBe(true);

      // Verify package manager files were created
      expect(existsSync(DOTSX.OS.DEBIAN.APT)).toBe(true);
      expect(existsSync(DOTSX.OS.DEBIAN.SNAP)).toBe(true);

      // Verify package files have default content
      const aptContent = readFileSync(DOTSX.OS.DEBIAN.APT, 'utf-8');
      expect(aptContent).toContain('# APT packages');


      // Verify console output shows initialization
      expect(consoleSpy).toHaveBeenCalledWith('❌ DotX not initialized');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Bin directory created'));

      // Ensure no errors occurred
      expect(errorSpy).not.toHaveBeenCalled();

      // Cleanup
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
      isInitializedSpy.mockRestore();
      getCurrentOsTypeSpy.mockRestore();
      selectSpy.mockRestore();
      multiselectSpy.mockRestore();
      execSyncSpy.mockRestore();
    });
  });

  test('should handle already initialized state', async () => {
    await withIntegrationEnvironment(async () => {
      const { initCommand } = await import('../../../src/commands/init');
      const { SystemLib } = await import('../../../src/lib/system');
      const { FileLib } = await import('../../../src/lib/file');

      // Get the test constants
      const DOTSX = getTestDOTSX();

      // Pre-create the directory structure
      FileLib.createDirectory(DOTSX.BIN.PATH);

      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});
      const isInitializedSpy = spyOn(SystemLib, 'isInitialized').mockReturnValue(true);

      // Mock clack prompts for this test
      const mockSelect = mock(() => Promise.resolve('debian'));
      const mockMultiselect = mock(() => Promise.resolve([]));
      const selectSpy = spyOn(await import('@clack/prompts'), 'select').mockImplementation(mockSelect as any);
      const multiselectSpy = spyOn(await import('@clack/prompts'), 'multiselect').mockImplementation(mockMultiselect);

      await initCommand.execute();

      // Should show already initialized message
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ DotX initialized'));

      consoleSpy.mockRestore();
      isInitializedSpy.mockRestore();
      selectSpy.mockRestore();
      multiselectSpy.mockRestore();
    });
  });

  test('should create OS-specific package files', async () => {
    await withIntegrationEnvironment(async () => {
      const { initCommand } = await import('../../../src/commands/init');

      // Create a test domain with proper structure that matches how real domains work
      const DOTSX = getTestDOTSX();

      const testDomain: Domain = {
        name: 'debian',
        type: 'os' as const,
        availableOs: ['debian'] as const,
        packageManagers: {
          apt: {
            configPath: DOTSX.OS.DEBIAN.APT,
            install: 'sudo apt install -y %s',
            remove: 'sudo apt remove -y %s',
            status: 'dpkg -l | grep "^ii" | grep -w " %s "',
            defaultContent: '# APT packages\n# Generated by dotsx\n# Add package names, one per line\n# Lines starting with # are ignored\n'
          },
          snap: {
            configPath: DOTSX.OS.DEBIAN.SNAP,
            install: 'sudo snap install %s',
            remove: 'sudo snap remove %s',
            status: 'snap list | grep -w "%s "',
            defaultContent: '# Snap packages\n# Generated by dotsx\n# Add package names, one per line\n# Lines starting with # are ignored\n'
          }
        }
      };

      const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

      await initCommand.initOs(testDomain);

      // Verify package files were created
      expect(existsSync(DOTSX.OS.DEBIAN.APT)).toBe(true);
      expect(existsSync(DOTSX.OS.DEBIAN.SNAP)).toBe(true);

      // Verify file contents
      const aptContent = readFileSync(DOTSX.OS.DEBIAN.APT, 'utf-8');
      const snapContent = readFileSync(DOTSX.OS.DEBIAN.SNAP, 'utf-8');

      expect(aptContent).toContain('# APT packages');
      expect(snapContent).toContain('# Snap packages');

      consoleSpy.mockRestore();
    });
  });

  test('should handle error scenarios gracefully', async () => {
    await withIntegrationEnvironment(async () => {
      const { initCommand } = await import('../../../src/commands/init');
      const { SystemLib } = await import('../../../src/lib/system');

      const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
      const isInitializedSpy = spyOn(SystemLib, 'isInitialized').mockImplementation(() => {
        throw new Error('Test error');
      });

      await initCommand.execute();

      // Should handle the error and log it
      expect(errorSpy).toHaveBeenCalledWith('❌ Error during initialization: Error: Test error');

      // Cleanup
      errorSpy.mockRestore();
      isInitializedSpy.mockRestore();
    });
  });
});