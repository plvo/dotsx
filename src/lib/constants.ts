import os from 'node:os';
import path from 'node:path';
import type { KnownLinuxDistro, OsFamily } from '@/types';
import { FileLib } from './file';

function getDOTSX_PATH(): string {
  return process.env.DOTSX_PATH || path.resolve(process.env.HOME || os.homedir(), '.dotsx');
}

export const DOTSX_PATH: string = getDOTSX_PATH();

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

  if (!FileLib.isDirectory(baseOsPath)) {
    throw new Error(`Directory ${baseOsPath} does not exist, please run "dotsx init"`);
  }

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
