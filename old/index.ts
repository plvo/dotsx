import * as ide from './ide';
import * as os from './os';
import * as terminal from './terminal';
import type { Domain } from './types';

export const allDomains: Domain[] = [...Object.values(os), ...Object.values(ide), ...Object.values(terminal)].filter(
  (d): d is Domain => typeof d === 'object' && d !== null && 'type' in d && 'name' in d,
);

export function getDomainByName(name: string): Domain | undefined {
  return allDomains.find((domain) => domain.name === name);
}

export function getDomainsByType(type: Domain['type']): Domain[] {
  return allDomains.filter((domain) => domain.type === type);
}

export function getDomainByDistro(distro: string): Domain | undefined {
  return allDomains.find((domain) => domain.distro?.includes(distro));
}

export * from './ide';
export * from './os';
export * from './terminal';
