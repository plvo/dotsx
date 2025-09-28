#!/usr/bin/env bun

import { intro, select } from '@clack/prompts';
import { binCommand } from './commands/bin';
import { initCommand } from './commands/init';
import { linkCommand } from './commands/link';
import { packageCommand } from './commands/package';
import { ConsoleLib } from './lib/console';
import { DotsxInfoLib, SystemLib } from './lib/system';

async function main() {
  intro('🚀 DotsX CLI');

  const osInfo = SystemLib.getOsInfo();
  ConsoleLib.displayInfo();

  const isInitialized = DotsxInfoLib.isInitialized();

  if (!isInitialized) {
    const action = await select({
      message: 'Welcome to DotsX! How do you want to initialize your configuration?',
      options: [
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
      ],
    });

    if (action === 'scratch') {
      await initCommand.execute();
    }
  } else {
    const action = await select({
      message: 'Welcome!',
      options: [
        {
          value: 'package',
          label: `📦 Manage ${osInfo.distro || osInfo.family} packages`,
          hint: 'Install, remove, and manage packages',
        },
        { value: 'link', label: '📋 Symlink', hint: 'Create symlinks for files and directories' },
        { value: 'bin', label: '⚡ Manage bin scripts', hint: 'Manage bin scripts and aliases' },
      ],
    });

    if (action === 'package') {
      await packageCommand.execute();
    } else if (action === 'link') {
      await linkCommand.execute();
    } else if (action === 'bin') {
      await binCommand.execute();
    }
  }
}

main().catch(console.error);
