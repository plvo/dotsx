export interface SystemInfo {
  os: string;
  hostname: string;
  memory: string;
  shell: string;
  rcFile: string;
  dotfilesPath: string;
}

export type DomainType = 'ide' | 'os' | 'terminal';

export type OsType = 'debian' | 'macos';

export interface Domain {
  name: string;
  type: DomainType;
  availableOs: OsType[];
  packageManagers?: Record<string, PackageManagerConfig>;
  symlinkPaths?: Record<OsType, string[]>;
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
  linkPath: string;
  targetPath: string;
};

export type AllLinks = {
  correctSymlinks: Array<Link>;
  incorrectSymlinks: Array<Link>;
};
