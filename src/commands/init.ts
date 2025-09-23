import { resolve } from 'node:path';
import { multiselect, select } from '@clack/prompts';
import { DOTX_DIR, DOTX_PATH } from '@/lib/constants';
import { FileLib } from '@/lib/file';

export async function handleInit() {
  console.log('\n🔧 Dotfiles Initialization');

  const os = await select({
    message: 'What is your operating system?',
    options: [{ value: 'debian', label: 'Debian' }],
  });

  const terminals = await multiselect({
    message: 'What terminals do you want to initialize?',
    options: [
      { value: '.zshrc', label: 'Zsh' },
      { value: '.bashrc', label: 'Bash' },
      { value: '.tmux.conf', label: 'Tmux' },
    ],
  });

  const ides = await multiselect({
    message: 'What IDEs do you want to initialize?',
    options: [
      { value: 'cursor', label: 'Cursor' },
      { value: 'vscode', label: 'Vscode' },
    ],
  });

  for (const directory of Object.values(DOTX_DIR)) {
    if (!FileLib.isDirectory(directory)) {
      FileLib.createDirectory(directory);
    }
  }

  if (typeof os === 'string') {
    const targetPath = resolve(DOTX_DIR.CORE, os);
    const templateDir = resolve(process.cwd(), `templates/core/${os}`);

    if (!FileLib.isDirectory(targetPath)) {
      FileLib.copyDirectory(templateDir, targetPath);
    } else {
      console.log(`✅ Directory already exists: ${targetPath}`);
    }
  }

  if (Array.isArray(terminals)) {
    if (!FileLib.isDirectory(DOTX_DIR.TERMINAL)) {
      FileLib.createDirectory(DOTX_DIR.TERMINAL);
    }

    for (const terminal of terminals) {
      const targetPath = resolve(DOTX_DIR.TERMINAL, terminal);
      const templateFile = resolve(process.cwd(), `templates/terminal/${terminal}`);

      if (!FileLib.isFile(targetPath)) {
        FileLib.copyFile(templateFile, targetPath);
        FileLib.writeToEndOfFile(targetPath, `source ~/.dotsx/bin/_dotsx-bin.aliases`);
      } else {
        console.log(`✅ File already exists: ${targetPath}`);
      }
    }
  }

  if (Array.isArray(ides)) {
    for (const ide of ides) {
      const targetPath = resolve(DOTX_DIR.IDE, ide);
      const templateDir = resolve(process.cwd(), `templates/ide/${ide}`);

      if (!FileLib.isDirectory(targetPath)) {
        FileLib.copyDirectory(templateDir, targetPath);
      } else {
        console.log(`✅ Directory already exists: ${targetPath}`);
      }
    }
  }

  try {
    console.log(`\n🎉 Dotfiles initialized in: ${DOTX_PATH}`);
  } catch (error) {
    console.error(`❌ Error during initialization: ${String(error)}`);
  }
}
