import { resolve } from 'node:path';
import { confirm, log, outro, select, text } from '@clack/prompts';
import { DOTSX } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import type { AllLinks, Link } from '@/types';

export const symlinkCommand = {
  async execute() {
    const allLinks = await this.checkStatus();

    const action = await select({
      message: 'What do you want to do with links?',
      options: [
        { value: 'add', label: '➕ Add new link' },
        { value: 'sync', label: '🔄 Sync all links' },
      ],
    });

    if (action === 'add') await this.addLink();
    else if (action === 'sync') await this.syncLinks(allLinks);
  },

  async addLink() {
    const pathInput = await text({
      message: 'Path to link',
      placeholder: 'eg. ~/.hello.json',
      validate: (v) => (v && FileLib.isPathExists(FileLib.expandPath(v)) ? undefined : "File doesn't exist"),
    });

    if (!pathInput) return;

    const systemPath = FileLib.expandPath(String(pathInput));
    const dotsxPath = this.getDotsxPath(systemPath);

    FileLib.safeSymlink(systemPath, dotsxPath);
  },

  async syncLinks(links: AllLinks) {
    if (links.incorrectSymlinks.length === 0) {
      log.success('All links correct');
      return;
    }

    const proceed = await confirm({ message: '\nSync all broken links?' });
    if (!proceed) return;

    let fixed = 0;
    for (const { systemPath, dotsxPath } of links.incorrectSymlinks) {
      try {
        FileLib.safeSymlink(systemPath, dotsxPath);
        log.success(FileLib.getDisplayPath(dotsxPath));
        fixed++;
      } catch (err) {
        log.error(`${FileLib.getDisplayPath(dotsxPath)}: ${err}`);
      }
    }

    outro(`Fixed ${fixed}/${links.incorrectSymlinks.length} links`);
  },

  async checkStatus() {
    const links = this.getSymlinks();

    if (links.length === 0) {
      return { correctSymlinks: [], incorrectSymlinks: [] };
    }

    const correctSymlinks = [];
    const incorrectSymlinks = [];

    for (const { systemPath, dotsxPath } of links) {
      const displayPath = FileLib.getDisplayPath(dotsxPath);
      const isCorrect = FileLib.isSymLinkContentCorrect(dotsxPath, systemPath);
      if (isCorrect) {
        correctSymlinks.push({ systemPath, dotsxPath });
        log.success(displayPath);
      } else {
        incorrectSymlinks.push({ systemPath, dotsxPath });
        log.error(displayPath);
      }
    }

    outro(`${correctSymlinks.length}/${links.length} links correct`);

    return { correctSymlinks, incorrectSymlinks };
  },

  getSymlinks(): Array<Link> {
    if (!FileLib.isDirectory(DOTSX.SYMLINKS)) return [];

    const scan = (dir: string, rel = ''): Array<Link> => {
      const results: Array<Link> = [];

      for (const item of FileLib.readDirectory(dir)) {
        const fullPath = resolve(dir, item);
        const relPath = rel ? `${rel}/${item}` : item;

        if (FileLib.isDirectory(fullPath)) {
          results.push(...scan(fullPath, relPath));
        } else {
          results.push({
            systemPath: FileLib.expandPath(relPath),
            dotsxPath: fullPath,
          });
        }
      }

      return results;
    };

    return scan(DOTSX.SYMLINKS);
  },

  getDotsxPath(systemPath: string): string {
    const displayPath = FileLib.getDisplayPath(systemPath);
    if (displayPath.startsWith('__home__')) {
      return resolve(DOTSX.SYMLINKS, displayPath);
    }
    return resolve(DOTSX.SYMLINKS, systemPath.startsWith('/') ? systemPath.slice(1) : systemPath);
  },
};
