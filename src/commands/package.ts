import { execSync } from 'node:child_process';
import { log, multiselect, select } from '@clack/prompts';
import { getDomainByDistro, getDomainByName } from '@/domains';
import { ConsoleLib } from '@/lib/console';
import { FileLib } from '@/lib/file';
import { SystemLib } from '@/lib/system';
import type { Domain, PackageManagerConfig } from '@/types';

export const packageCommand = {
  async execute() {
    const osInfo = SystemLib.getOsInfo();

    if (osInfo.distro) {
      const domain = getDomainByDistro(osInfo.distro) || getDomainByName(osInfo.family);
      if (domain) {
        await this.handleDomain(domain);
      } else {
        log.error(`No domain found for ${osInfo.distro}`);
        return;
      }
    }
  },

  async handleDomain(domain: Domain) {
    if (!domain.packageManagers) {
      log.error(`No package managers found for ${domain.name}`);
      return;
    }

    const packageManagers = domain.packageManagers;

    const availableManagers = Object.keys(packageManagers);

    const selectedManager = await select({
      message: 'Which package manager do you want to use?',
      options: availableManagers.map((manager) => ({
        value: manager,
        label: manager.toUpperCase(),
      })),
    });

    if (selectedManager && typeof selectedManager === 'string' && packageManagers[selectedManager]) {
      const config = packageManagers[selectedManager];

      const packages = FileLib.readFileAsArray(config.configPath);

      if (packages.length === 0) {
        log.warn(`No packages found in ${FileLib.getDisplayPath(config.configPath)}`);
        return;
      }

      const { installed, notInstalled } = this.handleStatus(packages, config);

      const action = await select({
        message: 'What do you want to do?',
        options: [
          ...(notInstalled.length > 0 ? [{ value: 'install', label: '📦 Install packages' }] : []),
          ...(installed.length > 0 ? [{ value: 'remove', label: '🗑️ Remove packages' }] : []),
        ],
      });

      if (action === 'install') await this.handleInstall(notInstalled, config);
      else if (action === 'remove') await this.handleRemove(installed, config);
    }
  },

  async handleInstall(notInstalled: string[], config: PackageManagerConfig) {
    if (notInstalled.length === 0) {
      log.success('All packages are already installed');
      return;
    }

    const selectedPackages = await multiselect({
      message: 'Which packages do you want to install?',
      options: notInstalled.map((pkg) => ({ value: pkg, label: pkg })),
      initialValues: notInstalled,
    });

    if (!Array.isArray(selectedPackages) || selectedPackages.length === 0) {
      log.error('No packages selected');
      return;
    }

    log.info('Installing packages...');
    for (const pkg of selectedPackages) {
      try {
        log.info(`Installing ${pkg}...`);
        execSync(`${config.install.replace('%s', pkg)}`, { stdio: 'pipe' });
        log.success(`${pkg} installed`);
      } catch (error) {
        log.error(`${pkg}: ${error}`);
      }
    }
  },

  async handleRemove(installed: string[], config: PackageManagerConfig) {
    if (installed.length === 0) {
      log.warn('No packages installed to remove');
      return;
    }

    const selectedPackages = await multiselect({
      message: 'Which packages do you want to remove?',
      options: installed.map((pkg) => ({ value: pkg, label: pkg })),
    });

    if (!Array.isArray(selectedPackages) || selectedPackages.length === 0) {
      log.error('No packages selected');
      return;
    }

    log.info('Removing packages...');
    for (const pkg of selectedPackages) {
      try {
        log.info(`Removing ${pkg}...`);
        execSync(`${config.remove.replace('%s', pkg)}`, { stdio: 'pipe' });
        log.success(`${pkg} removed`);
      } catch (error) {
        log.error(`${pkg}: ${error}`);
      }
    }
  },

  handleStatus(packages: string[], config: PackageManagerConfig) {
    const installed = packages.filter((pkg) => this.isPackageInstalled(pkg, config));
    const notInstalled = packages.filter((pkg) => !this.isPackageInstalled(pkg, config));

    ConsoleLib.logListWithTitle('✅ Installed', installed);
    ConsoleLib.logListWithTitle('📋 Not installed', notInstalled);

    return { installed, notInstalled };
  },

  isPackageInstalled(packageName: string, config: PackageManagerConfig): boolean {
    try {
      const command = config.status.replace('%s', packageName);

      const output = execSync(command, { stdio: 'pipe' }).toString();
      return output.trim().length > 0;
    } catch {
      return false;
    }
  },
};
