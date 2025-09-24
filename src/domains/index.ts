import type { Domain } from '@/types';
import { cursorDomain } from './ide/cursor';
import { vscodeDomain } from './ide/vscode';
import { debianDomain } from './os/debian';
import { bashDomain } from './terminal/bash';
import { tmuxDomain } from './terminal/tmux';
import { zshDomain } from './terminal/zsh';

// All available domains
export const allDomains: Domain[] = [debianDomain, cursorDomain, vscodeDomain, zshDomain, bashDomain, tmuxDomain];

// Get domains by type
export function getDomainsByType(type: Domain['type']): Domain[] {
  return allDomains.filter((domain) => domain.type === type);
}

// Get domain by name
export function getDomainByName(name: string): Domain | undefined {
  return allDomains.find((domain) => domain.name === name);
}

// Export individual domains for direct access
export { debianDomain, cursorDomain, vscodeDomain, zshDomain, bashDomain, tmuxDomain };
