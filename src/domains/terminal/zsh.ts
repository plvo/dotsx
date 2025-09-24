import { execSync } from 'node:child_process';
import { FileLib } from '@/lib/file';

interface ZshDomain {
  rcContent: string;
  initRcFile: (rcFile: string) => void;
}

export const ZshDomain: Domain & ZshDomain & any = {
  type: 'terminal',
  availableOs: ['debian', 'macos'],
  pathToSearch: {
    debian: ['~/.zshrc'],
    macos: ['~/.zshrc'],
  },

  initRcFile: () => {
    const curl = execSync(`which curl`).toString();
    if (curl) {
      execSync(`sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"`);
    } else {
      const wget = execSync(`which wget`).toString();
      if (wget) {
        execSync(`sh -c "$(wget https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh -O -)"`);
      } else {
        console.error('curl and wget are not installed');
      }
    }
  },
};
