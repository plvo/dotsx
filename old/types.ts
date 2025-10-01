export type DomainType = 'ide' | 'os' | 'terminal';

export interface Domain {
  name: string;
  type: DomainType;
  distro: string[] | null;
  packageManagers?: Record<string, PackageManagerConfig>;
  symlinkPaths?: Partial<Record<Family, string[]>>;
  defaultContent?: string;
}

export type Family = 'linux' | 'windows' | 'macos' | 'bsd' | 'unix' | 'unknown';

export interface PackageManagerConfig {
  configPath: string;
  install: string;
  remove: string;
  status: string;
  defaultContent: string;
}
