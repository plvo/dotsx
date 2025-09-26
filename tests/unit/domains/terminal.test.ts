import { describe, expect, test } from 'bun:test';
import { bashDomain, tmuxDomain, zshDomain } from '../../../src/domains';

describe('domains/terminal', () => {
  const terminalDomains = [zshDomain, bashDomain, tmuxDomain];

  describe('common terminal domain properties', () => {
    test('should have correct type for all terminal domains', () => {
      for (const domain of terminalDomains) {
        expect(domain.type).toBe('terminal');
      }
    });

    test('should support linux and macos', () => {
      for (const domain of terminalDomains) {
        expect(domain.availableOs).toEqual(['linux', 'macos']);
      }
    });

    test('should have symlink paths defined for both OS types', () => {
      for (const domain of terminalDomains) {
        expect(domain.symlinkPaths).toBeDefined();
        expect(domain.symlinkPaths?.linux).toBeDefined();
        expect(domain.symlinkPaths?.macos).toBeDefined();

        expect(Array.isArray(domain.symlinkPaths?.linux)).toBe(true);
        expect(Array.isArray(domain.symlinkPaths?.macos)).toBe(true);

        expect(domain.symlinkPaths?.linux?.length).toBeGreaterThan(0);
        expect(domain.symlinkPaths?.macos?.length).toBeGreaterThan(0);
      }
    });

    test('should not have package managers (terminal domains use symlinks)', () => {
      for (const domain of terminalDomains) {
        expect(domain.packageManagers).toBeUndefined();
      }
    });

    test('should use home directory paths starting with ~/', () => {
      for (const domain of terminalDomains) {
        const allPaths = [...(domain.symlinkPaths?.linux ?? []), ...(domain.symlinkPaths?.macos ?? [])];

        for (const path of allPaths) {
          expect(path).toMatch(/^~/);
        }
      }
    });
  });

  describe('path validation', () => {
    test('should have valid file extensions', () => {
      expect(zshDomain.symlinkPaths?.linux?.[0]).toMatch(/\.zshrc$/);
      expect(bashDomain.symlinkPaths?.linux?.[0]).toMatch(/\.bashrc$/);
      expect(tmuxDomain.symlinkPaths?.linux?.[0]).toMatch(/\.tmux\.conf$/);
    });

    test('should not have empty paths', () => {
      for (const domain of terminalDomains) {
        const allPaths = [...(domain.symlinkPaths?.linux ?? []), ...(domain.symlinkPaths?.macos ?? [])];

        for (const path of allPaths) {
          expect(path.length).toBeGreaterThan(0);
          expect(path.trim()).toBe(path);
        }
      }
    });
  });
});
