export type KnownLinuxDistro =
  | 'debian'
  | 'ubuntu'
  | 'arch'
  | 'manjaro'
  | 'fedora'
  | 'rhel'
  | 'centos'
  | 'rocky'
  | 'almalinux'
  | 'opensuse'
  | 'opensuse-leap'
  | 'opensuse-tumbleweed'
  | 'sles'
  | 'gentoo'
  | 'void'
  | 'nixos'
  | 'slackware'
  | 'kali'
  | 'raspbian'
  | 'pop'
  | 'elementary'
  | 'linuxmint'
  | 'zorin'
  | 'endless'
  | 'clear-linux-os'
  | 'alpine'
  | 'amazon'
  | 'oracle'
  | 'mageia'
  | 'parrot'
  | 'deepin';

export type OsFamily = 'linux' | 'windows' | 'macos' | 'bsd' | 'unix' | 'unknown';

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
