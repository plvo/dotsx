#!/usr/bin/env bun

import { intro, select } from '@clack/prompts';
import { binCommand } from './commands/bin';
import { gitCommand } from './commands/git';
import { gitCloneCommand } from './commands/git-clone';
import { initCommand } from './commands/init';
import { packageCommand } from './commands/os';
import { recoverCommand } from './commands/recover';
import { repairCommand } from './commands/repair';
import { symlinkCommand } from './commands/symlink';
import { ConsoleLib } from './lib/console';
import { DOTSX } from './lib/constants';
import { createDomainCommand } from './lib/domain-factory';
import { DotsxInfoLib, SystemLib } from './lib/system';

const ideCommand = createDomainCommand({
  type: 'ide',
  basePath: DOTSX.IDE.PATH,
  icon: '🚀',
  displayName: 'IDE',
});

const terminalCommand = createDomainCommand({
  type: 'terminal',
  basePath: DOTSX.TERMINAL.PATH,
  icon: '🖥️',
  displayName: 'terminal',
});

async function main() {
  intro('🚀 DotsX CLI');

  const osInfo = SystemLib.getOsInfo();
  await ConsoleLib.displayInfo();

  const {
    isInitialized,
    isAllInitialized,
    hasBackups,
    isBinInitialized,
    isIdeInitialized,
    isOsInitialized,
    isTerminalInitialized,
  } = DotsxInfoLib.getDotsxState();

  if (!isInitialized) {
    const options = [
      {
        value: 'scratch',
        label: '🌱 From scratch',
        hint: 'Create a new ~/.dotsx directory with all the configurations',
      },
      {
        value: 'git',
        label: '🔧 From Git',
        hint: 'Clone a git repository into ~/.dotsx, git must be configured',
      },
    ];

    if (hasBackups) {
      options.unshift({
        value: 'recover',
        label: '🔄 Recover from backups',
        hint: 'Restore files from ~/.backup.dotsx (RECOMMENDED)',
      });
    }

    const action = await select({
      message: 'Welcome to DotsX! How do you want to initialize your configuration?',
      options,
    });

    if (action === 'scratch') {
      await initCommand.execute();
    } else if (action === 'git') {
      await gitCloneCommand.execute();
    } else if (action === 'recover') {
      await recoverCommand.execute();
    }
  } else {
    const options = [
      { value: 'symlink', label: '📋 Symlinks', hint: 'Create symlinks for files and directories' },
      { value: 'git', label: '🔧 Git', hint: 'Manage Git repository and synchronization' },
    ];

    if (!isAllInitialized) {
      options.push({ value: 'repair', label: '🔄 Repair', hint: 'Repair DotsX configuration' });
    }
    if (hasBackups) {
      options.push({ value: 'recover', label: '🗄️  Recover', hint: 'Restore files from backups' });
    }
    if (isOsInitialized) {
      options.push({
        value: 'pkg',
        label: `📦 ${osInfo.distro || osInfo.family} packages`,
        hint: 'Install, remove, and manage packages',
      });
    }
    if (isBinInitialized) {
      options.push({ value: 'bin', label: "🚀 Bin's scripts", hint: 'Manage bin scripts and aliases' });
    }
    if (isIdeInitialized) {
      options.push({ value: 'ide', label: '💻 IDE configs', hint: 'Manage your IDEs settings' });
    }
    if (isTerminalInitialized) {
      options.push({ value: 'terminal', label: '🖥️  Terminal configs', hint: 'Manage your terminal configurations' });
    }

    const action = await select({ message: 'Welcome!', options });

    if (action === 'pkg') {
      await packageCommand.execute();
    } else if (action === 'symlink') {
      await symlinkCommand.execute();
    } else if (action === 'recover') {
      await recoverCommand.execute();
    } else if (action === 'repair') {
      await repairCommand.execute();
    } else if (action === 'bin') {
      await binCommand.execute();
    } else if (action === 'terminal') {
      await terminalCommand.execute();
    } else if (action === 'ide') {
      await ideCommand.execute();
    } else if (action === 'git') {
      await gitCommand.execute();
    }
  }
}

main().catch(console.error);
