import { log } from '@clack/prompts';
import type { ConfigStatusInfo, Domain, Family, OsInfo } from '@/types';
import { DOTSX_PATH } from './constants';
import { FileLib } from './file';
import { GitLib } from './git';
import { DotsxInfoLib, SystemLib } from './system';

export const ConsoleLib = {
  getDisplayDate(timestamp: string): string {
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    const hour = timestamp.slice(8, 10);
    const minute = timestamp.slice(10, 12);
    const second = timestamp.slice(12, 14);
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  },

  logListWithTitle(title: string, list: string[]) {
    console.log(`\n${title} (${list.length}):`);
    list.forEach((item) => {
      console.log(` ${item}`);
    });
  },

  async displayInfo() {
    const info = SystemLib.getSystemInfo();
    log.info(`${info.hostname} system info:
 🖥️  ${info.distro} ${info.release} (${info.platform} ${info.arch})
 📄 ${info.rcFile} (${info.shell})`);

    const dotsxState = DotsxInfoLib.getDotsxState();

    if (dotsxState.isInitialized) {
      log.info(
        `${dotsxState.isBinInitialized ? '✅' : '❌'} Bin ${dotsxState.isIdeInitialized ? '✅' : '❌'} IDE ${dotsxState.isOsInitialized ? '✅' : '❌'} OS ${dotsxState.isTerminalInitialized ? '✅' : '❌'} Terminal`,
      );

      await this.displayGitInfo();
    } else {
      log.error('DotsX (Not configured)');
    }
  },

  async displayGitInfo() {
    try {
      const gitInfo = await GitLib.getRepositoryInfo(DOTSX_PATH);

      if (!gitInfo.isRepository) {
        log.info('📦 Git: Not initialized');
        return;
      }

      let gitStatus = `📁 ${gitInfo.remoteUrl} (🌿 ${gitInfo.currentBranch})
📝 Last commit: "${gitInfo.lastCommit?.message ?? 'Unknown'}" ${gitInfo.lastCommit?.hash ?? 'Unknown hash'} (${gitInfo.lastCommit?.date ?? 'Unknown date'})
`;

      if (gitInfo.status) {
        const { ahead, behind, hasUncommittedChanges } = gitInfo.status;

        if (ahead === 0 && behind === 0 && !hasUncommittedChanges) {
          gitStatus += '✅ up-to-date';
        } else {
          const statusParts = [];
          if (ahead > 0) statusParts.push(`📤 ${ahead} ahead`);
          if (behind > 0) statusParts.push(`📥 ${behind} behind`);
          if (hasUncommittedChanges) statusParts.push('⚠️  uncommitted changes');
          gitStatus += `🔄 ${statusParts.join(', ')}`;
        }
      }

      log.info(gitStatus);
    } catch (_error) {
      log.info('📦 Git: Error reading repository info');
    }
  },

  getHint(status: ConfigStatusInfo, osInfo: OsInfo): string {
    let hint = '';

    switch (status.status) {
      case 'fully_imported':
        hint = `Fully imported (${status.importedFiles}/${status.totalFiles} files)`;
        break;
      case 'partially_imported':
        hint = `Partially imported (${status.importedFiles}/${status.totalFiles} files)`;
        break;
      case 'not_imported':
        hint = `Not imported (0/${status.totalFiles} files)`;
        break;
      case 'incompatible':
        hint = `Not compatible with ${osInfo.family}`;
        break;
    }

    return hint;
  },

  showConfigStatus(domain: Domain, status: ConfigStatusInfo, statusText: string) {
    const importedPaths = status.importedPaths.length > 0 ? status.importedPaths.map((path) => `   📁 ${path}\n`) : [];
    const missingPaths = status.missingPaths.length > 0 ? status.missingPaths.map((path) => `   ❌ ${path}\n`) : [];
    log.step(`${domain.name} - ${statusText}\n${importedPaths.join('')}${missingPaths.join('')}`);
  },

  getConfigStatus(domain: Domain, currentOs: Family, dotsxDirPath: string): ConfigStatusInfo {
    if (!domain.symlinkPaths?.[currentOs]) {
      return {
        status: 'incompatible',
        importedPaths: [],
        missingPaths: [],
        totalFiles: 0,
        importedFiles: 0,
      };
    }

    const importedPaths: string[] = [];
    const missingPaths: string[] = [];

    for (const symlinkPath of domain.symlinkPaths[currentOs]) {
      const dotsxPath = DotsxInfoLib.getDotsxPath(domain, symlinkPath, dotsxDirPath);

      if (FileLib.isPathExists(dotsxPath)) {
        importedPaths.push(FileLib.getDisplayPath(dotsxPath));
      } else {
        missingPaths.push(FileLib.getDisplayPath(dotsxPath));
      }
    }

    const totalFiles = domain.symlinkPaths[currentOs].length;
    const importedFiles = importedPaths.length;

    let status: ConfigStatusInfo['status'];
    if (importedFiles === 0) {
      status = 'not_imported';
    } else if (importedFiles === totalFiles) {
      status = 'fully_imported';
    } else {
      status = 'partially_imported';
    }

    return {
      status,
      importedPaths,
      missingPaths,
      totalFiles,
      importedFiles,
    };
  },
};
