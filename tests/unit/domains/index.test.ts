import { describe, expect, test } from 'bun:test';
import {
  allDomains,
  alpineDomain,
  archDomain,
  bashDomain,
  cursorDomain,
  debianDomain,
  fedoraDomain,
  getDomainByDistro,
  getDomainByName,
  getDomainsByType,
  macosDomain,
  suseDomain,
  tmuxDomain,
  vscodeDomain,
  zshDomain,
} from '../../../src/domains';

describe('domains/index', () => {
  describe('allDomains', () => {
    test('should contain all expected domains', () => {
      expect(allDomains.length).toBeGreaterThanOrEqual(8); // At least 8 domains now

      const domainNames = allDomains.map(domain => domain.name);
      expect(domainNames).toContain('debian');
      expect(domainNames).toContain('fedora');
      expect(domainNames).toContain('arch');
      expect(domainNames).toContain('alpine');
      expect(domainNames).toContain('suse');
      expect(domainNames).toContain('macos');
      expect(domainNames).toContain('cursor');
      expect(domainNames).toContain('vscode');
      expect(domainNames).toContain('zsh');
      expect(domainNames).toContain('bash');
      expect(domainNames).toContain('tmux');
    });

    test('should have correct domain types', () => {
      const osDomains = allDomains.filter(d => d.type === 'os');
      const ideDomains = allDomains.filter(d => d.type === 'ide');
      const terminalDomains = allDomains.filter(d => d.type === 'terminal');

      expect(osDomains.length).toBeGreaterThanOrEqual(6); // 6 OS domains now (including macOS)
      expect(ideDomains).toHaveLength(2);
      expect(terminalDomains).toHaveLength(3);
    });
  });

  describe('getDomainsByType', () => {
    test('should return OS domains', () => {
      const osDomains = getDomainsByType('os');

      expect(osDomains.length).toBeGreaterThanOrEqual(6);
      const osNames = osDomains.map(d => d.name);
      expect(osNames).toContain('debian');
      expect(osNames).toContain('fedora');
      expect(osNames).toContain('arch');
      expect(osNames).toContain('macos');
      
      for (const domain of osDomains) {
        expect(domain.type).toBe('os');
      }
    });

    test('should return IDE domains', () => {
      const ideDomains = getDomainsByType('ide');

      expect(ideDomains).toHaveLength(2);
      const ideNames = ideDomains.map(d => d.name);
      expect(ideNames).toContain('cursor');
      expect(ideNames).toContain('vscode');

      for (const domain of ideDomains) {
        expect(domain.type).toBe('ide');
      }
    });

    test('should return terminal domains', () => {
      const terminalDomains = getDomainsByType('terminal');

      expect(terminalDomains).toHaveLength(3);
      const terminalNames = terminalDomains.map(d => d.name);
      expect(terminalNames).toContain('zsh');
      expect(terminalNames).toContain('bash');
      expect(terminalNames).toContain('tmux');

      for (const domain of terminalDomains) {
        expect(domain.type).toBe('terminal');
      }
    });

    test('should return empty array for unknown type', () => {
      const unknownDomains = getDomainsByType('unknown' as any);
      expect(unknownDomains).toEqual([]);
    });
  });

  describe('getDomainByName', () => {
    test('should return domain by name', () => {
      const debianResult = getDomainByName('debian');
      expect(debianResult).toBeDefined();
      if (debianResult) {
        expect(debianResult.name).toBe('debian');
        expect(debianResult.type).toBe('os');
      }
    });

    test('should return zsh domain by name', () => {
      const zshResult = getDomainByName('zsh');
      expect(zshResult).toBeDefined();
      if (zshResult) {
        expect(zshResult.name).toBe('zsh');
        expect(zshResult.type).toBe('terminal');
      }
    });

    test('should return vscode domain by name', () => {
      const vscodeResult = getDomainByName('vscode');
      expect(vscodeResult).toBeDefined();
      if (vscodeResult) {
        expect(vscodeResult.name).toBe('vscode');
        expect(vscodeResult.type).toBe('ide');
      }
    });

    test('should return undefined for unknown domain', () => {
      const result = getDomainByName('nonexistent');
      expect(result).toBeUndefined();
    });

    test('should be case sensitive', () => {
      const result = getDomainByName('DEBIAN');
      expect(result).toBeUndefined();
    });
  });

  describe('getDomainByDistro', () => {
    test('should return domain by distro name', () => {
      const debianResult = getDomainByDistro('debian');
      expect(debianResult).toBeDefined();
      expect(debianResult?.distro).toBe('debian');
      expect(debianResult?.type).toBe('os');

      const fedoraResult = getDomainByDistro('fedora');
      expect(fedoraResult).toBeDefined();
      expect(fedoraResult?.distro).toBe('fedora');
      expect(fedoraResult?.type).toBe('os');
    });

    test('should return undefined for unknown distro', () => {
      const result = getDomainByDistro('nonexistent');
      expect(result).toBeUndefined();
    });

    test('should not find IDE or terminal domains', () => {
      const cursorResult = getDomainByDistro('cursor');
      expect(cursorResult).toBeUndefined();
    });
  });

  describe('exported domains', () => {
    test('should export all individual domains', () => {
      // OS domains
      expect(debianDomain).toBeDefined();
      expect(debianDomain.name).toBe('debian');
      expect(debianDomain.type).toBe('os');

      expect(fedoraDomain).toBeDefined();
      expect(fedoraDomain.name).toBe('fedora');
      expect(fedoraDomain.type).toBe('os');

      expect(archDomain).toBeDefined();
      expect(archDomain.name).toBe('arch');
      expect(archDomain.type).toBe('os');

      expect(alpineDomain).toBeDefined();
      expect(alpineDomain.name).toBe('alpine');
      expect(alpineDomain.type).toBe('os');

      expect(suseDomain).toBeDefined();
      expect(suseDomain.name).toBe('suse');
      expect(suseDomain.type).toBe('os');

      expect(macosDomain).toBeDefined();
      expect(macosDomain.name).toBe('macos');
      expect(macosDomain.type).toBe('os');

      // IDE domains
      expect(cursorDomain).toBeDefined();
      expect(cursorDomain.name).toBe('cursor');
      expect(cursorDomain.type).toBe('ide');

      expect(vscodeDomain).toBeDefined();
      expect(vscodeDomain.name).toBe('vscode');
      expect(vscodeDomain.type).toBe('ide');

      // Terminal domains
      expect(zshDomain).toBeDefined();
      expect(zshDomain.name).toBe('zsh');
      expect(zshDomain.type).toBe('terminal');

      expect(bashDomain).toBeDefined();
      expect(bashDomain.name).toBe('bash');
      expect(bashDomain.type).toBe('terminal');

      expect(tmuxDomain).toBeDefined();
      expect(tmuxDomain.name).toBe('tmux');
      expect(tmuxDomain.type).toBe('terminal');
    });
  });

  describe('domain structure validation', () => {
    test('should have required properties on all domains', () => {
      for (const domain of allDomains) {
        expect(domain.name).toBeDefined();
        expect(typeof domain.name).toBe('string');
        expect(domain.name.length).toBeGreaterThan(0);

        expect(domain.type).toBeDefined();
        expect(['os', 'ide', 'terminal']).toContain(domain.type);

        expect(domain.availableOs).toBeDefined();
        expect(Array.isArray(domain.availableOs)).toBe(true);
        expect(domain.availableOs.length).toBeGreaterThan(0);

        // distro field should be defined (string for Linux OS domains, null for others including macOS)
        expect(domain.distro !== undefined).toBe(true);
        if (domain.type === 'os' && domain.name !== 'macos') {
          // Linux distributions should have a distro string
          expect(typeof domain.distro).toBe('string');
          expect(domain.distro?.length).toBeGreaterThan(0);
        } else {
          // IDE, terminal, and macOS domains should have null distro
          expect(domain.distro).toBeNull();
        }
      }
    });

    test('should have package managers for OS domains', () => {
      const osDomains = getDomainsByType('os');

      for (const domain of osDomains) {
        expect(domain.packageManagers).toBeDefined();
        expect(typeof domain.packageManagers).toBe('object');
      }
    });

    test('should have symlink paths for IDE and terminal domains', () => {
      const ideAndTerminalDomains = [
        ...getDomainsByType('ide'),
        ...getDomainsByType('terminal')
      ];

      for (const domain of ideAndTerminalDomains) {
        expect(domain.symlinkPaths).toBeDefined();
        expect(typeof domain.symlinkPaths).toBe('object');

        // Should have paths for at least one OS
        const osPaths = Object.keys(domain.symlinkPaths!);
        expect(osPaths.length).toBeGreaterThan(0);
      }
    });
  });
});