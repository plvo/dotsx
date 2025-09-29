import { resolve } from 'node:path';
import { log, multiselect, select } from '@clack/prompts';
import { getDomainByName, getDomainsByType } from '@/domains';
import { DOTSX } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';
import type { Domain, Family } from '@/types';

export const ideCommand = {
  async execute() {
    await this.showDashboard();

    const osInfo = SystemLib.getOsInfo();
    const ideDomains = getDomainsByType('ide');
    const processableIdes = ideDomains.filter((domain) => {
      const status = this.getIdeStatus(domain, osInfo.family);
      return status.status === 'not_imported' || status.status === 'partially_imported';
    });

    if (processableIdes.length === 0) {
      log.success('All compatible IDEs are fully imported! 🎉');
      return;
    }

    const selectedIde = await select({
      message: `Which IDE would you like to configure? (${processableIdes.length} need attention)`,
      options: processableIdes.map((domain) => {
        const status = this.getIdeStatus(domain, osInfo.family);
        let hint = '';

        if (status.status === 'partially_imported') {
          hint = `⚠️ Partially imported (${status.importedFiles}/${status.totalFiles} files)`;
        } else {
          hint = `⚪ Not imported (0/${status.totalFiles} files)`;
        }

        return { value: domain.name, label: domain.name, hint };
      }),
    });

    const domain = getDomainByName(selectedIde as string);
    if (domain) {
      await this.manageIdeConfig(domain, osInfo.family);
    }
  },

  async showDashboard() {
    const osInfo = SystemLib.getOsInfo();
    const ideDomains = getDomainsByType('ide');

    log.info('🚀 IDE Configuration Dashboard\n');

    for (const domain of ideDomains) {
      const status = this.getIdeStatus(domain, osInfo.family);
      let statusText = '';

      switch (status.status) {
        case 'fully_imported':
          statusText = `🔗 Fully imported (${status.importedFiles}/${status.totalFiles} files)`;
          break;
        case 'partially_imported':
          statusText = `⚠️ Partially imported (${status.importedFiles}/${status.totalFiles} files)`;
          break;
        case 'not_imported':
          statusText = `⚪ Not imported (0/${status.totalFiles} files)`;
          break;
        case 'incompatible':
          statusText = `❌ Not compatible with ${osInfo.family}`;
          break;
      }

      log.info(
        `${domain.name} - ${statusText}\n${status.importedPaths.map((path) => `   📁 ${path}\n`)} 
        ${status.missingPaths.map((path) => `   ❌ ${path}\n`)}`,
      );
    }
  },

  getIdeStatus(
    domain: Domain,
    currentOs: Family,
  ): {
    status: 'fully_imported' | 'partially_imported' | 'not_imported' | 'incompatible';
    importedPaths: string[];
    missingPaths: string[];
    totalFiles: number;
    importedFiles: number;
  } {
    if (!domain.symlinkPaths?.[currentOs]) {
      return {
        status: 'incompatible',
        importedPaths: [],
        missingPaths: [],
        totalFiles: 0,
        importedFiles: 0,
      };
    }

    const importedPaths: string[] = [];
    const missingPaths: string[] = [];

    for (const symlinkPath of domain.symlinkPaths[currentOs]) {
      const dotsxPath = this.getDotfilesPath(domain, symlinkPath);

      if (FileLib.isPathExists(dotsxPath)) {
        importedPaths.push(FileLib.getDisplayPath(dotsxPath));
      } else {
        missingPaths.push(FileLib.getDisplayPath(dotsxPath));
      }
    }

    const totalFiles = domain.symlinkPaths[currentOs].length;
    const importedFiles = importedPaths.length;

    let status: 'fully_imported' | 'partially_imported' | 'not_imported';
    if (importedFiles === 0) {
      status = 'not_imported';
    } else if (importedFiles === totalFiles) {
      status = 'fully_imported';
    } else {
      status = 'partially_imported';
    }

    return {
      status,
      importedPaths,
      missingPaths,
      totalFiles,
      importedFiles,
    };
  },

  async manageIdeConfig(domain: Domain, currentOs: Family) {
    if (!domain.symlinkPaths?.[currentOs]) {
      log.error(`No symlink paths defined for ${domain.name} on ${currentOs}`);
      return;
    }

    log.info(`Managing ${domain.name} configuration:`);

    const options: { value: string; label: string; hint: string }[] = [];

    for (const symlinkPath of domain.symlinkPaths[currentOs]) {
      const dotsxPath = this.getDotfilesPath(domain, symlinkPath);
      const isImported = FileLib.isPathExists(dotsxPath);

      if (isImported) {
        continue;
      }

      const fileName = symlinkPath.split('/').pop() || symlinkPath;

      options.push({
        value: symlinkPath,
        label: fileName,
        hint: symlinkPath,
      });
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
      const dotsxPath = this.getDotfilesPath(domain, symlinkPath);
      if (FileLib.isPathExists(systemPath)) {
        FileLib.safeSymlink(systemPath, dotsxPath);
        log.step(`${FileLib.getDisplayPath(systemPath)} <-> ${FileLib.getDisplayPath(dotsxPath)}`);
      } else {
        log.error(`${symlinkPath} not found at ${FileLib.getDisplayPath(systemPath)}`);
      }
    }

    log.success(`Imported ${action.length} files`);
  },

  getDotfilesPath(domain: Domain, symlinkPath: string): string {
    const fileName = symlinkPath.split('/').pop() || '';
    return resolve(DOTSX.IDE.PATH, domain.name, fileName);
  },
};
