import { execSync } from 'node:child_process';
import { confirm, multiselect, select } from '@clack/prompts';
import { DOTX_DIR, OS_CONFIG } from '@/lib/constants';
import { FileLib } from '@/lib/file';

export const packageCommand = {
  async execute() {
    const availableDistros = FileLib.readDirectory(DOTX_DIR.OS);

    if (availableDistros.length === 0) {
      console.log('ℹ️ No OS configurations found');
      return;
    }

    console.log(`Available distros: ${availableDistros.join(', ')}`);

    const selectedDistro = await select({
      message: 'Which distro do you want to use?',
      options: availableDistros.map((distro) => ({
        value: distro,
        label: distro.charAt(0).toUpperCase() + distro.slice(1),
      })),
    });

    if (selectedDistro && OS_CONFIG[selectedDistro as keyof typeof OS_CONFIG]) {
      await this.handleDistro(selectedDistro as keyof typeof OS_CONFIG);
    }
  },

  async handleDistro(distro: keyof typeof OS_CONFIG) {
    const distroConfig = OS_CONFIG[distro];

    if (!distroConfig) {
      console.log('❌ No distro config found');
      return;
    }

    const availableManagers = Object.keys(distroConfig);

    const selectedManager = await select({
      message: 'Which package manager do you want to use?',
      options: availableManagers.map((manager) => ({
        value: manager,
        label: manager.toUpperCase(),
      })),
    });

    if (selectedManager && distroConfig[selectedManager as keyof typeof distroConfig]) {
      await this.handlePackageManager(
        distroConfig[selectedManager as keyof typeof distroConfig] as PackageManagerConfig,
      );
    }
  },

  async handlePackageManager(config: PackageManagerConfig) {
    const packages = FileLib.readFileAsArray(config.packages);

    const { installed, notInstalled } = this.handleStatus(packages, config);

    if (packages.length === 0) {
      console.log(`ℹ️ No packages found in ${FileLib.getDisplayPath(config.packages)}`);
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
        execSync(`${config.install} ${pkg}`, { stdio: 'pipe' });
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
        execSync(`${config.remove} ${pkg}`, { stdio: 'pipe' });
        console.log(`✅ ${pkg}`);
      } catch (error) {
        console.log(`❌ ${pkg}: ${error}`);
      }
    }
  },

  handleStatus(packages: string[], config: PackageManagerConfig) {
    const installed = packages.filter((pkg) => this.isPackageInstalled(pkg, config));
    const notInstalled = packages.filter((pkg) => !this.isPackageInstalled(pkg, config));

    console.log(`\n✅ Installed (${installed.length}):`);
    installed.forEach((pkg) => console.log(`   ${pkg}`));

    console.log(`\n📋 Not installed (${notInstalled.length}):`);
    notInstalled.forEach((pkg) => console.log(`   ${pkg}`));

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
