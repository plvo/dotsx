import path from 'node:path';
import { log, multiselect, select } from '@clack/prompts';
import { ConsoleLib } from '@/lib/console';
import { BACKUP_PATH, type DotsxOsPath } from '@/lib/constants';
import { FileLib } from '@/lib/file';

interface BackupFile {
  dotsxRelativePath: string;
  timestamp: string;
  backupPath: string;
}

export const recoverCommand = {
  async execute(dotsxPath: DotsxOsPath) {
    if (!FileLib.isDirectory(BACKUP_PATH)) {
      log.warn('No backups found. Backup directory does not exist.');
      return;
    }

    const backups = this.scanBackups();

    if (backups.length === 0) {
      log.warn('No backups found');
      return;
    }

    const grouped = this.groupBackupsByPath(backups);
    const filePaths = Object.keys(grouped);

    const options = filePaths.map((filePath) => ({
      value: filePath,
      label: filePath,
      hint: `${grouped[filePath]?.length} backup(s) available`,
    }));

    const selected = await multiselect({
      message: 'Which file do you want to recover?',
      options,
      initialValues: options.map((option) => option.value),
    });

    if (!Array.isArray(selected) || selected.length === 0) {
      log.warn('Recovery cancelled');
      return;
    }

    const strategy = await select({
      message: 'How would you like to recover these files?',
      options: [
        {
          value: 'latest',
          label: '⏱️  Restore all to latest backup',
          hint: 'Automatically use the most recent version',
        },
        {
          value: 'choose',
          label: '🎯 Choose specific versions',
          hint: 'Select exact backup date for each file',
        },
      ],
    });

    if (!strategy) {
      log.warn('Recovery cancelled');
      return;
    }

    for (const filePath of selected) {
      const backups = grouped[filePath] ?? [];

      if (strategy === 'latest') {
        const latestBackup = backups[0];
        if (latestBackup) {
          await this.restoreBackup(dotsxPath, filePath, latestBackup);
        }
      } else {
        await this.recoverFile(dotsxPath, filePath, backups);
      }
    }
  },

  scanBackups(): BackupFile[] {
    const results: BackupFile[] = [];

    const scan = (dir: string, baseDir: string) => {
      const items = FileLib.Directory.read(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);

        if (FileLib.isDirectory(fullPath)) {
          scan(fullPath, baseDir);
        } else if (item.endsWith('.dotsx.backup')) {
          const relativePath = path.relative(baseDir, fullPath);
          const match = relativePath.match(/^(.+)\.(\d{14})\.dotsx\.backup$/);

          if (match) {
            const dotsxRelativePath = match[1];
            const timestamp = match[2];

            if (!dotsxRelativePath || !timestamp) {
              log.error(`Invalid backup file format ${fullPath}`);
              continue;
            }

            results.push({ dotsxRelativePath, timestamp, backupPath: fullPath });
          }
        }
      }
    };

    scan(BACKUP_PATH, BACKUP_PATH);
    return results;
  },

  groupBackupsByPath(backups: BackupFile[]): Record<string, BackupFile[]> {
    const grouped: Record<string, BackupFile[]> = {};

    for (const backup of backups) {
      if (!grouped[backup.dotsxRelativePath]) {
        grouped[backup.dotsxRelativePath] = [];
      }
      grouped[backup.dotsxRelativePath]?.push(backup);
    }

    for (const filePath in grouped) {
      grouped[filePath]?.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }

    return grouped;
  },

  async restoreBackup(dotsxOsPath: DotsxOsPath, dotsxRelativePath: string, backup: BackupFile) {
    try {
      const dotsxFilePath = path.join(dotsxOsPath.baseOs, dotsxRelativePath);

      FileLib.Directory.create(path.dirname(dotsxFilePath));

      if (FileLib.isFile(backup.backupPath)) {
        FileLib.File.copy(backup.backupPath, dotsxFilePath);
      } else if (FileLib.isDirectory(backup.backupPath)) {
        FileLib.Directory.copy(backup.backupPath, dotsxFilePath);
      }

      const dateStr = ConsoleLib.getDisplayDate(backup.timestamp);

      log.success(`Recovered ${dotsxRelativePath} from ${dateStr}`);
    } catch (error) {
      log.error(`Failed to recover: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  async recoverFile(dotsxOsPath: DotsxOsPath, dotsxRelativePath: string, backups: BackupFile[]) {
    const options = backups.map((backup) => {
      const dateStr = ConsoleLib.getDisplayDate(backup.timestamp);

      return { value: backup.backupPath, label: dateStr, hint: backup.backupPath };
    });

    const selectedBackup = await select({
      message: `Choose backup to restore for ${dotsxRelativePath}:`,
      options,
    });

    if (!selectedBackup || typeof selectedBackup !== 'string') {
      log.warn('Recovery cancelled');
      return;
    }

    const backup = backups.find((b) => b.backupPath === selectedBackup);
    if (backup) {
      await this.restoreBackup(dotsxOsPath, dotsxRelativePath, backup);
    }
  },
};
