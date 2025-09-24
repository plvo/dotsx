import { DOTSX } from '@/lib/constants';
import type { Domain } from '@/types';

export const debianDomain: Domain = {
  name: 'debian',
  type: 'os',
  availableOs: ['debian'],
  pathToSearch: {
    debian: ['/etc/apt/', '/usr/bin/', '/snap/'],
    macos: [],
  },
  packageManagers: {
    apt: {
      packages: DOTSX.OS.DEBIAN.APT,
      install: 'sudo apt install -y',
      remove: 'sudo apt remove -y',
      status: 'dpkg -l | grep "^ii" | grep -w " %s "',
    },
    snap: {
      packages: DOTSX.OS.DEBIAN.SNAP,
      install: 'sudo snap install',
      remove: 'sudo snap remove',
      status: 'snap list | grep -w "%s "',
    },
  },
};
