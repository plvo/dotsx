import path from 'node:path';
import { log, multiselect, select } from '@clack/prompts';
import { BACKUP_PATH, DOTSX_PATH } from '@/lib/constants';
import { FileLib } from '@/lib/file';

interface BackupFile {
  dotsxRelativePath: string; // e.g., "symlinks/~/.zshrc"
  timestamp: string;
  backupPath: string;
}

export const recoverCommand = {
  async execute() {
    if (!FileLib.isDirectory(BACKUP_PATH)) {
      log.warn('No backups found. Backup directory does not exist.');
      return;
    }

    const backups = this.scanBackups();

    if (backups.length === 0) {
      log.warn('No backups found');
      return;
    }

    // Group backups by original path
    const grouped = this.groupBackupsByPath(backups);
    const filePaths = Object.keys(grouped);

    const options = filePaths.map((filePath) => ({
      value: filePath,
      label: filePath, // Show dotsx relative path like "symlinks/~/.zshrc"
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

    for (const filePath of selected) {
      await this.recoverFile(filePath, grouped[filePath] ?? []);
    }
  },

  scanBackups(): BackupFile[] {
    const results: BackupFile[] = [];

    const scan = (dir: string, baseDir: string) => {
      const items = FileLib.readDirectory(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);

        if (FileLib.isDirectory(fullPath)) {
          scan(fullPath, baseDir);
        } else if (item.endsWith('.dotsx.backup')) {
          // Parse filename: symlinks/~/.zshrc.20250930120000.dotsx.backup
          const relativePath = path.relative(baseDir, fullPath);
          const match = relativePath.match(/^(.+)\.(\d{14})\.dotsx\.backup$/);

          if (match) {
            const dotsxRelativePath = match[1]; // e.g., "symlinks/~/.zshrc"
            const timestamp = match[2];

            if (!dotsxRelativePath || !timestamp) {
              log.error(`Invalid backup file format ${fullPath}`);
              continue;
            }

            results.push({
              dotsxRelativePath,
              timestamp,
              backupPath: fullPath,
            });
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

    // Sort backups by timestamp (newest first)
    for (const filePath in grouped) {
      grouped[filePath]?.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }

    return grouped;
  },

  async recoverFile(dotsxRelativePath: string, backups: BackupFile[]) {
    const options = backups.map((backup) => {
      const year = backup.timestamp.slice(0, 4);
      const month = backup.timestamp.slice(4, 6);
      const day = backup.timestamp.slice(6, 8);
      const hour = backup.timestamp.slice(8, 10);
      const minute = backup.timestamp.slice(10, 12);
      const second = backup.timestamp.slice(12, 14);

      const dateStr = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

      return {
        value: backup.backupPath,
        label: dateStr,
        hint: FileLib.getDisplayPath(backup.backupPath),
      };
    });

    const selectedBackup = await select({
      message: 'Choose backup to restore:',
      options,
    });

    if (!selectedBackup || typeof selectedBackup !== 'string') {
      log.warn('Recovery cancelled');
      return;
    }

    try {
      // Restore to dotsx structure
      // Example: symlinks/~/.zshrc -> ~/.dotsx/symlinks/~/.zshrc
      const dotsxPath = path.join(DOTSX_PATH, dotsxRelativePath);

      // Create parent directory
      FileLib.createDirectory(path.dirname(dotsxPath));

      // Copy backup to dotsx
      if (FileLib.isFile(selectedBackup)) {
        FileLib.copyFile(selectedBackup, dotsxPath);
      } else if (FileLib.isDirectory(selectedBackup)) {
        FileLib.copyDirectory(selectedBackup, dotsxPath);
      }

      log.success(`Recovered to dotsx: ${dotsxRelativePath}`);
    } catch (error) {
      log.error(`Failed to recover: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
};
