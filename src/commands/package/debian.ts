import { execSync } from 'node:child_process';
import path from 'node:path';
import { confirm, multiselect, select } from '@clack/prompts';
import { DOTFILE_PATH_DIRS } from '@/lib/constants';
import { FileLib } from '@/lib/file';

export const DebianApt = {
  async command() {
    const packages = FileLib.readFileAsArray(path.resolve(DOTFILE_PATH_DIRS.CORE, 'debian', 'apt.txt'));

    if (packages.length === 0) {
      console.log('ℹ️ No packages found in apt.txt');
      return;
    }

    const action = await select({
      message: 'What do you want to do?',
      options: [
        { value: 'install', label: 'Install' },
        { value: 'status', label: 'Status' },
        { value: 'remove', label: 'Remove' },
      ],
    });

    if (action === 'install') await this.handleInstall(packages);
    else if (action === 'status') this.handleStatus(packages);
    else if (action === 'remove') await this.handleRemove(packages);
  },

  async handleInstall(packages: string[]) {
    const { notInstalledPackages } = this.filterPackages(packages);

    if (notInstalledPackages.length === 0) {
      console.log('✅ All APT packages are already installed');
      return;
    }

    const proceed = await confirm({
      message: `\nInstall ${notInstalledPackages.length} APT packages?`,
    });

    if (!proceed) {
      console.log('❌ APT installation cancelled');
      return;
    }

    console.log('\n🔄 Installing APT packages...');
    for (const pkg of notInstalledPackages) {
      try {
        console.log(`📦 Installing ${pkg}...`);
        execSync(`sudo apt install -y ${pkg}`, { stdio: 'pipe' });
        console.log(`✅ ${pkg}`);
      } catch (error) {
        console.log(`❌ ${pkg}: ${error}`);
      }
    }
  },

  async handleRemove(packages: string[]) {
    const { installedPackages } = this.filterPackages(packages);

    const selectedPackages = await multiselect({
      message: 'Which packages do you want to remove?',
      options: installedPackages.map((pkg) => ({
        value: pkg,
        label: pkg,
      })),
    });

    if (Array.isArray(selectedPackages)) {
      const proceed = await confirm({
        message: `\nRemove ${selectedPackages.length} APT packages?`,
      });

      if (!proceed) {
        console.log('❌ APT removal cancelled');
        return;
      }

      console.log('\n🔄 Removing APT packages...');
      for (const pkg of selectedPackages) {
        try {
          console.log(`📦 Removing ${pkg}...`);
          execSync(`sudo apt remove -y ${pkg}`, { stdio: 'pipe' });
          console.log(`✅ ${pkg}`);
        } catch (error) {
          console.log(`❌ ${pkg}: ${error}`);
        }
      }
    }
  },

  handleStatus(packages: string[]): { installedPackages: string[]; notInstalledPackages: string[] } {
    const { installedPackages, notInstalledPackages } = this.filterPackages(packages);

    console.log(`✅ Already installed (${installedPackages.length}):`);
    installedPackages.forEach((pkg) => {
      console.log(`   ${pkg}`);
    });

    console.log(`📋 Need to install (${notInstalledPackages.length}):`);
    notInstalledPackages.forEach((pkg) => {
      console.log(`   ${pkg}`);
    });

    return { installedPackages, notInstalledPackages };
  },

  filterPackages(packages: string[]): { installedPackages: string[]; notInstalledPackages: string[] } {
    console.log('🔍 Checking package status...');

    const installedPackages = packages.filter(this.isPackageInstalled);
    const notInstalledPackages = packages.filter((pkg) => !this.isPackageInstalled(pkg));
    return { installedPackages, notInstalledPackages };
  },

  isPackageInstalled(packageName: string): boolean {
    try {
      const output = execSync(`dpkg -l | grep "^ii" | grep -w " ${packageName} "`, {
        stdio: 'pipe',
      }).toString();
      return output.trim().length > 0;
    } catch {
      return false;
    }
  },
};

export const DebianSnap = {
  async command() {
    const packages = FileLib.readFileAsArray(path.resolve(DOTFILE_PATH_DIRS.CORE, 'debian', 'snap.txt'));

    if (packages.length === 0) {
      console.log('ℹ️ No packages found in snap.txt');
      return;
    }

    const action = await select({
      message: 'What do you want to do?',
      options: [
        { value: 'install', label: 'Install' },
        { value: 'status', label: 'Status' },
        { value: 'remove', label: 'Remove' },
      ],
    });

    if (action === 'install') await this.handleInstall(packages);
    else if (action === 'status') this.handleStatus(packages);
    else if (action === 'remove') await this.handleRemove(packages);
  },

  async handleInstall(packages: string[]) {
    const { notInstalledPackages } = this.filterPackages(packages);

    if (notInstalledPackages.length === 0) {
      console.log('✅ All Snap packages are already installed');
      return;
    }

    const proceed = await confirm({
      message: `\nInstall ${notInstalledPackages.length} Snap packages?`,
    });

    if (!proceed) {
      console.log('❌ Snap installation cancelled');
      return;
    }

    console.log('\n🔄 Installing Snap packages...');
    for (const pkg of notInstalledPackages) {
      try {
        console.log(`📦 Installing ${pkg}...`);
        execSync(`sudo snap install ${pkg}`, { stdio: 'pipe' });
        console.log(`✅ ${pkg}`);
      } catch (error) {
        console.log(`❌ ${pkg}: ${error}`);
      }
    }
  },

  async handleRemove(packages: string[]) {
    const { installedPackages } = this.filterPackages(packages);

    const selectedPackages = await select({
      message: 'Which packages do you want to remove?',
      options: installedPackages.map((pkg) => ({
        value: pkg,
        label: pkg,
      })),
    });

    if (Array.isArray(selectedPackages)) {
      const proceed = await confirm({
        message: `\nRemove ${selectedPackages.length} Snap packages?`,
      });

      if (!proceed) {
        console.log('❌ Snap removal cancelled');
        return;
      }

      console.log('\n🔄 Removing Snap packages...');
      for (const pkg of selectedPackages) {
        try {
          console.log(`📦 Removing ${pkg}...`);
          execSync(`sudo snap remove ${pkg}`, { stdio: 'pipe' });
          console.log(`✅ ${pkg}`);
        } catch (error) {
          console.log(`❌ ${pkg}: ${error}`);
        }
      }
    }
  },

  handleStatus(packages: string[]): { installedPackages: string[]; notInstalledPackages: string[] } {
    const { installedPackages, notInstalledPackages } = this.filterPackages(packages);

    console.log(`✅ Already installed (${installedPackages.length}):`);
    installedPackages.forEach((pkg) => {
      console.log(`   ${pkg}`);
    });

    console.log(`📋 Need to install (${notInstalledPackages.length}):`);
    notInstalledPackages.forEach((pkg) => {
      console.log(`   ${pkg}`);
    });

    return { installedPackages, notInstalledPackages };
  },

  filterPackages(packages: string[]): { installedPackages: string[]; notInstalledPackages: string[] } {
    console.log('🔍 Checking package status...');

    const installedPackages = packages.filter(this.isPackageInstalled);
    const notInstalledPackages = packages.filter((pkg) => !this.isPackageInstalled(pkg));
    return { installedPackages, notInstalledPackages };
  },

  isPackageInstalled(packageName: string): boolean {
    try {
      const output = execSync(`snap list | grep "^${packageName}"`, {
        stdio: 'pipe',
      }).toString();
      return output.trim().length > 0;
    } catch {
      return false;
    }
  },
};
