import { describe, expect, test } from 'bun:test';
import { bashDomain } from '../../../src/domains/terminal/bash';
import { tmuxDomain } from '../../../src/domains/terminal/tmux';
import { zshDomain } from '../../../src/domains/terminal/zsh';

describe('domains/terminal', () => {
  const terminalDomains = [zshDomain, bashDomain, tmuxDomain];

  describe('common terminal domain properties', () => {
    test('should have correct type for all terminal domains', () => {
      for (const domain of terminalDomains) {
        expect(domain.type).toBe('terminal');
      }
    });

    test('should support debian and macos', () => {
      for (const domain of terminalDomains) {
        expect(domain.availableOs).toEqual(['debian', 'macos']);
      }
    });

    test('should have symlink paths defined for both OS types', () => {
      for (const domain of terminalDomains) {
        expect(domain.symlinkPaths).toBeDefined();
        expect(domain.symlinkPaths!.debian).toBeDefined();
        expect(domain.symlinkPaths!.macos).toBeDefined();

        expect(Array.isArray(domain.symlinkPaths!.debian)).toBe(true);
        expect(Array.isArray(domain.symlinkPaths!.macos)).toBe(true);

        expect(domain.symlinkPaths!.debian.length).toBeGreaterThan(0);
        expect(domain.symlinkPaths!.macos.length).toBeGreaterThan(0);
      }
    });

    test('should not have package managers (terminal domains use symlinks)', () => {
      for (const domain of terminalDomains) {
        expect(domain.packageManagers).toBeUndefined();
      }
    });

    test('should use home directory paths starting with ~/', () => {
      for (const domain of terminalDomains) {
        const allPaths = [
          ...domain.symlinkPaths!.debian,
          ...domain.symlinkPaths!.macos
        ];

        for (const path of allPaths) {
          expect(path).toMatch(/^~/);
        }
      }
    });
  });

  describe('zshDomain', () => {
    test('should have correct basic properties', () => {
      expect(zshDomain.name).toBe('zsh');
      expect(zshDomain.type).toBe('terminal');
    });

    test('should have correct symlink paths', () => {
      expect(zshDomain.symlinkPaths!.debian).toEqual(['~/.zshrc']);
      expect(zshDomain.symlinkPaths!.macos).toEqual(['~/.zshrc']);
    });

    test('should have same config file for both OS types', () => {
      const debianPaths = zshDomain.symlinkPaths!.debian;
      const macosPaths = zshDomain.symlinkPaths!.macos;

      expect(debianPaths).toEqual(macosPaths);
    });
  });

  describe('bashDomain', () => {
    test('should have correct basic properties', () => {
      expect(bashDomain.name).toBe('bash');
      expect(bashDomain.type).toBe('terminal');
    });

    test('should have correct symlink paths', () => {
      expect(bashDomain.symlinkPaths!.debian).toEqual(['~/.bashrc']);
      expect(bashDomain.symlinkPaths!.macos).toEqual(['~/.bashrc']);
    });

    test('should have same config file for both OS types', () => {
      const debianPaths = bashDomain.symlinkPaths!.debian;
      const macosPaths = bashDomain.symlinkPaths!.macos;

      expect(debianPaths).toEqual(macosPaths);
    });
  });

  describe('tmuxDomain', () => {
    test('should have correct basic properties', () => {
      expect(tmuxDomain.name).toBe('tmux');
      expect(tmuxDomain.type).toBe('terminal');
    });

    test('should have correct symlink paths', () => {
      expect(tmuxDomain.symlinkPaths!.debian).toEqual(['~/.tmux.conf']);
      expect(tmuxDomain.symlinkPaths!.macos).toEqual(['~/.tmux.conf']);
    });

    test('should have same config file for both OS types', () => {
      const debianPaths = tmuxDomain.symlinkPaths!.debian;
      const macosPaths = tmuxDomain.symlinkPaths!.macos;

      expect(debianPaths).toEqual(macosPaths);
    });
  });

  describe('terminal domain uniqueness', () => {
    test('should have unique names', () => {
      const names = terminalDomains.map(d => d.name);
      const uniqueNames = [...new Set(names)];

      expect(names.length).toBe(uniqueNames.length);
    });

    test('should have different config files', () => {
      const configFiles = terminalDomains.map(d => d.symlinkPaths!.debian[0]);
      const uniqueFiles = [...new Set(configFiles)];

      expect(configFiles.length).toBe(uniqueFiles.length);
      expect(configFiles).toContain('~/.zshrc');
      expect(configFiles).toContain('~/.bashrc');
      expect(configFiles).toContain('~/.tmux.conf');
    });
  });

  describe('path validation', () => {
    test('should have valid file extensions', () => {
      expect(zshDomain.symlinkPaths!.debian[0]).toMatch(/\.zshrc$/);
      expect(bashDomain.symlinkPaths!.debian[0]).toMatch(/\.bashrc$/);
      expect(tmuxDomain.symlinkPaths!.debian[0]).toMatch(/\.tmux\.conf$/);
    });

    test('should not have empty paths', () => {
      for (const domain of terminalDomains) {
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
  });
});