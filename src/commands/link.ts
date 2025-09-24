import { dirname, resolve } from 'node:path';
import { confirm, select, text } from '@clack/prompts';
import { DOTSX } from '@/lib/constants';
import { FileLib } from '@/lib/file';
import type { AllLinks } from '@/types';

export const linkCommand = {
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
      message: 'Path to link:',
      placeholder: 'relative or absolute path',
      validate: (v) => (v && FileLib.isPathExists(FileLib.expandPath(v)) ? undefined : "File doesn't exist"),
    });

    if (!pathInput) return;

    const targetPath = FileLib.expandPath(String(pathInput));
    const linkPath = this.getLinkPath(targetPath);

    FileLib.createDirectory(dirname(linkPath));

    if (FileLib.isDirectory(targetPath)) {
      FileLib.copyDirectory(targetPath, linkPath);
    } else {
      FileLib.copyFile(targetPath, linkPath);
    }

    FileLib.safeSymlink(linkPath, targetPath);
  },

  async syncLinks(links: AllLinks) {
    if (links.incorrectSymlinks.length === 0) {
      console.log('✅ All links correct');
      return;
    }

    const proceed = await confirm({ message: '\nSync all broken links?' });
    if (!proceed) return;

    let fixed = 0;
    for (const { linkPath, targetPath } of links.incorrectSymlinks) {
      try {
        FileLib.createDirectory(dirname(targetPath));
        FileLib.safeSymlink(linkPath, targetPath);
        console.log(`✅ ${FileLib.getDisplayPath(targetPath)}`);
        fixed++;
      } catch (err) {
        console.log(`❌ ${FileLib.getDisplayPath(targetPath)}: ${err}`);
      }
    }

    console.log(`\n🎉 Fixed ${fixed}/${links.incorrectSymlinks.length} links`);
  },

  async checkStatus() {
    const links = this.getSymlinks();

    if (links.length === 0) {
      return { correctSymlinks: [], incorrectSymlinks: [] };
    }

    const correctSymlinks = [];
    const incorrectSymlinks = [];

    for (const { linkPath, targetPath } of links) {
      const displayPath = FileLib.getDisplayPath(targetPath);
      const isCorrect = FileLib.isSymLinkContentCorrect(linkPath, targetPath);
      if (isCorrect) {
        correctSymlinks.push({ linkPath, targetPath });
        console.log(`✅ ${displayPath}`);
      } else {
        incorrectSymlinks.push({ linkPath, targetPath });
        console.log(`❌ ${displayPath}`);
      }
    }

    console.log(`\n${correctSymlinks.length}/${links.length} links correct`);

    return { correctSymlinks, incorrectSymlinks };
  },

  getSymlinks(): Array<{ linkPath: string; targetPath: string }> {
    if (!FileLib.isDirectory(DOTSX.SYMLINKS)) return [];

    const scan = (dir: string, rel = ''): Array<{ linkPath: string; targetPath: string }> => {
      const results: Array<{ linkPath: string; targetPath: string }> = [];

      for (const item of FileLib.readDirectory(dir)) {
        const fullPath = resolve(dir, item);
        const relPath = rel ? `${rel}/${item}` : item;

        if (FileLib.isDirectory(fullPath)) {
          results.push(...scan(fullPath, relPath));
        } else {
          results.push({
            linkPath: fullPath,
            targetPath: this.getTargetPath(relPath),
          });
        }
      }

      return results;
    };

    return scan(DOTSX.SYMLINKS);
  },

  getLinkPath(systemPath: string): string {
    const displayPath = FileLib.getDisplayPath(systemPath);
    if (displayPath.startsWith('~')) {
      return resolve(DOTSX.SYMLINKS, displayPath);
    }
    return resolve(DOTSX.SYMLINKS, systemPath.startsWith('/') ? systemPath.slice(1) : systemPath);
  },

  getTargetPath(relativePath: string): string {
    if (relativePath.startsWith('~/')) {
      return FileLib.expandPath(relativePath);
    }
    return `/${relativePath}`;
  },
};
