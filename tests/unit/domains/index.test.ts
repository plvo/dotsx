import { describe, expect, test } from 'bun:test';
import {
  allDomains,
  bashDomain,
  cursorDomain,
  debianDomain,
  getDomainByName,
  getDomainsByType,
  tmuxDomain,
  vscodeDomain,
  zshDomain,
} from '../../../src/domains';
import type { Domain } from '@/types';

describe('domains/index', () => {
  describe('allDomains', () => {
    test('should contain all expected domains', () => {
      expect(allDomains).toHaveLength(6);

      const domainNames = allDomains.map(domain => domain.name);
      expect(domainNames).toContain('debian');
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

      expect(osDomains).toHaveLength(1);
      expect(ideDomains).toHaveLength(2);
      expect(terminalDomains).toHaveLength(3);
    });
  });

  describe('getDomainsByType', () => {
    test('should return OS domains', () => {
      const osDomains = getDomainsByType('os');

      expect(osDomains).toHaveLength(1);
      expect(osDomains[0].name).toBe('debian');
      expect(osDomains[0].type).toBe('os');
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
      expect(debianResult?.name).toBe('debian');
      expect(debianResult?.type).toBe('os');

      const zshResult = getDomainByName('zsh');
      expect(zshResult).toBeDefined();
      expect(zshResult?.name).toBe('zsh');
      expect(zshResult?.type).toBe('terminal');

      const vscodeResult = getDomainByName('vscode');
      expect(vscodeResult).toBeDefined();
      expect(vscodeResult?.name).toBe('vscode');
      expect(vscodeResult?.type).toBe('ide');
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

  describe('exported domains', () => {
    test('should export all individual domains', () => {
      expect(debianDomain).toBeDefined();
      expect(debianDomain.name).toBe('debian');
      expect(debianDomain.type).toBe('os');

      expect(cursorDomain).toBeDefined();
      expect(cursorDomain.name).toBe('cursor');
      expect(cursorDomain.type).toBe('ide');

      expect(vscodeDomain).toBeDefined();
      expect(vscodeDomain.name).toBe('vscode');
      expect(vscodeDomain.type).toBe('ide');

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