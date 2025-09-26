import { execSync } from 'node:child_process';
import { confirm, log, multiselect, select } from '@clack/prompts';
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
      await this.handlePackageManager(packageManagers[selectedManager]);
    }
  },

  async handlePackageManager(config: PackageManagerConfig) {
    const packages = FileLib.readFileAsArray(config.configPath);

    const { installed, notInstalled } = this.handleStatus(packages, config);

    if (packages.length === 0) {
      console.log(`ℹ️ No packages found in ${FileLib.getDisplayPath(config.configPath)}`);
      return;
    }

    const action = await select({
      message: 'What do you want to do?',
      options: [
        { value: 'install', label: '📦 Install packages' },
        { value: 'remove', label: '🗑️ Remove packages' },
      ],
    });

    if (action === 'install') await this.handleInstall(notInstalled, config);
    else if (action === 'remove') await this.handleRemove(installed, config);
  },

  async handleInstall(notInstalled: string[], config: PackageManagerConfig) {
    if (notInstalled.length === 0) {
      console.log('✅ All packages are already installed');
      return;
    }

    const proceed = await confirm({
      message: `Install ${notInstalled.length} packages?`,
    });

    if (!proceed) {
      console.log('❌ Installation cancelled');
      return;
    }

    console.log('\n🔄 Installing packages...');
    for (const pkg of notInstalled) {
      try {
        console.log(`📦 Installing ${pkg}...`);
        execSync(`${config.install.replace('%s', pkg)}`, { stdio: 'pipe' });
        console.log(`✅ ${pkg}`);
      } catch (error) {
        console.log(`❌ ${pkg}: ${error}`);
      }
    }
  },

  async handleRemove(installed: string[], config: PackageManagerConfig) {
    if (installed.length === 0) {
      console.log('ℹ️ No packages installed to remove');
      return;
    }

    const selectedPackages = await multiselect({
      message: 'Which packages do you want to remove?',
      options: installed.map((pkg) => ({
        value: pkg,
        label: pkg,
      })),
    });

    if (!Array.isArray(selectedPackages) || selectedPackages.length === 0) {
      console.log('❌ No packages selected');
      return;
    }

    const proceed = await confirm({
      message: `Remove ${selectedPackages.length} packages?`,
    });

    if (!proceed) {
      console.log('❌ Removal cancelled');
      return;
    }

    console.log('\n🔄 Removing packages...');
    for (const pkg of selectedPackages) {
      try {
        console.log(`📦 Removing ${pkg}...`);
        execSync(`${config.remove.replace('%s', pkg)}`, { stdio: 'pipe' });
        console.log(`✅ ${pkg}`);
      } catch (error) {
        console.log(`❌ ${pkg}: ${error}`);
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
