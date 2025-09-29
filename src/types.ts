export type Family = 'linux' | 'windows' | 'macos' | 'bsd' | 'unix' | 'unknown';

export interface OsInfo {
  platform: NodeJS.Platform;
  family: Family;
  distro?: string | null;
  release?: string | null;
}

export interface SystemInfo extends OsInfo {
  arch: string;
  hostname: string;
  memory: string;
  shell: string;
  rcFile: string;
}

export type DomainType = 'ide' | 'os' | 'terminal';

export interface Domain {
  name: string;
  type: DomainType;
  distro: string[] | null;
  packageManagers?: Record<string, PackageManagerConfig>;
  symlinkPaths?: Partial<Record<Family, string[]>>;
  defaultContent?: string;
}

export interface PackageManagerConfig {
  configPath: string;
  install: string;
  remove: string;
  status: string;
  defaultContent: string;
}

export type CliCommand = {
  execute: () => Promise<void>;
  [key: string]: () => unknown;
};

export type Link = {
  systemPath: string;
  dotsxPath: string;
};

export type AllLinks = {
  correctSymlinks: Array<Link>;
  incorrectSymlinks: Array<Link>;
};

export interface ConfigStatusInfo {
  status: 'fully_imported' | 'partially_imported' | 'not_imported' | 'incompatible';
  importedPaths: string[];
  missingPaths: string[];
  totalFiles: number;
  importedFiles: number;
}

export interface GitInfo {
  isRepository: boolean;
  repoName?: string;
  remoteName?: string;
  remoteUrl?: string;
  currentBranch?: string;
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
  status?: {
    ahead: number;
    behind: number;
    hasUncommittedChanges: boolean;
  };
}

export interface GitValidationResult {
  isValid: boolean;
  missingDirectories: string[];
  message: string;
}
