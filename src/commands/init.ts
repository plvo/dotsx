import path from 'node:path';
import { confirm, groupMultiselect, isCancel, log, spinner } from '@clack/prompts';
import type { DotsxOsPath } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { type FoundPath, SuggestionLib } from '@/lib/suggestion';
import { SymlinkLib } from '@/lib/symlink';
import { SystemLib } from '@/lib/system';
import { getPackageManagerConfig } from '@/packages';
import { binCommand } from './bin';
import { gitCommand } from './git';

export const initCommand = {
  async execute(dotsxPath: DotsxOsPath) {
    try {
      const osInfo = SystemLib.getOsInfo();

      log.info(`🖥️  Initializing on a ${osInfo.family} ${osInfo.distro} ${osInfo.release} system...`);

      const availableSuggestions = SuggestionLib.getSuggestionsByOs(osInfo.family);
      const existingPaths = SuggestionLib.getExistingSuggestedPaths(availableSuggestions, osInfo);

      const options = SuggestionLib.buildGroupedOptions<FoundPath>(existingPaths, (path) => ({
        suggestedPath: path.suggestedPath,
        type: path.type,
      }));

      // Wait for the terminal to be ready, this is a workaround to avoid the prompt being canceled
      await new Promise((resolve) => setTimeout(resolve, 1));

      let selectedPaths: FoundPath[] = [];

      if (Object.keys(options).length > 0) {
        const pathResult = await groupMultiselect({
          message: 'These paths exist on your system, do you want to symlink them with dotsx?',
          options,
          required: false,
        });

        if (!isCancel(pathResult)) {
          selectedPaths = pathResult;
        }
      }

      await this.handleDotsxDirectoryCreation(dotsxPath);
      await this.createPackageManagerFiles(dotsxPath);
      binCommand.writeAliasToRcFile(dotsxPath.binAliases);
      await this.createSymlinksForSelectedPaths(selectedPaths, dotsxPath);

      const confirmGit = await confirm({
        message: 'Would you like to initialize a Git repository? It is highly recommended to save your configuration.',
        initialValue: true,
      });

      if (isCancel(confirmGit)) {
        log.warn('Git repository initialization cancelled');
      }

      if (confirmGit) {
        await new Promise((resolve) => setTimeout(resolve, 1));
        await gitCommand.createWithRemoteAtomic();
      }
    } catch (error) {
      log.error(`Error initializing: ${error}`);
    }
  },

  async handleDotsxDirectoryCreation(dotsxPath: DotsxOsPath) {
    const s = spinner();
    s.start(`Creating ${dotsxPath.baseOs} directories and files...`);
    try {
      FileLib.Directory.create(dotsxPath.baseOs);
      FileLib.File.create(dotsxPath.config);
      FileLib.Directory.create(dotsxPath.bin);
      FileLib.File.create(dotsxPath.binAliases);
      FileLib.Directory.create(dotsxPath.packagesManager);
      FileLib.File.create(dotsxPath.packagesManagerConfig);
      FileLib.Directory.create(dotsxPath.symlinks);

      s.stop(`${dotsxPath.baseOs} directories and files created successfully`);
    } catch (error) {
      s.stop(`Error creating ${dotsxPath.baseOs} directories and files: ${error}`);
      throw error;
    }
  },

  async createSymlinksForSelectedPaths(selectedPaths: FoundPath[], dotsxPath: DotsxOsPath) {
    if (selectedPaths.length === 0) return;

    const s = spinner();
    s.start('Creating symlinks...');

    let successCount = 0;
    for (const path of selectedPaths) {
      const systemPath = FileLib.expand(path.suggestedPath);
      const dotsxSymlinkPath = FileLib.toDotsxPath(systemPath, dotsxPath.symlinks);

      try {
        SymlinkLib.safeSymlink(systemPath, dotsxSymlinkPath);
        s.message(`✓ ${path.suggestedPath}`);
        successCount++;
      } catch (error) {
        log.error(`Failed to symlink ${path.suggestedPath}: ${error}`);
      }
    }

    s.stop(`Created ${successCount}/${selectedPaths.length} symlink(s)`);
  },

  async createPackageManagerFiles(dotsxPath: DotsxOsPath) {
    const osInfo = SystemLib.getOsInfo();
    const packageManagers = getPackageManagerConfig(osInfo.distro || osInfo.family);

    if (packageManagers.length === 0) {
      log.warn('No package managers configured for this OS');
      return;
    }

    const s = spinner();
    s.start('Creating package manager files...');

    // Create package manager metadata JSON
    const packageMetadata: Record<string, string[]> = {};

    for (const pm of packageManagers) {
      const filePath = path.resolve(dotsxPath.packagesManager, pm.fileList);

      // Create .txt file with helpful header comment
      const header = [
        `# ${pm.name} Package List`,
        `#`,
        `# How to use:`,
        `# - Write one package name per line`,
        `# - Lines starting with # are ignored (comments)`,
        `# - Example:`,
        `#   git`,
        `#   curl`,
        `#   # tmux  <- This line is commented, package ignored`,
        `#`,
        `# Commands:`,
        `# - Install: ${pm.install.replace('%s', '<package>')}`,
        `# - Remove:  ${pm.remove.replace('%s', '<package>')}`,
        `# - Status:  ${pm.status.replace('%s', '<package>')}`,
        `#`,
        '',
      ].join('\n');

      FileLib.File.create(filePath, header);
      packageMetadata[pm.name] = [];
      s.message(`✓ ${pm.fileList}`);
    }

    FileLib.File.write(dotsxPath.packagesManagerConfig, JSON.stringify(packageManagers, null, 2));

    s.stop(`Created ${packageManagers.length} package manager file(s)`);
  },
};
