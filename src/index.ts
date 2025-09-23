#!/usr/bin/env bun
import { intro, select } from '@clack/prompts';
import { handleBin } from './commands/bin';
import { handleInit } from './commands/init';
import { handleInstall } from './commands/install';
import { handleLink } from './commands/link';
import { SystemLib } from './lib/system';

async function main() {
  intro('🚀 Dotfiles CLI');

  SystemLib.displayInfo();

  const action = await select({
    message: 'What do you want to do?',
    options: [
      { value: 'init', label: '🔧 Initialize dotfiles' },
      { value: 'install', label: '📦 Install packages' },
      { value: 'link', label: '📋 Link files' },
      { value: 'bin', label: '⚡ Manage bin scripts' },
      { value: 'exit', label: '👋 Exit' },
    ],
  });

  if (action === 'init') {
    await handleInit();
  } else if (action === 'install') {
    await handleInstall();
  } else if (action === 'link') {
    await handleLink();
  } else if (action === 'bin') {
    await handleBin();
  }
}

main().catch(console.error);
