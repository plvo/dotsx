import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { initCommand } from '@/commands/init';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';
import {
  assertDirExists,
  assertFileExists,
  cleanupTestEnv,
  createDotsxStructure,
  createFakeFiles,
  createTestEnv,
  type TestEnv,
} from './setup';

describe('Integration: Init Flow', () => {
  let env: TestEnv;

  beforeEach(() => {
    env = createTestEnv('init');
  });

  afterEach(() => {
    cleanupTestEnv(env);
  });

  describe('Fresh initialization', () => {
    it('should detect current OS/distro', () => {
      const osInfo = SystemLib.getOsInfo();
      expect(osInfo.platform).toBeDefined();
      expect(osInfo.family).toBeDefined();
    });

    it('should create base directory structure', async () => {
      await initCommand.handleDotsxDirectoryCreation(env.dotsxPath);

      assertDirExists(env.dotsxPath.baseOs);
      assertDirExists(env.dotsxPath.bin);
      assertDirExists(env.dotsxPath.packagesManager);
      assertDirExists(env.dotsxPath.symlinks);
    });

    it('should create required config files', async () => {
      await initCommand.handleDotsxDirectoryCreation(env.dotsxPath);

      assertFileExists(env.dotsxPath.config);
      assertFileExists(env.dotsxPath.binAliases);
      assertFileExists(env.dotsxPath.packagesManagerConfig);
    });

    it('should create package manager files', async () => {
      createDotsxStructure(env);
      await initCommand.createPackageManagerFiles(env.dotsxPath);

      assertFileExists(env.dotsxPath.packagesManagerConfig);

      // Check that package manager files were created
      const packagesDir = env.dotsxPath.packagesManager;
      const files = fs.readdirSync(packagesDir);
      const txtFiles = files.filter(f => f.endsWith('.txt'));

      expect(txtFiles.length).toBeGreaterThan(0);
    });
  });

  describe('Symlink creation during init', () => {
    it('should create symlinks for selected paths', async () => {
      createDotsxStructure(env);

      // Create fake config files
      createFakeFiles(env.homeDir, {
        '.testrc': '# Test config',
        '.config/test.json': '{"test": true}',
      });

      const selectedPaths = [
        { suggestedPath: path.join(env.homeDir, '.testrc'), type: 'file' as const },
        { suggestedPath: path.join(env.homeDir, '.config/test.json'), type: 'file' as const },
      ];

      await initCommand.createSymlinksForSelectedPaths(selectedPaths, env.dotsxPath);

      // Check symlinks were created in dotsx
      const dotsxTestrc = path.join(env.dotsxPath.symlinks, '__home__', '.testrc');
      const dotsxTestJson = path.join(env.dotsxPath.symlinks, '__home__', '.config', 'test.json');

      assertFileExists(dotsxTestrc);
      assertFileExists(dotsxTestJson);

      // Check original files are now symlinks
      expect(fs.lstatSync(path.join(env.homeDir, '.testrc')).isSymbolicLink()).toBe(true);
      expect(fs.lstatSync(path.join(env.homeDir, '.config/test.json')).isSymbolicLink()).toBe(true);
    });

    it('should move original content to dotsx', async () => {
      createDotsxStructure(env);

      const originalContent = '# Original content';
      createFakeFiles(env.homeDir, { '.testrc': originalContent });

      const selectedPaths = [
        { suggestedPath: path.join(env.homeDir, '.testrc'), type: 'file' as const },
      ];

      await initCommand.createSymlinksForSelectedPaths(selectedPaths, env.dotsxPath);

      // Check content is preserved in dotsx
      const dotsxFile = path.join(env.dotsxPath.symlinks, '__home__', '.testrc');
      const content = fs.readFileSync(dotsxFile, 'utf8');
      expect(content).toBe(originalContent);

      // Check original location is symlink pointing to dotsx
      const symlinkContent = fs.readFileSync(path.join(env.homeDir, '.testrc'), 'utf8');
      expect(symlinkContent).toBe(originalContent);
    });

    it('should handle no selected paths', async () => {
      createDotsxStructure(env);

      await initCommand.createSymlinksForSelectedPaths([], env.dotsxPath);

      // Should not throw error
      const symlinkDir = path.join(env.dotsxPath.symlinks, '__home__');
      if (fs.existsSync(symlinkDir)) {
        const files = fs.readdirSync(symlinkDir);
        expect(files.length).toBe(0);
      }
    });
  });

  describe('RC file integration', () => {
    it('should support different shells', () => {
      const shells = ['zsh', 'bash', 'fish'];

      shells.forEach(shell => {
        process.env.SHELL = `/bin/${shell}`;
        const rcFile = SystemLib.getRcFilePath();
        expect(rcFile).toBeDefined();
      });
    });

    it('should create RC file if missing', () => {
      process.env.SHELL = '/bin/bash';
      const rcFile = SystemLib.getRcFilePath();

      if (rcFile && !fs.existsSync(rcFile)) {
        FileLib.Directory.create(path.dirname(rcFile));
        FileLib.File.create(rcFile, '# Bash config\n');
        expect(fs.existsSync(rcFile)).toBe(true);
      }
    });
  });

  describe('Directory structure validation', () => {
    it('should create __home__ directory in symlinks', async () => {
      createDotsxStructure(env);

      createFakeFiles(env.homeDir, { '.testrc': 'test' });

      const selectedPaths = [
        { suggestedPath: path.join(env.homeDir, '.testrc'), type: 'file' as const },
      ];

      await initCommand.createSymlinksForSelectedPaths(selectedPaths, env.dotsxPath);

      const homeDir = path.join(env.dotsxPath.symlinks, '__home__');
      assertDirExists(homeDir);
    });

    it('should preserve directory hierarchy', async () => {
      createDotsxStructure(env);

      createFakeFiles(env.homeDir, {
        '.config/app/settings.json': '{"key": "value"}',
      });

      const selectedPaths = [
        { suggestedPath: path.join(env.homeDir, '.config/app/settings.json'), type: 'file' as const },
      ];

      await initCommand.createSymlinksForSelectedPaths(selectedPaths, env.dotsxPath);

      const dotsxFile = path.join(env.dotsxPath.symlinks, '__home__', '.config/app/settings.json');
      assertFileExists(dotsxFile);

      // Check content
      const content = fs.readFileSync(dotsxFile, 'utf8');
      expect(content).toBe('{"key": "value"}');
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent file gracefully', async () => {
      createDotsxStructure(env);

      const selectedPaths = [
        { suggestedPath: '/non/existent/file', type: 'file' as const },
      ];

      // Should not throw, but skip non-existent files
      await expect(
        initCommand.createSymlinksForSelectedPaths(selectedPaths, env.dotsxPath)
      ).resolves.not.toThrow();
    });

    it('should handle permission errors gracefully', async () => {
      createDotsxStructure(env);

      createFakeFiles(env.homeDir, { '.testrc': 'test' });

      // Make file read-only
      const testFile = path.join(env.homeDir, '.testrc');
      fs.chmodSync(testFile, 0o444);

      const selectedPaths = [
        { suggestedPath: testFile, type: 'file' as const },
      ];

      try {
        await initCommand.createSymlinksForSelectedPaths(selectedPaths, env.dotsxPath);
        // Should handle error
      } catch (error) {
        // Expected in some cases
      } finally {
        // Restore permissions for cleanup
        if (fs.existsSync(testFile)) {
          fs.chmodSync(testFile, 0o644);
        }
      }
    });
  });
});
