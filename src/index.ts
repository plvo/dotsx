#!/usr/bin/env bun

import { intro, log, select } from '@clack/prompts';
import { binCommand } from './commands/bin';
import { gitCommand } from './commands/git';
import { gitInitCommand } from './commands/git-init';
import { initCommand } from './commands/init';
import { linkCommand } from './commands/link';
import { packageCommand } from './commands/package';
import { recoverCommand } from './commands/recover';
import { ConsoleLib } from './lib/console';
import { BACKUP_PATH, DOTSX } from './lib/constants';
import { createDomainCommand } from './lib/domain-factory';
import { FileLib } from './lib/file';
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

  const isInitialized = DotsxInfoLib.isInitialized();

  if (!isInitialized) {
    // Check if backups exist
    const hasBackups = FileLib.isDirectory(BACKUP_PATH) && FileLib.readDirectory(BACKUP_PATH).length > 0;

    if (hasBackups) {
      log.warn('⚠️  Backups detected in ~/.backup.dotsx');
      log.info('You can recover your previous configuration');
    }

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
      await gitInitCommand.execute();
    } else if (action === 'recover') {
      await recoverCommand.execute();
    }
  } else {
    const action = await select({
      message: 'Welcome!',
      options: [
        { value: 'link', label: '📋 Symlinks', hint: 'Create symlinks for files and directories' },
        { value: 'recover', label: '🔄 Recover', hint: 'Restore files from backups' },
        { value: 'git', label: '🔧 Git', hint: 'Manage Git repository and synchronization' },
        {
          value: 'package',
          label: `📦 ${osInfo.distro || osInfo.family} packages`,
          hint: 'Install, remove, and manage packages',
        },
        { value: 'bin', label: "🚀 Bin's scripts", hint: 'Manage bin scripts and aliases' },
        { value: 'ide', label: '💻 IDE configs', hint: 'Manage your IDEs settings' },
        { value: 'terminal', label: '🖥️  Terminal configs', hint: 'Manage your terminal configurations' },
      ],
    });

    if (action === 'package') {
      await packageCommand.execute();
    } else if (action === 'link') {
      await linkCommand.execute();
    } else if (action === 'recover') {
      await recoverCommand.execute();
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
