#!/usr/bin/env bun

import { intro, select } from '@clack/prompts';
import { binCommand } from './commands/bin';
import { initCommand } from './commands/init';
import { linkCommand } from './commands/link';
import { packageCommand } from './commands/package';
import { SystemLib } from './lib/system';

async function main() {
  intro('🚀 DotsX CLI');

  SystemLib.displayInfo();

  const isInitialized = SystemLib.isInitialized();

  console.log(isInitialized ? '✅ DotsX initialized' : '❌ DotsX not initialized');

  const action = await select({
    message: 'What do you want to do?',
    options: [
      { value: 'init', label: '🔧 Initialize ~/.dotsx' },
      ...(isInitialized
        ? [
            { value: 'package', label: '📦 Manage packages' },
            { value: 'link', label: '📋 Link files' },
            { value: 'bin', label: '⚡ Manage bin scripts' },
            { value: 'exit', label: '👋 Exit' },
          ]
        : []),
    ],
  });

  if (action === 'init') {
    await initCommand.execute();
  } else if (action === 'package') {
    await packageCommand.execute();
  } else if (action === 'link') {
    await linkCommand.execute();
  } else if (action === 'bin') {
    await binCommand.execute();
  }
}

main().catch(console.error);
