import { groupMultiselect, isCancel, log, outro, spinner } from '@clack/prompts';
import type { DotsxOsPath } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { type FoundPath, SuggestionLib } from '@/lib/suggestion';
import { SystemLib } from '@/lib/system';
import { binCommand } from './bin';

export const initCommand = {
  async execute(dotsxPath: DotsxOsPath) {
    try {
      const osInfo = SystemLib.getOsInfo();

      log.info(`🖥️  Initializing on a ${osInfo.family} ${osInfo.distro} ${osInfo.release} system...`);

      const availableSuggestions = SuggestionLib.getAvailableSuggestions(osInfo);
      const existingPaths = SuggestionLib.getExistingSuggestedPaths(availableSuggestions, osInfo);

      const options = SuggestionLib.buildGroupedOptions<FoundPath>(existingPaths, (path) => ({
        suggestedPath: path.suggestedPath,
        type: path.type,
      }));

      // Wait for the terminal to be ready, this is a workaround to avoid the prompt being canceled
      await new Promise((resolve) => setTimeout(resolve, 1));

      const selectedPaths = await groupMultiselect({
        message: 'Which configuration files do you want to manage with dotsx?',
        options,
        required: false,
      });

      if (isCancel(selectedPaths)) {
        log.warn('Initialization cancelled');
        return outro('👋 See you next time!');
      }

      await this.handleDotsxDirectoryCreation(dotsxPath);
      binCommand.writeAliasToRcFile(dotsxPath.binAliases);
      await this.createSelectedPaths(selectedPaths);
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

  async createSelectedPaths(selectedPaths: FoundPath[]) {
    const s = spinner({ indicator: 'timer' });
    s.start(`Creating selected paths...`);
    try {
      selectedPaths.forEach((path) => {
        if (path.type === 'file') {
          FileLib.File.create(path.suggestedPath);
        } else if (path.type === 'directory') {
          FileLib.Directory.create(path.suggestedPath);
        }
        s.message(`${path.suggestedPath} created successfully`);
      });
      s.stop(`Selected paths created successfully`);
    } catch (error) {
      s.stop(`Error creating selected paths: ${error}`);
      throw error;
    }
  },
};
