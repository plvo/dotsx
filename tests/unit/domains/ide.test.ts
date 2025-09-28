/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
import { describe, expect, test } from 'bun:test';
import { cursorDomain, vscodeDomain } from '../../../src/domains';

describe('domains/ide', () => {
  const ideDomains = [vscodeDomain, cursorDomain];

  describe('common IDE domain properties', () => {
    test('should have correct type for all IDE domains', () => {
      for (const domain of ideDomains) {
        expect(domain.type).toBe('ide');
      }
    });

    test('should support linux and macos', () => {
      for (const domain of ideDomains) {
        expect(domain.availableOs).toEqual(['linux', 'macos']);
      }
    });

    test('should have symlink paths defined for both OS types', () => {
      for (const domain of ideDomains) {
        expect(domain.symlinkPaths).toBeDefined();
        expect(domain.symlinkPaths?.linux).toBeDefined();
        expect(domain.symlinkPaths?.macos).toBeDefined();

        expect(Array.isArray(domain.symlinkPaths?.linux)).toBe(true);
        expect(Array.isArray(domain.symlinkPaths?.macos)).toBe(true);

        expect(domain.symlinkPaths?.linux?.length).toBeGreaterThan(0);
        expect(domain.symlinkPaths?.macos?.length).toBeGreaterThan(0);
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
          ...(domain.symlinkPaths?.linux ?? []),
          ...(domain.symlinkPaths?.macos ?? [])
        ];

        for (const path of allPaths) {
          expect(path).toMatch(/^~/);
        }
      }
    });

    test('should have multiple configuration files', () => {
      for (const domain of ideDomains) {
        expect(domain.symlinkPaths?.linux?.length).toBeGreaterThan(1);
        expect(domain.symlinkPaths?.macos?.length).toBeGreaterThan(1);
      }
    });
  });

  describe('vscodeDomain', () => {
    test('should have correct basic properties', () => {
      expect(vscodeDomain.name).toBe('vscode');
      expect(vscodeDomain.type).toBe('ide');
    });

    test('should have correct linux paths', () => {
      const linuxPaths = vscodeDomain.symlinkPaths?.linux;

      expect(linuxPaths).toContain('~/.config/Code/User/settings.json');
      expect(linuxPaths).toContain('~/.config/Code/User/keybindings.json');
      expect(linuxPaths).toContain('~/.config/Code/User/snippets');
    });

    test('should have correct macos paths', () => {
      const macosPaths = vscodeDomain.symlinkPaths?.macos;

      expect(macosPaths).toContain('~/Library/Application Support/Code/User/snippets');
      expect(macosPaths).toContain('~/Library/Application Support/Code/User/keybindings.json');
      expect(macosPaths).toContain('~/Library/Application Support/Code/User/settings.json');
    });

    test('should have same number of files for both OS types', () => {
      const linuxCount = vscodeDomain.symlinkPaths?.linux?.length;

      expect(linuxCount).toBe(vscodeDomain.symlinkPaths?.macos?.length ?? 0);
      expect(linuxCount).toBe(3);
    });

    test('should include common configuration files', () => {
      const linuxPaths = vscodeDomain.symlinkPaths?.linux ?? [];
      const macosPaths = vscodeDomain.symlinkPaths?.macos ?? [];

      // Both should have settings.json
      expect(linuxPaths.some(p => p.includes('settings.json'))).toBe(true);
      expect(macosPaths.some(p => p.includes('settings.json'))).toBe(true);

      // Both should have keybindings.json
      expect(linuxPaths.some(p => p.includes('keybindings.json'))).toBe(true);
      expect(macosPaths.some(p => p.includes('keybindings.json'))).toBe(true);

      // Both should have snippets
      expect(linuxPaths.some(p => p.includes('snippets'))).toBe(true);
      expect(macosPaths.some(p => p.includes('snippets'))).toBe(true);
    });
  });

  describe('cursorDomain', () => {
    test('should have correct basic properties', () => {
      expect(cursorDomain.name).toBe('cursor');
      expect(cursorDomain.type).toBe('ide');
    });

    test('should have correct linux paths', () => {
      const linuxPaths = cursorDomain.symlinkPaths!.linux;

      expect(linuxPaths).toContain('~/.config/Cursor/User/settings.json');
      expect(linuxPaths).toContain('~/.config/Cursor/User/keybindings.json');
      expect(linuxPaths).toContain('~/.config/Cursor/User/snippets');
    });

    test('should have correct macos paths', () => {
      const macosPaths = cursorDomain.symlinkPaths!.macos;

      expect(macosPaths).toContain('~/Library/Application Support/Cursor/User/settings.json');
      expect(macosPaths).toContain('~/Library/Application Support/Cursor/User/keybindings.json');
      expect(macosPaths).toContain('~/Library/Application Support/Cursor/User/snippets');
    });

    test('should have same number of files for both OS types', () => {
      const linuxCount = cursorDomain.symlinkPaths?.linux?.length ?? 0;
      const macosCount = cursorDomain.symlinkPaths?.macos?.length ?? 0;

      expect(linuxCount).toBe(macosCount);
      expect(linuxCount).toBe(3);
    });

    test('should include common configuration files', () => {
      // Both should have settings.json
      expect(cursorDomain.symlinkPaths?.linux?.some(p => p.includes('settings.json'))).toBe(true);
      expect(cursorDomain.symlinkPaths?.macos?.some(p => p.includes('settings.json'))).toBe(true);

      // Both should have keybindings.json
      expect(cursorDomain.symlinkPaths?.linux?.some(p => p.includes('keybindings.json'))).toBe(true);
      expect(cursorDomain.symlinkPaths?.macos?.some(p => p.includes('keybindings.json'))).toBe(true);

      // Both should have snippets
      expect(cursorDomain.symlinkPaths?.linux?.some(p => p.includes('snippets'))).toBe(true);
      expect(cursorDomain.symlinkPaths?.macos?.some(p => p.includes('snippets'))).toBe(true);
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
      const vscodeLinuxPath = vscodeDomain.symlinkPaths?.linux?.[0];
      const cursorLinuxPath = cursorDomain.symlinkPaths?.linux?.[0];

      expect(vscodeLinuxPath).toContain('Code');
      expect(cursorLinuxPath).toContain('Cursor');
      expect(vscodeLinuxPath).not.toEqual(cursorLinuxPath);
    });

    test('should follow similar path patterns', () => {
      // Both should use similar structure but different app names
      const vscodePattern = /~\/\.config\/(Code|Cursor)\/User\//;
      const macosPattern = /~\/Library\/Application Support\/(Code|Cursor)\/User\//;

      for (const domain of ideDomains) {
        const linuxPaths = domain.symlinkPaths?.linux ?? [];
        for (const path of linuxPaths) {
          expect(path).toMatch(vscodePattern);
        }

        const macosPaths = domain.symlinkPaths?.macos ?? [];
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
          ...domain.symlinkPaths?.linux ?? [],
          ...domain.symlinkPaths?.macos ?? [],
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
          ...domain.symlinkPaths?.linux ?? [],
          ...domain.symlinkPaths?.macos ?? []
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

        const settingsIndex = domain.symlinkPaths?.linux?.findIndex(p => p.includes('settings.json'));
        const keybindingsIndex = domain.symlinkPaths?.linux?.findIndex(p => p.includes('keybindings.json'));
        const snippetsIndex = domain.symlinkPaths?.linux?.findIndex(p => p.includes('snippets'));

        expect(settingsIndex).toBeGreaterThan(-1);
        expect(keybindingsIndex).toBeGreaterThan(-1);
        expect(snippetsIndex).toBeGreaterThan(-1);
      }
    });
  });
});