import os from 'node:os';
import path from 'node:path';
import type { KnownLinuxDistro, OsFamily } from '@/types';

function getDotsxPath(): string {
  return process.env.DOTSX_PATH || path.resolve(process.env.HOME || os.homedir(), '.dotsx');
}

function getBackupPath(): string {
  return process.env.BACKUP_METADATA_PATH || path.resolve(process.env.HOME || os.homedir(), '.backup.dotsx');
}

export const DOTSX_PATH: string = getDotsxPath();

export const BACKUP_PATH: string = getBackupPath();
export const BACKUP_METADATA_PATH: string = path.resolve(BACKUP_PATH, '.last-backup.json');
export const BACKUP_LIMIT_PER_FILE: number = 7;

export interface DotsxOsPath {
  baseOs: string;
  config: string;
  bin: string;
  binAliases: string;
  packagesManager: string;
  packagesManagerConfig: string;
  symlinks: string;
}

export function resolveDotsxOsPath(os: OsFamily | KnownLinuxDistro): DotsxOsPath {
  const baseOsPath = path.resolve(DOTSX_PATH, os);

  return {
    baseOs: baseOsPath,
    config: path.resolve(baseOsPath, 'dotsx.config.json'),
    bin: path.resolve(baseOsPath, 'bin'),
    binAliases: path.resolve(baseOsPath, 'bin', 'dotsx.bin.aliases'),
    packagesManager: path.resolve(baseOsPath, 'packages'),
    packagesManagerConfig: path.resolve(baseOsPath, 'packages', 'dotsx.packages.json'),
    symlinks: path.resolve(baseOsPath, 'symlinks'),
  };
}
