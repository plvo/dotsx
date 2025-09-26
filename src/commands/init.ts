import { resolve } from 'node:path';
import { log, multiselect, type Option } from '@clack/prompts';
import { getDomainByDistro, getDomainByName, getDomainsByType } from '@/domains';
import { DOTSX, DOTSX_PATH } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';
import type { Domain, Family } from '@/types';

export const initCommand = {
  async execute() {
    try {
      const osInfo = SystemLib.getOsInfo();

      log.info(`🖥️  Initializing on a ${osInfo.family} ${osInfo.distro} ${osInfo.release} system...`);

      const availableTerminalDomains = getDomainsByType('terminal');
      const terminals = await multiselect({
        message: 'What terminals do you want to initialize?',
        required: false,
        options: availableTerminalDomains.map((domain) => ({
          value: domain.name,
          label: domain.name.charAt(0).toUpperCase() + domain.name.slice(1),
          hint: domain.symlinkPaths?.[osInfo.family]?.join(', '),
        })) satisfies Option<string>[],
      });

      const availableIdeDomains = getDomainsByType('ide');
      const ides = await multiselect({
        message: 'What IDEs do you want to initialize?',
        required: false,
        options: availableIdeDomains.map((domain) => ({
          value: domain.name,
          label: domain.name.charAt(0).toUpperCase() + domain.name.slice(1),
          hint: domain.symlinkPaths?.[osInfo.family]?.join(', '),
        })) satisfies Option<string>[],
      });

      if (osInfo.distro) {
        const osDomain = getDomainByDistro(osInfo.distro) || getDomainByName(osInfo.family);
        if (osDomain) {
          await this.initOs(osDomain);
        }
      } else {
        log.error(`No OS domain found for ${osInfo.family}`);
      }

      if (Array.isArray(terminals)) {
        for (const terminalName of terminals) {
          const domain = getDomainByName(terminalName);
          if (domain) {
            await this.initTerminal(domain, osInfo.family);
          }
        }
      }

      if (Array.isArray(ides)) {
        for (const ideName of ides) {
          const domain = getDomainByName(ideName);
          if (domain) {
            await this.importIdeConfigs(domain, osInfo.family);
          }
        }
      }

      if (!FileLib.isDirectory(DOTSX.BIN.PATH)) {
        FileLib.createDirectory(DOTSX.BIN.PATH);
        FileLib.createFile(DOTSX.BIN.ALIAS);
        log.success(`Bin directory created: ${DOTSX.BIN.PATH}`);
      } else {
        log.success(`Bin directory already exists: ${DOTSX.BIN.PATH}`);
      }

      log.success(`🎉 Initialized in: ${DOTSX_PATH}`);
    } catch (error) {
      log.error(`Error during initialization: ${String(error)}`);
    }
  },

  getDotfilesPath(domain: Domain, symlinkPath: string): string {
    const fileName = symlinkPath.split('/').pop() || '';
    return resolve(DOTSX.IDE.PATH, domain.name, fileName);
  },

  async initOs(domain: Domain) {
    if (!domain.packageManagers) {
      log.error(`No package managers defined for ${domain.name}`);
      return;
    }

    log.info(`📦 Initializing ${domain.name} package management...`);

    const osDirPath = resolve(DOTSX.OS.PATH, domain.name);
    FileLib.createDirectory(osDirPath);

    for (const config of Object.values(domain.packageManagers)) {
      const { configPath, defaultContent } = config;

      if (!FileLib.isPathExists(configPath)) {
        FileLib.createFile(configPath, defaultContent);
        log.success(`Created: ${FileLib.getDisplayPath(configPath)}`);
      } else {
        log.success(`Already exists: ${FileLib.getDisplayPath(configPath)}`);
      }
    }
  },

  async initTerminal(domain: Domain, currentOs: Family) {
    if (!domain.symlinkPaths?.[currentOs]) {
      log.error(`No symlink paths for ${domain.name} on ${currentOs}`);
      return;
    }

    log.info(`🖥️  Initializing ${domain.name} terminal...`);

    const imported: { systemPath: string; dotsxPath: string }[] = [];
    const notFound: string[] = [];

    for (const symlinkPath of domain.symlinkPaths[currentOs]) {
      const systemPath = FileLib.expandPath(symlinkPath);
      const fileName = symlinkPath.split('/').pop() || '';
      const dotsxPath = resolve(DOTSX.TERMINAL.PATH, fileName);

      if (FileLib.isPathExists(systemPath)) {
        FileLib.safeSymlink(systemPath, dotsxPath);
        imported.push({ systemPath: FileLib.getDisplayPath(systemPath), dotsxPath: FileLib.getDisplayPath(dotsxPath) });
      } else {
        notFound.push(FileLib.getDisplayPath(systemPath));
      }
    }

    imported.length > 0 && log.success(`Synced:\n${imported.map(({ systemPath, dotsxPath }) => `${systemPath} <-> ${dotsxPath}`).join('\n')}`);
    notFound.length > 0 && log.warning(`Ignored because not found:\n${notFound.join('\n')}`);
  },

  async importIdeConfigs(domain: Domain, currentOs: Family) {
    if (!domain.symlinkPaths?.[currentOs]) {
      log.error(`No symlink paths defined for ${domain.name} on ${currentOs}`);
      return;
    }

    log.info(`📁 Importing ${domain.name} configurations...`);

    const imported: { systemPath: string; dotsxPath: string }[] = [];
    const notFound: string[] = [];

    for (const symlinkPath of domain.symlinkPaths[currentOs]) {
      const systemPath = FileLib.expandPath(symlinkPath);

      if (FileLib.isPathExists(systemPath)) {
        const dotsxPath = this.getDotfilesPath(domain, symlinkPath);

        FileLib.safeSymlink(systemPath, dotsxPath);

        imported.push({ systemPath: FileLib.getDisplayPath(systemPath), dotsxPath: FileLib.getDisplayPath(dotsxPath) });
      } else {
        notFound.push(FileLib.getDisplayPath(systemPath));
      }
    }

    imported.length > 0 && log.success(`Synced:\n${imported.map(({ systemPath, dotsxPath }) => `${systemPath} <-> ${dotsxPath}`).join('\n')}`);
    notFound.length > 0 && log.warning(`Ignored because not found:\n${notFound.join('\n')}`);
  },
};
