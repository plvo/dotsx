#!/usr/bin/env bun

import { intro, select } from '@clack/prompts';
import { BinCommand } from './commands/bin';
import { handleInit } from './commands/init';
import { LinkCommand } from './commands/link';
import { handlePackage } from './commands/package';
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
    await handleInit();
  } else if (action === 'package') {
    await handlePackage();
  } else if (action === 'link') {
    await LinkCommand.execute();
  } else if (action === 'bin') {
    await BinCommand.execute();
  }
}

main().catch(console.error);
