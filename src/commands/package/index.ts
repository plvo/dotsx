import { readdirSync } from 'node:fs';
import { select } from '@clack/prompts';
import { DOTFILE_PATH_DIRS } from '@/lib/constants';
import { DebianApt, DebianSnap } from './debian';

export async function handlePackage() {
  const availablePackages = readdirSync(DOTFILE_PATH_DIRS.CORE);

  console.log(`Available distro packages: ${availablePackages.join(', ')}`);

  const selectedDistro = await select({
    message: 'Which distro do you want to use?',
    options: availablePackages.map((distro) => ({
      value: distro,
      label: distro,
    })),
  });

  if (selectedDistro === 'debian') {
    const selectedInstaller = await select({
      message: 'Which installer do you want to use?',
      options: [
        { value: 'apt', label: 'APT' },
        { value: 'snap', label: 'Snap' },
      ],
    });

    if (selectedInstaller === 'apt') {
      await DebianApt.command();
    } else if (selectedInstaller === 'snap') {
      await DebianSnap.command();
    }
  }
}
