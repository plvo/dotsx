#!/usr/bin/env bun

import { intro, select } from '@clack/prompts';
import { binCommand } from './commands/bin';
import { initCommand } from './commands/init';
import { linkCommand } from './commands/link';
import { packageCommand } from './commands/package';
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
        { value: 'link', label: '📋 Symlinks', hint: 'Create symlinks for files and directories' },
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
    } else if (action === 'bin') {
      await binCommand.execute();
    } else if (action === 'terminal') {
      await terminalCommand.execute();
    } else if (action === 'ide') {
      await ideCommand.execute();
    }
  }
}

main().catch(console.error);
