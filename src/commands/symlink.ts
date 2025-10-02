import { resolve } from 'node:path';
import { confirm, groupMultiselect, isCancel, log, outro, select, text } from '@clack/prompts';
import type { DotsxOsPath } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import { SuggestionLib } from '@/lib/suggestion';
import { SymlinkLib } from '@/lib/symlink';
import { SystemLib } from '@/lib/system';
import type { AllLinks, Link } from '@/types';

export const symlinkCommand = {
  async execute(dotsxOsPath: DotsxOsPath) {
    const allLinks = await this.checkStatus(dotsxOsPath);

    const action = await select({
      message: 'What do you want to do with links?',
      options: [
        { value: 'add', label: '➕ Add new link' },
        { value: 'suggestions', label: '📍 Manage suggestions', hint: 'Add suggested paths (IDE, terminal, etc.)' },
        { value: 'sync', label: '🔄 Sync all links' },
      ],
    });

    if (action === 'add') await this.addLink(dotsxOsPath);
    else if (action === 'suggestions') await this.manageSuggestions(dotsxOsPath);
    else if (action === 'sync') await this.syncLinks(allLinks, dotsxOsPath);
  },

  async addLink(dotsxOsPath: DotsxOsPath) {
    const pathInput = await text({
      message: 'Path to link',
      placeholder: 'eg. ~/.hello.json',
      validate: (v) => (v && FileLib.isExists(FileLib.expand(String(v))) ? undefined : "File doesn't exist"),
    });

    if (!pathInput) return;

    const systemPath = FileLib.expand(String(pathInput));
    const dotsxPath = FileLib.toDotsxPath(systemPath, dotsxOsPath.symlinks);

    SymlinkLib.safeSymlink(dotsxOsPath, systemPath, dotsxPath);
  },

  async manageSuggestions(dotsxOsPath: DotsxOsPath) {
    const osInfo = SystemLib.getOsInfo();
    const existingPaths = SuggestionLib.getAllExistingPaths(osInfo);

    if (Object.keys(existingPaths).length === 0) {
      log.warn('No suggestions found for your system');
      return;
    }

    // Filter out paths that are already symlinked
    const existingSymlinks = this.getSymlinks(dotsxOsPath).map((link) => link.systemPath);
    const filteredPaths = SuggestionLib.filterAlreadySymlinked(existingPaths, existingSymlinks);

    const totalPaths = Object.values(existingPaths).flat().length;
    const alreadyConfigured = totalPaths - Object.values(filteredPaths).flat().length;

    if (Object.keys(filteredPaths).length === 0) {
      log.success(`All ${totalPaths} suggested paths are already configured`);
      return;
    }

    // Build options using helper
    const options = SuggestionLib.buildGroupedOptions<string>(filteredPaths);

    // Wait for terminal to be ready
    await new Promise((resolve) => setTimeout(resolve, 1));

    const selectedPaths = await groupMultiselect({
      message: `Select paths to add as symlinks (${alreadyConfigured} already configured):`,
      options,
      required: false,
    });

    if (isCancel(selectedPaths) || selectedPaths.length === 0) {
      return outro('👋 No paths selected');
    }

    // Create symlinks for selected paths
    for (const pathStr of selectedPaths) {
      const systemPath = FileLib.expand(String(pathStr));
      const dotsxPath = FileLib.toDotsxPath(systemPath, dotsxOsPath.symlinks);

      try {
        SymlinkLib.safeSymlink(dotsxOsPath, systemPath, dotsxPath);
        log.success(FileLib.display(dotsxPath));
      } catch (err) {
        log.error(`${FileLib.display(dotsxPath)}: ${err}`);
      }
    }

    outro(`✅ Added ${selectedPaths.length} symlink(s)`);
  },

  async syncLinks(links: AllLinks, dotsxOsPath: DotsxOsPath) {
    if (links.incorrectSymlinks.length === 0) {
      log.success('All links correct');
      return;
    }

    const proceed = await confirm({ message: '\nSync all broken links?' });
    if (!proceed) return;

    let fixed = 0;
    for (const { systemPath, dotsxPath } of links.incorrectSymlinks) {
      try {
        SymlinkLib.safeSymlink(dotsxOsPath, systemPath, dotsxPath);
        log.success(FileLib.display(dotsxPath));
        fixed++;
      } catch (err) {
        log.error(`${FileLib.display(dotsxPath)}: ${err}`);
      }
    }

    outro(`Fixed ${fixed}/${links.incorrectSymlinks.length} links`);
  },

  async checkStatus(dotsxOsPath: DotsxOsPath) {
    const links = this.getSymlinks(dotsxOsPath);

    if (links.length === 0) {
      return { correctSymlinks: [], incorrectSymlinks: [] };
    }

    const correctSymlinks = [];
    const incorrectSymlinks = [];

    for (const { systemPath, dotsxPath } of links) {
      const displayPath = FileLib.display(dotsxPath);
      const isCorrect = SymlinkLib.isSymLinkContentCorrect(dotsxPath, systemPath);
      if (isCorrect) {
        correctSymlinks.push({ systemPath, dotsxPath });
        log.message(`✅ ${displayPath}`);
      } else {
        incorrectSymlinks.push({ systemPath, dotsxPath });
        log.message(`❌ ${displayPath}`);
      }
    }

    log.info(`${correctSymlinks.length}/${links.length} links correct`);

    return { correctSymlinks, incorrectSymlinks };
  },

  /**
   * Check if a directory in dotsx should be treated as a directory symlink
   * Heuristic: Empty dir or dir with only files (no subdirectories) = likely dir symlink
   */
  isDirSymlinkCandidate(dotsxDirPath: string): boolean {
    const items = FileLib.Directory.read(dotsxDirPath);

    // Empty directory = likely meant to be dir symlink (e.g., Cursor snippets)
    if (items.length === 0) return true;

    // If has subdirectories, it's a container (e.g., User/Config/)
    const hasSubdirs = items.some((item) => FileLib.isDirectory(resolve(dotsxDirPath, item)));

    // Only files = directory symlink (e.g., snippets/ with only .json files)
    return !hasSubdirs;
  },

  /**
   * Scan directory recursively to find ONLY symlinked files and directories
   * @returns Array of absolute file paths
   */
  getSymlinks(dotsxOsPath: DotsxOsPath): Array<Link> {
    if (!FileLib.isDirectory(dotsxOsPath.symlinks)) return [];

    const scan = (dir: string, rel = ''): Array<Link> => {
      const results: Array<Link> = [];

      for (const item of FileLib.Directory.read(dir)) {
        const fullPath = resolve(dir, item);
        const relPath = rel ? `${rel}/${item}` : item;

        if (FileLib.isDirectory(fullPath)) {
          const systemPath = FileLib.expand(relPath);
          const isSystemDirSymlink = FileLib.isSymLink(systemPath);

          // Check if this should be a directory symlink
          const shouldBeDirSymlink = isSystemDirSymlink || this.isDirSymlinkCandidate(fullPath);

          if (shouldBeDirSymlink) {
            // Directory symlink - add it, don't recurse
            results.push({ systemPath, dotsxPath: fullPath });
          } else {
            // Container directory - recurse into it
            results.push(...scan(fullPath, relPath));
          }
        } else {
          // File symlink
          results.push({
            systemPath: FileLib.expand(relPath),
            dotsxPath: fullPath,
          });
        }
      }

      return results;
    };

    return scan(dotsxOsPath.symlinks);
  },
};
