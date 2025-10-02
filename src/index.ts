// #!/usr/bin/env bun

import path from 'node:path';
import { intro, isCancel, outro, select } from '@clack/prompts';
import { binCommand } from './commands/bin';
import { doctorCommand } from './commands/doctor';
import { gitCommand } from './commands/git';
import { gitCloneCommand } from './commands/git-clone';
import { initCommand } from './commands/init';
import { packageCommand } from './commands/packages';
import { symlinkCommand } from './commands/symlink';
import { ConsoleLib } from './lib/console';
import { resolveDotsxOsPath } from './lib/constants';
import { FileLib } from './lib/file';
import { SystemLib } from './lib/system';

async function main() {
  intro('🚀 DotsX CLI');

  const osInfo = SystemLib.getOsInfo();
  const dotsxPath = resolveDotsxOsPath(osInfo.distro || osInfo.family);
  const isInitialized = FileLib.isExists(dotsxPath.baseOs);

  await ConsoleLib.printSystemInfo();
  await ConsoleLib.printGitInfo();

  if (!isInitialized) {
    const action = await select({
      message: 'Welcome to DotsX! How do you want to initialize your configuration?',
      options: [
        { value: 'scratch', label: '🌱 From scratch', hint: 'Create a new ~/.dotsx directory' },
        { value: 'git', label: '🔧 From Git', hint: 'Clone a git repository into ~/.dotsx, `git` must be configured' },
      ],
    });

    if (isCancel(action)) {
      return outro('👋 See you next time!');
    }

    if (action === 'scratch') {
      await initCommand.execute(dotsxPath);
    } else if (action === 'git') {
      await gitCloneCommand.execute();
    }
  } else {
    const action = await select({
      message: 'Welcome!',
      options: [
        { value: 'symlink', label: '📋 Symlinks', hint: 'Create symlinks for files and directories' },
        { value: 'git', label: '🔧 Git', hint: 'Manage Git repository and synchronization' },
        { value: 'doctor', label: '🩺 Doctor', hint: 'Run full diagnostics and show all configurations' },
        { value: 'recover', label: '🗄️ Recover', hint: 'Restore files from backups' },
        { value: 'bin', label: "🚀 Bin's scripts", hint: 'Manage bin scripts and aliases' },
        { value: 'pkg', label: `📦 ${path.basename(dotsxPath.baseOs)} packages`, hint: 'Install, remove packages' },
      ],
    });

    if (isCancel(action)) {
      return outro('👋 See you next time!');
    }

    if (action === 'doctor') await doctorCommand.execute(dotsxPath);
    else if (action === 'symlink') await symlinkCommand.execute(dotsxPath);
    else if (action === 'bin') await binCommand.execute(dotsxPath);
    else if (action === 'pkg') await packageCommand.execute(osInfo.distro || osInfo.family, dotsxPath.packagesManager);
    else if (action === 'git') await gitCommand.execute(dotsxPath);
  }
}

main().catch(console.error);
