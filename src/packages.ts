import type { KnownLinuxDistro, OsFamily } from './types';

export interface PackageManager {
  name: string;
  fileList: string;
  install: string;
  remove: string;
  status: string;
}
/**
 * Get the package manager config for a given OS
 * The result will be wrote in the `dotsx.packages.json` file
 * @param os - The OS to get the package manager config for
 * @returns The package manager config
 */
export function getPackageManagerConfig(os: OsFamily | KnownLinuxDistro) {
  switch (os) {
    case 'macos':
      return macosPackages;
    case 'debian':
    case 'ubuntu':
    case 'linuxmint':
    case 'kali':
    case 'deepin':
    case 'elementary':
    case 'pop':
    case 'zorin':
    case 'endless':
    case 'parrot':
    case 'raspbian':
      return debianPackages;
    case 'fedora':
    case 'rhel':
    case 'centos':
    case 'rocky':
    case 'almalinux':
    case 'oracle':
    case 'amazon':
      return rhelPackages;
    case 'arch':
    case 'manjaro':
      return archPackages;
    case 'alpine':
      return alpinePackages;
    /* Not handled yet
	  case 'opensuse':
	  case 'opensuse-leap':
	  case 'opensuse-tumbleweed':
	  case 'sles':
		return ['zypper.txt'];
	  case 'gentoo':
		return ['emerge.txt'];
	  case 'void':
		return ['xbps.txt'];
	  case 'nixos':
		return ['nix.txt'];
	  case 'slackware':
		return ['slackpkg.txt'];
	  case 'clear-linux-os':
		return ['swupd.txt'];
	  case 'mageia':
		return ['urpmi.txt'];
	  */
    default:
      return [];
  }
}

// macOS
const macosPackages: PackageManager[] = [
  {
    name: 'brew',
    fileList: 'brew.txt',
    install: 'brew install %s',
    remove: 'brew uninstall %s',
    status: 'brew list %s',
  },
];

// Debian family: Debian, Ubuntu, Mint, Kali, Deepin, Elementary, Pop, Zorin, Endless, Parrot, Raspbian
const debianPackages: PackageManager[] = [
  {
    name: 'apt',
    fileList: 'apt.txt',
    install: 'sudo apt install -y %s',
    remove: 'sudo apt remove -y %s',
    status: 'dpkg -s %s',
  },
  {
    name: 'snap',
    fileList: 'snap.txt',
    install: 'sudo snap install %s',
    remove: 'sudo snap remove %s',
    status: 'snap list | grep -w "%s"',
  },
  {
    name: 'flatpak',
    fileList: 'flatpak.txt',
    install: 'flatpak install -y %s',
    remove: 'flatpak uninstall -y %s',
    status: 'flatpak list | grep -w "%s"',
  },
];

// Fedora + RHEL family: Fedora, RHEL, CentOS, Rocky, AlmaLinux, Oracle, Amazon Linux
const rhelPackages: PackageManager[] = [
  {
    name: 'dnf',
    fileList: 'dnf.txt',
    install: 'sudo dnf install -y %s',
    remove: 'sudo dnf remove -y %s',
    status: 'dnf list installed %s',
  },
  {
    name: 'yum',
    fileList: 'yum.txt',
    install: 'sudo yum install -y %s',
    remove: 'sudo yum remove -y %s',
    status: 'yum list installed %s',
  },
];

// Arch family: Arch, Manjaro
const archPackages: PackageManager[] = [
  {
    name: 'pacman',
    fileList: 'pacman.txt',
    install: 'sudo pacman -S --noconfirm %s',
    remove: 'sudo pacman -Rns --noconfirm %s',
    status: 'pacman -Q %s',
  },
  {
    name: 'yay',
    fileList: 'yay.txt',
    install: 'yay -S --noconfirm %s',
    remove: 'yay -Rns --noconfirm %s',
    status: 'yay -Q %s',
  },
];

// Alpine
const alpinePackages: PackageManager[] = [
  {
    name: 'apk',
    fileList: 'apk.txt',
    install: 'sudo apk add %s',
    remove: 'sudo apk del %s',
    status: 'apk info -e %s',
  },
];

/* Not handled yet

// openSUSE / SLES
const susePackages: PackageManager[] = [
  {
    name: 'zypper',
    fileList: './packages/zypper.txt',
    install: 'sudo zypper install -y %s',
    remove: 'sudo zypper remove -y %s',
    status: 'zypper se -i %s',
  },
];

// Gentoo
const gentooPackages: PackageManager[] = [
  {
    name: 'emerge',
    fileList: './packages/emerge.txt',
    install: 'sudo emerge %s',
    remove: 'sudo emerge -C %s',
    status: 'equery list %s',
  },
];

// Void
const voidPackages: PackageManager[] = [
  {
    name: 'xbps',
    fileList: './packages/xbps.txt',
    install: 'sudo xbps-install -y %s',
    remove: 'sudo xbps-remove -y %s',
    status: 'xbps-query -l | grep %s',
  },
];

// NixOS
const nixosPackages: PackageManager[] = [
  {
    name: 'nix',
    fileList: './packages/nix.txt',
    install: 'nix-env -iA nixpkgs.%s',
    remove: 'nix-env -e %s',
    status: 'nix-env -q %s',
  },
];

// Slackware
const slackwarePackages: PackageManager[] = [
  {
    name: 'slackpkg',
    fileList: './packages/slackpkg.txt',
    install: 'sudo slackpkg install %s',
    remove: 'sudo slackpkg remove %s',
    status: 'ls /var/log/packages | grep %s',
  },
];

// Clear Linux
const clearLinuxPackages: PackageManager[] = [
  {
    name: 'swupd',
    fileList: './packages/swupd.txt',
    install: 'sudo swupd bundle-add %s',
    remove: 'sudo swupd bundle-remove %s',
    status: 'swupd bundle-list | grep %s',
  },
];

// Mageia
const mageiaPackages: PackageManager[] = [
  {
    name: 'urpmi',
    fileList: './packages/urpmi.txt',
    install: 'sudo urpmi %s',
    remove: 'sudo urpme %s',
    status: 'rpm -q %s',
  },
];

*/
