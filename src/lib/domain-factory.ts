import path from 'node:path';
import { log, multiselect, select } from '@clack/prompts';
import { getDomainByName, getDomainsByType } from '@/domains';
import { ConsoleLib } from '@/lib/console';
import { FileLib } from '@/lib/file';
import { DotsxInfoLib, SystemLib } from '@/lib/system';
import type { Domain, DomainType, Family } from '@/types';

interface DomainCommandConfig {
  type: DomainType;
  basePath: string;
  icon: string;
  displayName: string;
}

export const createDomainCommand = (config: DomainCommandConfig) => ({
  async execute() {
    await this.showDashboard();

    const osInfo = SystemLib.getOsInfo();
    const domains = getDomainsByType(config.type);
    const processableDomains = domains.filter((domain) => {
      const status = ConsoleLib.getConfigStatus(domain, osInfo.family, config.basePath);
      return status.status === 'not_imported' || status.status === 'partially_imported';
    });

    if (processableDomains.length === 0) {
      log.success(`All compatible ${config.displayName}s are fully imported! 🎉`);
      return;
    }

    const selectedDomain = await select({
      message: `Which ${config.displayName} would you like to configure? (${processableDomains.length} need attention)`,
      options: processableDomains.map((domain) => {
        const status = ConsoleLib.getConfigStatus(domain, osInfo.family, config.basePath);
        const hint = ConsoleLib.getHint(status, osInfo);

        return { value: domain.name, label: domain.name, hint };
      }),
    });

    const domain = getDomainByName(selectedDomain as string);
    if (domain) {
      await this.manageDomainConfig(domain, osInfo.family);
    }
  },

  async showDashboard() {
    const osInfo = SystemLib.getOsInfo();
    const domains = getDomainsByType(config.type);

    for (const domain of domains) {
      const status = ConsoleLib.getConfigStatus(domain, osInfo.family, config.basePath);
      const statusText = ConsoleLib.getHint(status, osInfo);

      ConsoleLib.showConfigStatus(domain, status, statusText);
    }
  },

  async manageDomainConfig(domain: Domain, currentOs: Family) {
    if (!domain.symlinkPaths?.[currentOs]) {
      log.error(`No symlink paths defined for ${domain.name} on ${currentOs}`);
      return;
    }

    log.info(`Managing ${domain.name} configuration:`);

    const options: { value: string; label: string; hint: string }[] = [];

    for (const symlinkPath of domain.symlinkPaths[currentOs]) {
      const dotsxPath = DotsxInfoLib.getDotsxPath(domain, symlinkPath, config.basePath);
      const isImported = FileLib.isPathExists(dotsxPath);

      if (isImported) {
        continue;
      }

      const fileName = path.basename(symlinkPath);

      options.push({
        value: symlinkPath,
        label: fileName,
        hint: symlinkPath,
      });
    }

    if (options.length === 0) {
      log.success(`All ${domain.name} files are already imported!`);
      return;
    }

    const action = await multiselect({
      message: 'What missing files would you like to import?',
      options,
      initialValues: options.map((option) => option.value),
    });

    if (!Array.isArray(action) || action.length === 0) {
      log.error('No files selected');
      return;
    }

    log.info('Importing files...');

    for (const symlinkPath of action) {
      const systemPath = FileLib.expandPath(symlinkPath);
      const dotsxPath = DotsxInfoLib.getDotsxPath(domain, symlinkPath, config.basePath);
      if (FileLib.isPathExists(systemPath)) {
        FileLib.safeSymlink(systemPath, dotsxPath);
        log.step(`${FileLib.getDisplayPath(systemPath)} <-> ${FileLib.getDisplayPath(dotsxPath)}`);
      } else {
        log.error(`${symlinkPath} not found at ${FileLib.getDisplayPath(systemPath)}`);
      }
    }

    log.success(`Imported ${action.length} files`);
  },
});
