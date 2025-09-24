import { resolve } from 'node:path';
import { confirm, multiselect, select } from '@clack/prompts';
import { DOTX_DIR, DOTX_PATH, REGISTRY_DIR } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';

export const initCommand = {
  async execute() {
    const isInitialized = SystemLib.isInitialized();
    console.log(isInitialized ? `✅ DotX initialized on ${DOTX_PATH}` : '❌ DotX not initialized');

    const selected = await select({
      message: 'What do you want to do?',
      options: [
        { value: 'fromScratch', label: 'From scratch' },
        { value: 'fromExisting', label: 'Check my files and setup' },
      ],
    });

    if (selected === 'fromScratch') {
      if (isInitialized) {
        const confirmSetupFromScratch = await confirm({
          message: `Your existing config in ${DOTX_PATH} will be backed up in ${DOTX_PATH}.backup, are you sure you want to continue?`,
          initialValue: false,
        });

        if (confirmSetupFromScratch) {
          FileLib.copyDirectory(DOTX_PATH, `${DOTX_PATH}.backup`);
          console.log(`✅ Backup created: ${DOTX_PATH}.backup`);
          FileLib.deleteDirectory(DOTX_PATH);
          await this.fromScratch();
        }
      } else {
        await this.fromScratch();
      }
    } else if (selected === 'fromExisting') {
      await this.fromExisting();
    }
  },

  async fromScratch() {
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

    FileLib.copyDirectory(REGISTRY_DIR.BIN, DOTX_DIR.BIN);
    console.log(`✅ Bin directory copied to ${DOTX_DIR.BIN}`);

    if (typeof os === 'string') {
      const targetPath = resolve(DOTX_DIR.OS, os);
      const templateDir = resolve(REGISTRY_DIR.OS, os);

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
        const templateFile = resolve(REGISTRY_DIR.TERMINAL, terminal);

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
        const templateDir = resolve(REGISTRY_DIR.IDE, ide);

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
  },

  async fromExisting() {
    console.log('\n🔍 Dotfiles Check');

    const files = await multiselect({
      message: 'What files do you want to check?',
      options: [
        { value: 'bin', label: 'Bin' },
        { value: 'os', label: 'OS' },
        { value: 'terminal', label: 'Terminal' },
        { value: 'ide', label: 'IDE' },
      ],
    });
  },
};
