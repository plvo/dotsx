interface SystemInfo {
  os: string;
  hostname: string;
  memory: string;
  shell: string;
  rcFile: string;
  dotfilesPath: string;
}

interface PackageManagerConfig {
  packages: string;
  install: string;
  remove: string;
  status: string;
}

type CliCommand = {
  execute: () => Promise<void>;
  [key: string]: () => unknown;
};

type Link = {
  linkPath: string;
  targetPath: string;
};

type AllLinks = {
  correctSymlinks: Array<Link>;
  incorrectSymlinks: Array<Link>;
};
