import { groupMultiselect, isCancel, log, type Option, outro, spinner } from '@clack/prompts';
import type { DotsxOsPath } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { type OsInfo, SystemLib } from '@/lib/system';
import { getSuggestionsByOs, type Suggestion } from '@/suggestions';
import { binCommand } from './bin';

interface FoundPath {
  suggestedPath: string;
  type: 'file' | 'directory';
}

type GroupMultiselectOptions = Record<string, Option<FoundPath>[]>;

export const initCommand = {
  async execute(dotsxPath: DotsxOsPath) {
    try {
      const osInfo = SystemLib.getOsInfo();

      log.info(`🖥️  Initializing on a ${osInfo.family} ${osInfo.distro} ${osInfo.release} system...`);

      const availableSuggestions = getSuggestionsByOs(osInfo.family);
      const existingPaths = this.getExistingSuggestedPaths(availableSuggestions, osInfo);
      const options = this.buildAppBasedOptions(existingPaths, availableSuggestions);

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

  getExistingSuggestedPaths(availableSuggestions: Suggestion[], osInfo: OsInfo) {
    const s = spinner();
    s.start('Checking suggested paths...');

    const existingPaths: Record<string, FoundPath[]> = {};

    try {
      availableSuggestions.forEach((suggestion) => {
        const paths = suggestion.pathsToCheck[osInfo.family];
        if (!paths) return;

        const foundPaths: FoundPath[] = [];

        paths.forEach((suggestedPath) => {
          if (FileLib.isFile(suggestedPath)) {
            foundPaths.push({ suggestedPath, type: 'file' });
          } else if (FileLib.isDirectory(suggestedPath)) {
            foundPaths.push({ suggestedPath, type: 'directory' });
          }
        });

        if (foundPaths.length > 0) {
          existingPaths[suggestion.name] = foundPaths;
        }
      });

      s.stop(`Found ${Object.values(existingPaths).flat().length} existing paths`);
      return existingPaths;
    } catch (error) {
      s.stop(`Error checking suggested paths: ${error}`);
      throw error;
    }
  },

  buildAppBasedOptions(
    existingPaths: Record<string, FoundPath[]>,
    availableSuggestions: Suggestion[],
  ): GroupMultiselectOptions {
    const options: GroupMultiselectOptions = {};

    availableSuggestions.forEach((suggestion) => {
      const foundPaths = existingPaths[suggestion.name];

      if (!foundPaths || foundPaths.length === 0) return;

      options[suggestion.name] = [];

      foundPaths.forEach((path) => {
        const fileName = path.suggestedPath;
        const appOptions = options[suggestion.name];
        if (appOptions) {
          appOptions.push({
            value: { suggestedPath: path.suggestedPath, type: path.type },
            label: fileName,
          });
        }
      });
    });

    return options;
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
