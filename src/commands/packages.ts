import { execSync } from 'node:child_process';
import path from 'node:path';
import { isCancel, log, multiselect, select, spinner } from '@clack/prompts';
import { ConsoleLib } from '@/lib/console';
import { FileLib } from '@/lib/file';
import { getPackageManagerConfig, type PackageManager } from '@/packages';
import type { KnownLinuxDistro, OsFamily } from '@/types';

export const packageCommand = {
  async execute(os: KnownLinuxDistro | OsFamily, packagesManagerPath: string) {
    const packageManagerConfig = getPackageManagerConfig(os);
    console.log(packageManagerConfig);

    const selectedManager = await select({
      message: 'Which package manager do you want to use?',
      options: packageManagerConfig.map((manager, i) => ({
        value: i,
        label: manager.name,
      })),
    });

    if (isCancel(selectedManager)) {
      log.warn('Package manager selection cancelled');
      return;
    }

    const packageManager = packageManagerConfig[selectedManager];
    if (!packageManager) {
      log.error('Package manager not found');
      return;
    }

    const fullPath = path.resolve(packagesManagerPath, packageManager.fileList);

    const packages = FileLib.File.readAsArray(fullPath);

    const { installed, notInstalled } = this.handleStatuses(packages, packageManager);

    const action = await select({
      message: 'What do you want to do?',
      options: [
        ...(notInstalled.length > 0 ? [{ value: 'install', label: '📦 Install packages' }] : []),
        ...(installed.length > 0 ? [{ value: 'remove', label: '🗑️ Remove packages' }] : []),
      ],
    });

    if (action === 'install') await this.handleInstall(notInstalled, packageManager);
    else if (action === 'remove') await this.handleRemove(installed, packageManager);
  },

  async handleInstall(notInstalled: string[], packageManager: PackageManager) {
    if (notInstalled.length === 0) {
      log.success('All packages are already installed');
      return;
    }

    const selectedPackages = await multiselect({
      message: 'Which packages do you want to install?',
      options: notInstalled.map((pkg) => ({ value: pkg, label: pkg })),
      initialValues: notInstalled,
    });

    if (isCancel(selectedPackages)) {
      log.warn('Package installation cancelled');
      return;
    }

    log.info('Installing packages...');
    for (const pkg of selectedPackages) {
      const s = spinner({ indicator: 'timer' });
      s.start(`Installing ${pkg}...`);
      try {
        execSync(`${packageManager.install.replace('%s', pkg)}`, { stdio: 'pipe' });
        s.stop(`${pkg} installed`);
      } catch (error) {
        s.stop(`${pkg}: ${error}`);
      }
    }
  },

  async handleRemove(installed: string[], packageManager: PackageManager) {
    if (installed.length === 0) {
      log.warn('No packages installed to remove');
      return;
    }

    const selectedPackages = await multiselect({
      message: 'Which packages do you want to remove?',
      options: installed.map((pkg) => ({ value: pkg, label: pkg })),
    });

    if (isCancel(selectedPackages)) {
      log.warn('Package removal cancelled');
      return;
    }

    log.info('Removing packages...');
    for (const pkg of selectedPackages) {
      const s = spinner({ indicator: 'timer' });
      s.start(`Removing ${pkg}...`);
      try {
        execSync(`${packageManager.remove.replace('%s', pkg)}`, { stdio: 'pipe' });
        s.stop(`${pkg} removed`);
      } catch (error) {
        s.stop(`${pkg}: ${error}`);
      }
    }
  },

  handleStatuses(packages: string[], packageManager: PackageManager) {
    const installed = packages.filter((pkg) => this.isPackageInstalled(pkg, packageManager));
    const notInstalled = packages.filter((pkg) => !this.isPackageInstalled(pkg, packageManager));

    ConsoleLib.logListWithTitle('✅ Installed', installed);
    ConsoleLib.logListWithTitle('📋 Not installed', notInstalled);

    return { installed, notInstalled };
  },

  isPackageInstalled(packageName: string, packageManager: PackageManager): boolean {
    try {
      const command = packageManager.status.replace('%s', packageName);

      const output = execSync(command, { stdio: 'pipe' }).toString();
      return output.trim().length > 0;
    } catch {
      return false;
    }
  },
};
