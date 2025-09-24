import { resolve } from 'node:path';
import { multiselect, type Option, select } from '@clack/prompts';
import { getDomainByName, getDomainsByType } from '@/domains';
import { DOTSX, DOTSX_PATH } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';
import type { Domain, OsType } from '@/types';

export const initCommand = {
  async execute() {
    const isInitialized = SystemLib.isInitialized();
    console.log(isInitialized ? `✅ DotX initialized on ${DOTSX_PATH}` : '❌ DotX not initialized');

    const os = await select({
      message: 'What is your operating system?',
      options: [{ value: 'debian', label: 'Debian' }],
    });

    const availableTerminalDomains = getDomainsByType('terminal');
    const terminals = await multiselect({
      message: 'What terminals do you want to initialize?',
      options: availableTerminalDomains.map((domain) => ({
        value: domain.name,
        label: domain.name.charAt(0).toUpperCase() + domain.name.slice(1),
        hint: domain.symlinkPaths?.[SystemLib.getCurrentOsType()].join(', '),
      })) satisfies Option<string>[],
    });

    const availableIdeDomains = getDomainsByType('ide');
    const ides = await multiselect({
      message: 'What IDEs do you want to initialize?',
      options: availableIdeDomains.map((domain) => ({
        value: domain.name,
        label: domain.name.charAt(0).toUpperCase() + domain.name.slice(1),
        hint: domain.symlinkPaths?.[SystemLib.getCurrentOsType()].join(', '),
      })) satisfies Option<string>[],
    });

    // Initialize bin directory
    if (!FileLib.isDirectory(DOTSX.BIN.PATH)) {
      FileLib.createDirectory(DOTSX.BIN.PATH);
      FileLib.createFile(DOTSX.BIN.ALIAS);
      console.log(`✅ Bin directory created: ${DOTSX.BIN.PATH}`);
    } else {
      console.log(`✅ Bin directory already exists: ${DOTSX.BIN.PATH}`);
    }

    // Initialize OS domain (create package files)
    if (typeof os === 'string') {
      const osDomain = getDomainByName(os);
      if (osDomain) {
        await this.initOs(osDomain);
      }
    }

    // Initialize terminal domains
    if (Array.isArray(terminals)) {
      const currentOs = SystemLib.getCurrentOsType();

      for (const terminalName of terminals) {
        const domain = getDomainByName(terminalName);
        if (domain) {
          await this.initTerminal(domain, currentOs);
        }
      }
    }

    if (Array.isArray(ides)) {
      const currentOs = SystemLib.getCurrentOsType();

      for (const ideName of ides) {
        const domain = getDomainByName(ideName);
        if (domain) {
          await this.importIdeConfigs(domain, currentOs);
        }
      }
    }

    try {
      console.log(`\n🎉 Initialized in: ${DOTSX_PATH}`);
    } catch (error) {
      console.error(`❌ Error during initialization: ${String(error)}`);
    }
  },

  getDotfilesPath(domain: Domain, symlinkPath: string): string {
    const fileName = symlinkPath.split('/').pop() || '';
    return resolve(DOTSX.IDE.PATH, domain.name, fileName);
  },

  async initOs(domain: Domain) {
    if (!domain.packageManagers) {
      console.log(`❌ No package managers defined for ${domain.name}`);
      return;
    }

    console.log(`\n📦 Initializing ${domain.name} package management...`);

    // Create OS directory
    const osDirPath = resolve(DOTSX.OS.PATH, domain.name);
    FileLib.createDirectory(osDirPath);

    // Create package files for each package manager
    for (const config of Object.values(domain.packageManagers)) {
      const { configPath, defaultContent } = config;

      if (!FileLib.isPathExists(configPath)) {
        FileLib.createFile(configPath, defaultContent);
        console.log(`✅ Created: ${FileLib.getDisplayPath(configPath)}`);
      } else {
        console.log(`✅ Already exists: ${FileLib.getDisplayPath(configPath)}`);
      }
    }
  },

  async initTerminal(domain: Domain, currentOs: OsType) {
    if (!domain.symlinkPaths?.[currentOs]) {
      console.log(`❌ No symlink paths for ${domain.name} on ${currentOs}`);
      return;
    }

    console.log(`\n🖥️ Initializing ${domain.name} terminal...`);

    for (const symlinkPath of domain.symlinkPaths[currentOs]) {
      const systemPath = FileLib.expandPath(symlinkPath);
      const fileName = symlinkPath.split('/').pop() || '';
      const dotfilesPath = resolve(DOTSX.TERMINAL.PATH, fileName);

      // Ensure dotfiles terminal directory exists
      FileLib.createDirectory(DOTSX.TERMINAL.PATH);

      if (FileLib.isPathExists(systemPath)) {
        FileLib.safeSymlink(systemPath, dotfilesPath);
      } else {
        console.log(`⚠️ File not found: ${FileLib.getDisplayPath(systemPath)} (ignoring)`);
      }
    }
  },

  async importIdeConfigs(domain: Domain, currentOs: OsType) {
    if (!domain.symlinkPaths?.[currentOs]) {
      console.log(`❌ No symlink paths defined for ${domain.name} on ${currentOs}`);
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

        // Move existing config to dotfiles (more efficient than copy + backup)
        if (FileLib.isDirectory(systemPath)) {
          FileLib.copyDirectory(systemPath, dotfilesPath);
        } else {
          FileLib.copyFile(systemPath, dotfilesPath);
        }

        FileLib.safeSymlink(systemPath, dotfilesPath);

        console.log(`✅ Imported: ${FileLib.getDisplayPath(systemPath)}`);
      } else {
        console.log(`⚠️ File not found: ${FileLib.getDisplayPath(systemPath)} (ignoring)`);
      }
    }
  },
};
