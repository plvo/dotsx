import { describe, expect, test } from 'bun:test';
import { cursorDomain } from '../../../src/domains/ide/cursor';
import { vscodeDomain } from '../../../src/domains/ide/vscode';

describe('domains/ide', () => {
  const ideDomains = [vscodeDomain, cursorDomain];

  describe('common IDE domain properties', () => {
    test('should have correct type for all IDE domains', () => {
      for (const domain of ideDomains) {
        expect(domain.type).toBe('ide');
      }
    });

    test('should support debian and macos', () => {
      for (const domain of ideDomains) {
        expect(domain.availableOs).toEqual(['debian', 'macos']);
      }
    });

    test('should have symlink paths defined for both OS types', () => {
      for (const domain of ideDomains) {
        expect(domain.symlinkPaths).toBeDefined();
        expect(domain.symlinkPaths!.debian).toBeDefined();
        expect(domain.symlinkPaths!.macos).toBeDefined();

        expect(Array.isArray(domain.symlinkPaths!.debian)).toBe(true);
        expect(Array.isArray(domain.symlinkPaths!.macos)).toBe(true);

        expect(domain.symlinkPaths!.debian.length).toBeGreaterThan(0);
        expect(domain.symlinkPaths!.macos.length).toBeGreaterThan(0);
      }
    });

    test('should not have package managers (IDE domains use symlinks)', () => {
      for (const domain of ideDomains) {
        expect(domain.packageManagers).toBeUndefined();
      }
    });

    test('should use home directory paths starting with ~/', () => {
      for (const domain of ideDomains) {
        const allPaths = [
          ...domain.symlinkPaths!.debian,
          ...domain.symlinkPaths!.macos
        ];

        for (const path of allPaths) {
          expect(path).toMatch(/^~/);
        }
      }
    });

    test('should have multiple configuration files', () => {
      for (const domain of ideDomains) {
        expect(domain.symlinkPaths!.debian.length).toBeGreaterThan(1);
        expect(domain.symlinkPaths!.macos.length).toBeGreaterThan(1);
      }
    });
  });

  describe('vscodeDomain', () => {
    test('should have correct basic properties', () => {
      expect(vscodeDomain.name).toBe('vscode');
      expect(vscodeDomain.type).toBe('ide');
    });

    test('should have correct debian paths', () => {
      const debianPaths = vscodeDomain.symlinkPaths!.debian;

      expect(debianPaths).toContain('~/.config/Code/User/settings.json');
      expect(debianPaths).toContain('~/.config/Code/User/keybindings.json');
      expect(debianPaths).toContain('~/.config/Code/User/snippets');
    });

    test('should have correct macos paths', () => {
      const macosPaths = vscodeDomain.symlinkPaths!.macos;

      expect(macosPaths).toContain('~/Library/Application Support/Code/User/snippets');
      expect(macosPaths).toContain('~/Library/Application Support/Code/User/keybindings.json');
      expect(macosPaths).toContain('~/Library/Application Support/Code/User/settings.json');
    });

    test('should have same number of files for both OS types', () => {
      const debianCount = vscodeDomain.symlinkPaths!.debian.length;
      const macosCount = vscodeDomain.symlinkPaths!.macos.length;

      expect(debianCount).toBe(macosCount);
      expect(debianCount).toBe(3);
    });

    test('should include common configuration files', () => {
      const debianPaths = vscodeDomain.symlinkPaths!.debian;
      const macosPaths = vscodeDomain.symlinkPaths!.macos;

      // Both should have settings.json
      expect(debianPaths.some(p => p.includes('settings.json'))).toBe(true);
      expect(macosPaths.some(p => p.includes('settings.json'))).toBe(true);

      // Both should have keybindings.json
      expect(debianPaths.some(p => p.includes('keybindings.json'))).toBe(true);
      expect(macosPaths.some(p => p.includes('keybindings.json'))).toBe(true);

      // Both should have snippets
      expect(debianPaths.some(p => p.includes('snippets'))).toBe(true);
      expect(macosPaths.some(p => p.includes('snippets'))).toBe(true);
    });
  });

  describe('cursorDomain', () => {
    test('should have correct basic properties', () => {
      expect(cursorDomain.name).toBe('cursor');
      expect(cursorDomain.type).toBe('ide');
    });

    test('should have correct debian paths', () => {
      const debianPaths = cursorDomain.symlinkPaths!.debian;

      expect(debianPaths).toContain('~/.config/Cursor/User/settings.json');
      expect(debianPaths).toContain('~/.config/Cursor/User/keybindings.json');
      expect(debianPaths).toContain('~/.config/Cursor/User/snippets');
    });

    test('should have correct macos paths', () => {
      const macosPaths = cursorDomain.symlinkPaths!.macos;

      expect(macosPaths).toContain('~/Library/Application Support/Cursor/User/settings.json');
      expect(macosPaths).toContain('~/Library/Application Support/Cursor/User/keybindings.json');
      expect(macosPaths).toContain('~/Library/Application Support/Cursor/User/snippets');
    });

    test('should have same number of files for both OS types', () => {
      const debianCount = cursorDomain.symlinkPaths!.debian.length;
      const macosCount = cursorDomain.symlinkPaths!.macos.length;

      expect(debianCount).toBe(macosCount);
      expect(debianCount).toBe(3);
    });

    test('should include common configuration files', () => {
      const debianPaths = cursorDomain.symlinkPaths!.debian;
      const macosPaths = cursorDomain.symlinkPaths!.macos;

      // Both should have settings.json
      expect(debianPaths.some(p => p.includes('settings.json'))).toBe(true);
      expect(macosPaths.some(p => p.includes('settings.json'))).toBe(true);

      // Both should have keybindings.json
      expect(debianPaths.some(p => p.includes('keybindings.json'))).toBe(true);
      expect(macosPaths.some(p => p.includes('keybindings.json'))).toBe(true);

      // Both should have snippets
      expect(debianPaths.some(p => p.includes('snippets'))).toBe(true);
      expect(macosPaths.some(p => p.includes('snippets'))).toBe(true);
    });
  });

  describe('IDE domain comparison', () => {
    test('should have unique names', () => {
      const names = ideDomains.map(d => d.name);
      const uniqueNames = [...new Set(names)];

      expect(names.length).toBe(uniqueNames.length);
      expect(names).toContain('vscode');
      expect(names).toContain('cursor');
    });

    test('should have different config directories', () => {
      const vscodeDebianPath = vscodeDomain.symlinkPaths!.debian[0];
      const cursorDebianPath = cursorDomain.symlinkPaths!.debian[0];

      expect(vscodeDebianPath).toContain('Code');
      expect(cursorDebianPath).toContain('Cursor');
      expect(vscodeDebianPath).not.toEqual(cursorDebianPath);
    });

    test('should follow similar path patterns', () => {
      // Both should use similar structure but different app names
      const vscodePattern = /~\/\.config\/(Code|Cursor)\/User\//;
      const macosPattern = /~\/Library\/Application Support\/(Code|Cursor)\/User\//;

      for (const domain of ideDomains) {
        const debianPaths = domain.symlinkPaths!.debian;
        const macosPaths = domain.symlinkPaths!.macos;

        for (const path of debianPaths) {
          expect(path).toMatch(vscodePattern);
        }

        for (const path of macosPaths) {
          expect(path).toMatch(macosPattern);
        }
      }
    });
  });

  describe('path validation', () => {
    test('should have valid JSON file extensions where appropriate', () => {
      for (const domain of ideDomains) {
        const allPaths = [
          ...domain.symlinkPaths!.debian,
          ...domain.symlinkPaths!.macos
        ];

        const jsonPaths = allPaths.filter(p => p.includes('.json'));
        expect(jsonPaths.length).toBeGreaterThan(0);

        for (const jsonPath of jsonPaths) {
          expect(jsonPath).toMatch(/\.json$/);
        }
      }
    });

    test('should not have empty paths', () => {
      for (const domain of ideDomains) {
        const allPaths = [
          ...domain.symlinkPaths!.debian,
          ...domain.symlinkPaths!.macos
        ];

        for (const path of allPaths) {
          expect(path.length).toBeGreaterThan(0);
          expect(path.trim()).toBe(path);
        }
      }
    });

    test('should have consistent order of configuration files', () => {
      // Settings should come before keybindings, snippets last
      for (const domain of ideDomains) {
        const debianPaths = domain.symlinkPaths!.debian;

        const settingsIndex = debianPaths.findIndex(p => p.includes('settings.json'));
        const keybindingsIndex = debianPaths.findIndex(p => p.includes('keybindings.json'));
        const snippetsIndex = debianPaths.findIndex(p => p.includes('snippets'));

        expect(settingsIndex).toBeGreaterThan(-1);
        expect(keybindingsIndex).toBeGreaterThan(-1);
        expect(snippetsIndex).toBeGreaterThan(-1);
      }
    });
  });
});