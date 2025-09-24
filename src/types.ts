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
  pathToSearch: Record<OsType, string[]>;
  packageManagers?: Record<string, PackageManagerConfig>;
  symlinkPaths?: Record<OsType, string[]>;
}


export interface PackageManagerConfig {
  packages: string;
  install: string;
  remove: string;
  status: string;
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
