import { log, spinner } from '@clack/prompts';
import type { DotsxOsPath } from './constants';
import { GitLib } from './git';
import { SystemLib } from './system';

export const ConsoleLib = {
  logListWithTitle(title: string, list: string[]) {
    log.step(`${title} (${list.length}):\n${list.join('\n')}`);
  },

  async printSystemInfo() {
    const s = spinner({ indicator: 'dots' });
    s.start('System info check...');

    const info = SystemLib.getSystemInfo();

    s.stop(`${info.hostname} system info:
\t🖥️  ${info.distro} ${info.release} (${info.platform} ${info.arch})
\t📄 ${info.rcFile} (${info.shell})`);
  },

  async printGitInfo(dotsxPath: DotsxOsPath) {
    const s = spinner({ indicator: 'dots' });
    s.start('Git info check...');

    try {
      const gitInfo = await GitLib.getRepositoryInfo(dotsxPath.baseOs);

      if (!gitInfo.isRepository) {
        s.stop('📦 Git: Not initialized');
        return;
      }

      let gitStatus = `📁 ${gitInfo.remoteUrl} (🌿 ${gitInfo.currentBranch})
\t📝 Last commit: "${gitInfo.lastCommit?.message ?? 'Unknown'}" ${gitInfo.lastCommit?.hash ?? 'Unknown hash'} (${gitInfo.lastCommit?.date ?? 'Unknown date'})`;

      if (gitInfo.status) {
        const { ahead, behind, hasUncommittedChanges } = gitInfo.status;

        if (ahead === 0 && behind === 0 && !hasUncommittedChanges) {
          gitStatus += '✅ up-to-date';
        } else {
          const statusParts = [];
          if (ahead > 0) statusParts.push(`📤 ${ahead} ahead`);
          if (behind > 0) statusParts.push(`📥 ${behind} behind`);
          if (hasUncommittedChanges) statusParts.push('⚠️  uncommitted changes');
          gitStatus += `\n\t${statusParts.join(', ')}`;
        }
      }

      s.stop(gitStatus);
    } catch (_error) {
      s.stop('📦 Git: Error reading repository info');
    }
  },

  getDisplayDate(timestamp: string): string {
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    const hour = timestamp.slice(8, 10);
    const minute = timestamp.slice(10, 12);
    const second = timestamp.slice(12, 14);
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  },
};
