#!/usr/bin/env bun

import { intro, select } from '@clack/prompts';
import { binCommand } from './commands/bin';
import { initCommand } from './commands/init';
import { linkCommand } from './commands/link';
import { packageCommand } from './commands/package';
import { ConsoleLib } from './lib/console';
import { DotsxInfoLib } from './lib/system';

async function main() {
  intro('🚀 DotsX CLI');

  ConsoleLib.displayInfo();

  const isInitialized = DotsxInfoLib.isInitialized();

  if (!isInitialized) {
    const action = await select({
      message: 'Welcome to DotsX CLI! How do you want to initialize?',
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
        }
      ],
    });

    if (action === 'scratch') {
      await initCommand.execute();
    }
  } else {
    const action = await select({
      message: 'Welcome back! What do you want to do?',
      options: [
        { value: 'package', label: '📦 Manage packages' },
        { value: 'link', label: '📋 Link files' },
        { value: 'bin', label: '⚡ Manage bin scripts' },
        { value: 'exit', label: '👋 Exit' },
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
