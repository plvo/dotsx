import { resolve } from 'node:path';
import { confirm, multiselect, select } from '@clack/prompts';
import { DOTSX, DOTSX_PATH, REGISTRY_DIR } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';
import { getDomainsByType, getDomainByName } from '@/domains';
import type { Domain, OsType } from '@/types';

export const initCommand = {
  async execute() {
    const isInitialized = SystemLib.isInitialized();
    console.log(isInitialized ? `✅ DotX initialized on ${DOTSX_PATH}` : '❌ DotX not initialized');

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
          message: `Your existing config in ${DOTSX_PATH} will be backed up in ${DOTSX_PATH}.backup, are you sure you want to continue?`,
          initialValue: false,
        });

        if (confirmSetupFromScratch) {
          FileLib.copyDirectory(DOTSX_PATH, `${DOTSX_PATH}.backup`);
          console.log(`✅ Backup created: ${DOTSX_PATH}.backup`);
          FileLib.deleteDirectory(DOTSX_PATH);
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

    const availableIdeDomains = getDomainsByType('ide');
    const ides = await multiselect({
      message: 'What IDEs do you want to initialize?',
      options: availableIdeDomains.map(domain => ({
        value: domain.name,
        label: domain.name.charAt(0).toUpperCase() + domain.name.slice(1),
      })),
    });

    FileLib.copyDirectory(REGISTRY_DIR.BIN, DOTSX.BIN.PATH);
    console.log(`✅ Bin directory copied to ${DOTSX.BIN}`);

    if (typeof os === 'string') {
      const targetPath = resolve(DOTSX.OS.PATH, os);
      const templateDir = resolve(REGISTRY_DIR.OS, os);

      if (!FileLib.isDirectory(targetPath)) {
        FileLib.copyDirectory(templateDir, targetPath);
      } else {
        console.log(`✅ Directory already exists: ${targetPath}`);
      }
    }

    if (Array.isArray(terminals)) {
      if (!FileLib.isDirectory(DOTSX.TERMINAL.PATH)) {
        FileLib.createDirectory(DOTSX.TERMINAL.PATH);
      }

      for (const terminal of terminals) {
        const targetPath = resolve(DOTSX.TERMINAL.PATH, terminal);
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
      const currentOs = SystemLib.getCurrentOsType();
      
      for (const ideName of ides) {
        const domain = getDomainByName(ideName);
        if (domain) {
          await this.importDomainConfigs(domain, currentOs);
        }
      }
    }

    try {
      console.log(`\n🎉 Dotfiles initialized in: ${DOTSX_PATH}`);
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

  async importDomainConfigs(domain: Domain, currentOs: OsType) {
    if (!domain.symlinkPaths?.[currentOs]) {
      console.log(`⚠️  No symlink paths defined for ${domain.name} on ${currentOs}`);
      return;
    }

    console.log(`\n📁 Importing ${domain.name} configurations...`);

    for (const symlinkPath of domain.symlinkPaths[currentOs]) {
      const systemPath = FileLib.expandPath(symlinkPath);
      
      if (FileLib.isPathExists(systemPath)) {
        const dotfilesPath = this.getDotfilesPath(domain, symlinkPath);
        
        // Ensure dotfiles directory exists
        const dotfilesDir = resolve(dotfilesPath, '..');
        FileLib.createDirectory(dotfilesDir);
        
        // Copy existing config to dotfiles
        if (FileLib.isDirectory(systemPath)) {
          FileLib.copyDirectory(systemPath, dotfilesPath);
        } else {
          FileLib.copyFile(systemPath, dotfilesPath);
        }
        
        // Create symlink from original location to dotfiles
        FileLib.safeSymlink(dotfilesPath, systemPath);
        console.log(`✅ Imported: ${FileLib.getDisplayPath(systemPath)}`);
      } else {
        console.log(`⚠️  Not found: ${FileLib.getDisplayPath(systemPath)}`);
      }
    }
  },

  getDotfilesPath(domain: Domain, symlinkPath: string): string {
    const fileName = symlinkPath.split('/').pop() || '';
    return resolve(DOTSX.IDE.PATH, domain.name, fileName);
  },
};
