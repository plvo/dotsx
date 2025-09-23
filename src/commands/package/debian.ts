import { execSync } from 'node:child_process';
import path from 'node:path';
import { confirm, select } from '@clack/prompts';
import { DOTFILE_PATH_DIRS } from '@/lib/constants';
import { FileLib } from '@/lib/file';

export async function handleAptPackages() {
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

  if (action === 'install') await handleAptPackagesInstall(packages);
  else if (action === 'status') await handleAptPackagesStatus(packages);
  else if (action === 'remove') await handleAptPackagesRemove(packages);
}

export async function handleAptPackagesInstall(packages: string[]) {
  console.log('🔍 Checking package status...');

  const { notInstalledPackages } = await handleAptPackagesStatus(packages);

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
}

export async function handleAptPackagesRemove(packages: string[]) {
  console.log('🔍 Checking package status...');
  const { installedPackages } = await handleAptPackagesStatus(packages);
  console.log(`✅ Already installed (${installedPackages.length}):`);
  installedPackages.forEach((pkg) => {
    console.log(`   ${pkg}`);
  });

  const selectedPackages = await select({
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
}

export async function handleAptPackagesStatus(
  packages: string[],
): Promise<{ installedPackages: string[]; notInstalledPackages: string[] }> {
  console.log('🔍 Checking package status...');
  const installedPackages = packages.filter(isAptPackageInstalled);
  const notInstalledPackages = packages.filter((pkg) => !isAptPackageInstalled(pkg));

  console.log(`✅ Already installed (${installedPackages.length}):`);
  installedPackages.forEach((pkg) => {
    console.log(`   ${pkg}`);
  });

  console.log(`📋 Need to install (${notInstalledPackages.length}):`);
  notInstalledPackages.forEach((pkg) => {
    console.log(`   ${pkg}`);
  });

  return { installedPackages, notInstalledPackages };
}

function isAptPackageInstalled(packageName: string): boolean {
  try {
    const output = execSync(`dpkg -l | grep "^ii.*${packageName}"`, {
      stdio: 'pipe',
    }).toString();
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

function isSnapPackageInstalled(packageName: string): boolean {
  try {
    execSync(`snap list ${packageName}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export async function handleSnapPackages() {
  console.log('\n📱 Snap Packages');
  console.log('─'.repeat(30));

  const packages = FileLib.readFileAsArray(path.resolve(DOTFILE_PATH_DIRS.CORE, 'debian', 'snap.txt'));
  if (packages.length === 0) {
    console.log('ℹ️ No packages found in snap.txt');
    return;
  }

  console.log('🔍 Checking package status...');
  const packageInfo = packages.map((pkg) => ({
    name: pkg,
    installed: isSnapPackageInstalled(pkg),
  }));

  const toInstall = packageInfo.filter((pkg) => !pkg.installed);
  const installed = packageInfo.filter((pkg) => pkg.installed);

  if (installed.length > 0) {
    console.log(`\n✅ Already installed (${installed.length}):`);
    installed.forEach((pkg) => {
      console.log(`   ${pkg.name}`);
    });
  }

  if (toInstall.length === 0) {
    console.log('✅ All Snap packages are already installed');
    return;
  }

  console.log(`\n📋 Need to install (${toInstall.length}):`);
  toInstall.forEach((pkg) => {
    console.log(`   ${pkg.name}`);
  });

  const proceed = await confirm({
    message: `\nInstall ${toInstall.length} Snap packages?`,
  });

  if (!proceed) {
    console.log('❌ Snap installation cancelled');
    return;
  }

  console.log('\n🔄 Installing Snap packages...');
  for (const pkg of toInstall) {
    try {
      console.log(`📱 Installing ${pkg.name}...`);
      execSync(`sudo snap install ${pkg.name}`, { stdio: 'pipe' });
      console.log(`✅ ${pkg.name}`);
    } catch (error) {
      console.log(`❌ ${pkg.name}: ${error}`);
    }
  }
}

export async function handleSnapPackagesRemove(packages: string[]) {
  console.log('🔍 Checking Snap package status...');
  const installedPackages = packages.filter(isSnapPackageInstalled);

  if (installedPackages.length === 0) {
    console.log('ℹ️ No Snap packages from the list are currently installed.');
    return;
  }

  console.log(`✅ Already installed (${installedPackages.length}):`);
  installedPackages.forEach((pkg) => {
    console.log(`   ${pkg}`);
  });

  const selectedPackages = await select({
    message: 'Which Snap packages do you want to remove?',
    options: installedPackages.map((pkg) => ({
      value: pkg,
      label: pkg,
    })),
  });

  if (Array.isArray(selectedPackages) && selectedPackages.length > 0) {
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
        console.log(`📱 Removing ${pkg}...`);
        execSync(`sudo snap remove ${pkg}`, { stdio: 'pipe' });
        console.log(`✅ ${pkg}`);
      } catch (error) {
        console.log(`❌ ${pkg}: ${error}`);
      }
    }
  }
}

export async function handleSnapPackagesStatus(
  packages: string[],
): Promise<{ installedPackages: string[]; notInstalledPackages: string[] }> {
  console.log('🔍 Checking Snap package status...');
  const installedPackages = packages.filter(isSnapPackageInstalled);
  const notInstalledPackages = packages.filter((pkg) => !isSnapPackageInstalled(pkg));

  if (installedPackages.length > 0) {
    console.log(`✅ Already installed (${installedPackages.length}):`);
    installedPackages.forEach((pkg) => {
      console.log(`   ${pkg}`);
    });
  }

  if (notInstalledPackages.length > 0) {
    console.log(`📋 Need to install (${notInstalledPackages.length}):`);
    notInstalledPackages.forEach((pkg) => {
      console.log(`   ${pkg}`);
    });
  }

  return { installedPackages, notInstalledPackages };
}

export async function handleSnapPackagesInstall(packages: string[]) {
  console.log('🔍 Checking Snap package status...');

  const { notInstalledPackages } = await handleSnapPackagesStatus(packages);

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
      console.log(`📱 Installing ${pkg}...`);
      execSync(`sudo snap install ${pkg}`, { stdio: 'pipe' });
      console.log(`✅ ${pkg}`);
    } catch (error) {
      console.log(`❌ ${pkg}: ${error}`);
    }
  }
}
