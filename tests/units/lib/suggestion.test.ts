import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type FoundPath, SuggestionLib } from '@/lib/suggestion';
import type { OsInfo } from '@/lib/system';
import type { Suggestion } from '@/suggestions';

describe('SuggestionLib', () => {
  const testDir = path.join(os.tmpdir(), 'dotsx-test-suggestion');

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

  describe('getAllExistingPaths', () => {
    it('should return existing paths for current OS', () => {
      const osInfo: OsInfo = { platform: 'linux', family: 'linux', distro: 'debian' };
      const result = SuggestionLib.getAllExistingPaths(osInfo);
      expect(typeof result).toBe('object');
    });
  });

  describe('getExistingSuggestedPaths', () => {
    it('should find existing files', () => {
      const testFile = path.join(testDir, '.testrc');
      fs.writeFileSync(testFile, 'test');

      const mockSuggestions: Suggestion[] = [
        {
          name: 'test',
          type: 'terminal',
          hint: 'Test',
          pathsToCheck: {
            linux: [testFile],
          },
        },
      ];

      const osInfo: OsInfo = { platform: 'linux', family: 'linux', distro: 'debian' };
      const result = SuggestionLib.getExistingSuggestedPaths(mockSuggestions, osInfo);

      expect(result.test).toBeDefined();
      expect(result.test?.length).toBe(1);
      expect(result.test?.[0]?.suggestedPath).toBe(testFile);
      expect(result.test?.[0]?.type).toBe('file');
    });

    it('should find existing directories', () => {
      const testDir2 = path.join(testDir, '.config');
      fs.mkdirSync(testDir2);

      const mockSuggestions: Suggestion[] = [
        {
          name: 'test',
          type: 'ide',
          hint: 'Test',
          pathsToCheck: {
            linux: [testDir2],
          },
        },
      ];

      const osInfo: OsInfo = { platform: 'linux', family: 'linux', distro: 'debian' };
      const result = SuggestionLib.getExistingSuggestedPaths(mockSuggestions, osInfo);

      expect(result.test).toBeDefined();
      expect(result.test?.[0]?.type).toBe('directory');
    });

    it('should skip non-existing paths', () => {
      const mockSuggestions: Suggestion[] = [
        {
          name: 'test',
          type: 'terminal',
          hint: 'Test',
          pathsToCheck: {
            linux: ['/non/existing/path'],
          },
        },
      ];

      const osInfo: OsInfo = { platform: 'linux', family: 'linux', distro: 'debian' };
      const result = SuggestionLib.getExistingSuggestedPaths(mockSuggestions, osInfo);

      expect(result.test).toBeUndefined();
    });

    it('should handle multiple paths per suggestion', () => {
      const file1 = path.join(testDir, 'file1.txt');
      const file2 = path.join(testDir, 'file2.txt');
      fs.writeFileSync(file1, 'test1');
      fs.writeFileSync(file2, 'test2');

      const mockSuggestions: Suggestion[] = [
        {
          name: 'test',
          type: 'terminal',
          hint: 'Test',
          pathsToCheck: {
            linux: [file1, file2],
          },
        },
      ];

      const osInfo: OsInfo = { platform: 'linux', family: 'linux', distro: 'debian' };
      const result = SuggestionLib.getExistingSuggestedPaths(mockSuggestions, osInfo);

      expect(result.test?.length).toBe(2);
    });

    it('should skip suggestions without paths for current OS', () => {
      const mockSuggestions: Suggestion[] = [
        {
          name: 'test',
          type: 'terminal',
          hint: 'Test',
          pathsToCheck: {
            macos: ['/some/path'],
          },
        },
      ];

      const osInfo: OsInfo = { platform: 'linux', family: 'linux', distro: 'debian' };
      const result = SuggestionLib.getExistingSuggestedPaths(mockSuggestions, osInfo);

      expect(result.test).toBeUndefined();
    });
  });

  describe('filterAlreadySymlinked', () => {
    it('should filter out already symlinked paths', () => {
      const existingPaths = {
        test: [
          { suggestedPath: '~/.zshrc', type: 'file' as const },
          { suggestedPath: '~/.bashrc', type: 'file' as const },
        ],
      };

      const homeDir = os.homedir();
      const existingSymlinks = [path.join(homeDir, '.zshrc')];

      const result = SuggestionLib.filterAlreadySymlinked(existingPaths, existingSymlinks);

      expect(result.test).toBeDefined();
      expect(result.test?.length).toBe(1);
      expect(result.test?.[0]?.suggestedPath).toBe('~/.bashrc');
    });

    it('should remove suggestion if all paths are symlinked', () => {
      const existingPaths = {
        test: [{ suggestedPath: '~/.zshrc', type: 'file' as const }],
      };

      const homeDir = os.homedir();
      const existingSymlinks = [path.join(homeDir, '.zshrc')];

      const result = SuggestionLib.filterAlreadySymlinked(existingPaths, existingSymlinks);

      expect(result.test).toBeUndefined();
    });

    it('should return empty object when all filtered', () => {
      const existingPaths = {
        test1: [{ suggestedPath: '~/.zshrc', type: 'file' as const }],
        test2: [{ suggestedPath: '~/.bashrc', type: 'file' as const }],
      };

      const homeDir = os.homedir();
      const existingSymlinks = [path.join(homeDir, '.zshrc'), path.join(homeDir, '.bashrc')];

      const result = SuggestionLib.filterAlreadySymlinked(existingPaths, existingSymlinks);

      expect(Object.keys(result).length).toBe(0);
    });

    it('should handle empty existing paths', () => {
      const result = SuggestionLib.filterAlreadySymlinked({}, []);
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe('buildGroupedOptions', () => {
    it('should build grouped options with default value mapper', () => {
      const existingPaths = {
        zsh: [
          { suggestedPath: '~/.zshrc', type: 'file' as const },
          { suggestedPath: '~/.zshenv', type: 'file' as const },
        ],
        bash: [{ suggestedPath: '~/.bashrc', type: 'file' as const }],
      };

      const result = SuggestionLib.buildGroupedOptions(existingPaths);

      expect(result.zsh).toBeDefined();
      expect(result.zsh?.length).toBe(2);
      expect(result.zsh?.[0]?.value).toBe('~/.zshrc');
      expect(result.zsh?.[0]?.label).toBe('~/.zshrc');

      expect(result.bash).toBeDefined();
      expect(result.bash?.length).toBe(1);
      expect(result.bash?.[0]?.value).toBe('~/.bashrc');
    });

    it('should build grouped options with custom value mapper', () => {
      const existingPaths = {
        test: [{ suggestedPath: '~/.zshrc', type: 'file' as const }],
      };

      const mapper = (p: FoundPath) => ({ path: p.suggestedPath, type: p.type });
      const result = SuggestionLib.buildGroupedOptions(existingPaths, mapper);

      expect(result.test?.[0]?.value).toEqual({ path: '~/.zshrc', type: 'file' });
      expect(result.test?.[0]?.label).toBe('~/.zshrc');
    });

    it('should handle empty paths', () => {
      const result = SuggestionLib.buildGroupedOptions({});
      expect(Object.keys(result).length).toBe(0);
    });

    it('should preserve suggestion grouping', () => {
      const existingPaths = {
        group1: [{ suggestedPath: '/path1', type: 'file' as const }],
        group2: [{ suggestedPath: '/path2', type: 'directory' as const }],
        group3: [{ suggestedPath: '/path3', type: 'file' as const }],
      };

      const result = SuggestionLib.buildGroupedOptions(existingPaths);

      expect(Object.keys(result)).toEqual(['group1', 'group2', 'group3']);
    });
  });
});
