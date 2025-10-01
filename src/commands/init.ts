import { resolve } from 'node:path';
import { log, multiselect, type Option } from '@clack/prompts';
import { FileLib } from '@/lib/file';
import { DotsxInfoLib, SystemLib } from '@/lib/system';
import { getDomainByDistro, getDomainByName, getDomainsByType } from '@/old';
import { DOTSX, DOTSX_PATH } from '@/old/constants';
import type { Domain, Family, OsInfo } from '@/types';

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

      await this.initOs(osInfo);

      if (Array.isArray(terminals)) {
        for (const terminalName of terminals) {
          const domain = getDomainByName(terminalName);
          if (domain) {
            await this.initDomainConfig(domain, osInfo.family, DOTSX.TERMINAL.PATH);
          }
        }
      }

      if (Array.isArray(ides)) {
        for (const ideName of ides) {
          const domain = getDomainByName(ideName);
          if (domain) {
            await this.initDomainConfig(domain, osInfo.family, DOTSX.IDE.PATH);
          }
        }
      }

      await this.initBin();
      await this.initSymlinks();

      log.success(`🎉 Initialized in: ${DOTSX_PATH}`);
    } catch (error) {
      log.error(`Error during initialization: ${String(error)}`);
    }
  },

  async initOs(osInfo: OsInfo) {
    const domain = osInfo.distro ? getDomainByDistro(osInfo.distro) : getDomainByName(osInfo.family);

    if (!domain) {
      log.error(`No OS domain found for ${osInfo.family}`);
      return;
    }

    if (!domain.packageManagers) {
      log.error(`No package managers defined for ${domain.name}`);
      return;
    }

    log.info(`📦 Configuring ${domain.name} package management...`);
    const created: string[] = [];

    const osDirPath = resolve(DOTSX.OS.PATH, domain.name);
    FileLib.createDirectory(osDirPath);

    for (const config of Object.values(domain.packageManagers)) {
      const { configPath, defaultContent } = config;

      if (!FileLib.isPathExists(configPath)) {
        FileLib.createFile(configPath, defaultContent);
        created.push(FileLib.getDisplayPath(configPath));
      } else {
        log.warn(`Already exists: ${FileLib.getDisplayPath(configPath)}`);
      }
    }

    created.length > 0 && log.success(`Created:\n${created.join('\n')}`);
  },

  async initDomainConfig(domain: Domain, currentOs: Family, basePath: string) {
    if (!domain.symlinkPaths?.[currentOs]) {
      log.error(`No symlink paths for ${domain.name} on ${currentOs}`);
      return;
    }

    log.info(`📁 Initializing ${domain.name} configurations...`);

    const imported: { systemPath: string; dotsxPath: string }[] = [];
    const notFound: string[] = [];

    for (const symlinkPath of domain.symlinkPaths[currentOs]) {
      const systemPath = FileLib.expandPath(symlinkPath);
      const dotsxPath = DotsxInfoLib.getDotsxPath(domain, symlinkPath, basePath);

      if (FileLib.isPathExists(systemPath)) {
        FileLib.safeSymlink(systemPath, dotsxPath);
        imported.push({ systemPath: FileLib.getDisplayPath(systemPath), dotsxPath: FileLib.getDisplayPath(dotsxPath) });
      } else {
        notFound.push(FileLib.getDisplayPath(systemPath));
      }
    }

    imported.length > 0 &&
      log.success(
        `Synced:\n${imported.map(({ systemPath, dotsxPath }) => `${systemPath} <-> ${dotsxPath}`).join('\n')}`,
      );
    notFound.length > 0 && log.warning(`Ignored because not found:\n${notFound.join('\n')}`);
  },

  async initBin() {
    if (!FileLib.isDirectory(DOTSX.BIN.PATH)) {
      FileLib.createDirectory(DOTSX.BIN.PATH);
      FileLib.createFile(DOTSX.BIN.ALIAS);
      log.success(`Bin directory created: ${DOTSX.BIN.PATH}`);
    } else {
      log.success(`Bin directory already exists: ${DOTSX.BIN.PATH}`);
    }
  },

  async initSymlinks() {
    if (!FileLib.isDirectory(DOTSX.SYMLINKS)) {
      FileLib.createDirectory(DOTSX.SYMLINKS);
      log.success(`Symlinks directory created: ${DOTSX.SYMLINKS}`);
    } else {
      log.success(`Symlinks directory already exists: ${DOTSX.SYMLINKS}`);
    }
  },
};
